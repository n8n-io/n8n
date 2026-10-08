import type {
	LinkedInstanceRemoteProject,
	LinkedInstanceStatus,
	LinkedInstanceSummary,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ConflictError, NotFoundError } from '@n8n/errors';

import {
	LINK_INPUT_MESSAGES,
	parseLinkInput,
	parseLinkUpdate,
	type LinkInstanceInput,
	type LinkUpdateInput,
} from './link-input';
import {
	LinkedInstanceStore,
	type LinkedInstanceChanges,
	type LinkedInstanceCredentials,
} from './linked-instance.store';
import {
	RemoteInstanceClientFactory,
	type RemoteInstanceClient,
	type RemoteProbeFailureReason,
} from './remote/remote-instance.client';
import { RemoteInstanceError } from './remote/remote-instance.errors';
import {
	pickDefaultRemoteProject,
	reconcileDefaultRemoteProject,
	type RemoteProjectList,
} from './remote-project-picker';
import { listRemoteProjects, SEARCH_PROJECTS_TOOL } from './remote-projects';

export const DUPLICATE_LINK_MESSAGE = 'You already linked this instance.';
export const LINK_NOT_FOUND_MESSAGE = 'We could not find this linked instance.';

export const PROBE_FAILURE_MESSAGES: Record<RemoteProbeFailureReason, string> = {
	unreachable: 'We could not reach an n8n instance at this address. Check the address.',
	'mcp-disabled': 'Turn on MCP access in that instance: Settings → Instance-level MCP.',
	unauthorised: 'That instance refused the access token. Create a new token and try again.',
};

export const REMOTE_PROJECTS_MESSAGES = {
	unavailable: 'That instance does not let this access token list its projects.',
	failed: 'We could not get the projects from that instance. Try again.',
} as const;

// A failed check keeps the link. Its status tells the user what to fix.
const PROBE_FAILURE_STATUSES: Record<RemoteProbeFailureReason, LinkedInstanceStatus> = {
	unreachable: 'offline',
	'mcp-disabled': 'mcp-disabled',
	unauthorised: 'unauthorised',
};

/** @throws {BadRequestError} with the en-GB message for the failure */
async function probeOrThrow(client: RemoteInstanceClient): Promise<string[]> {
	const probe = await client.probe();
	if (!probe.ok) throw new BadRequestError(PROBE_FAILURE_MESSAGES[probe.reason]);
	return probe.toolNames;
}

/** Links other n8n instances for one user. Each user sees and changes only their own links. */
@Service()
export class LinkedInstancesService {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly store: LinkedInstanceStore,
		private readonly clientFactory: RemoteInstanceClientFactory,
	) {
		this.logger = logger.scoped('mcp');
	}

	async list(user: User): Promise<LinkedInstanceSummary[]> {
		return await this.store.listForUser(user.id);
	}

	/**
	 * Stores the link only when the instance answers with the token. Also picks the project
	 * on that instance that gets new automations, when the instance lists its projects.
	 * @throws {BadRequestError} when the input is not valid or the probe fails
	 * @throws {ConflictError} when the user already linked this address
	 */
	async link(user: User, input: LinkInstanceInput): Promise<LinkedInstanceSummary> {
		const { name, origin, token } = parseLinkInput(input);
		if (await this.store.existsForUser(user.id, origin)) {
			throw new ConflictError(DUPLICATE_LINK_MESSAGE);
		}

		const defaultRemoteProject = await this.withClient({ origin, token }, async (client) => {
			const projects = await this.tryListProjects(client, await probeOrThrow(client), origin);
			return projects ? pickDefaultRemoteProject(projects) : null;
		});

		const linked = await this.store.create({
			userId: user.id,
			name,
			origin,
			token,
			status: 'online',
			verifiedAt: new Date(),
			defaultRemoteProject,
		});
		// Another request from the same user can link the same address between the check and the insert.
		if (!linked) throw new ConflictError(DUPLICATE_LINK_MESSAGE);

		this.logger.info('Linked an instance', {
			userId: user.id,
			linkedInstanceId: linked.id,
			origin,
		});
		return linked;
	}

	/**
	 * Checks the instance again with the stored token and records the result.
	 * A failed check is a status, not an error.
	 * @throws {NotFoundError} when the user has no link with this id
	 */
	async verify(user: User, id: string): Promise<LinkedInstanceSummary> {
		const credentials = await this.getTokenForUse(user, id);
		const probe = await this.withClient(credentials, async (client) => await client.probe());
		const status = probe.ok ? 'online' : PROBE_FAILURE_STATUSES[probe.reason];

		const summary = await this.store.updateStatus(user.id, id, status, new Date());
		if (!summary) throw new NotFoundError(LINK_NOT_FOUND_MESSAGE);

		this.logger.info('Checked a linked instance', {
			userId: user.id,
			linkedInstanceId: id,
			status,
		});
		return summary;
	}

	/**
	 * Renames the link, replaces its token or sets its default project. A new token must pass
	 * the probe first, else the old token stays. A new default project must be one that the
	 * instance lists for the token.
	 * @throws {BadRequestError} when the input is not valid, the probe fails or the project is not listed
	 * @throws {NotFoundError} when the user has no link with this id
	 */
	async update(user: User, id: string, input: LinkUpdateInput): Promise<LinkedInstanceSummary> {
		const update = parseLinkUpdate(input);
		const current = await this.store.getForUser(user.id, id);
		if (!current) throw new NotFoundError(LINK_NOT_FOUND_MESSAGE);

		const remoteChanges = await this.readRemoteChanges(user, current, update);
		const summary = await this.store.updateForUser(user.id, id, {
			...(update.name === undefined ? {} : { name: update.name }),
			...remoteChanges,
		});
		if (!summary) throw new NotFoundError(LINK_NOT_FOUND_MESSAGE);

		this.logger.info('Changed a linked instance', {
			userId: user.id,
			linkedInstanceId: id,
			fields: Object.keys(update),
		});
		return summary;
	}

	/** @throws {NotFoundError} when the user has no link with this id */
	async unlink(user: User, id: string): Promise<void> {
		const deleted = await this.store.deleteForUser(user.id, id);
		if (!deleted) throw new NotFoundError(LINK_NOT_FOUND_MESSAGE);
		this.logger.info('Unlinked an instance', { userId: user.id, linkedInstanceId: id });
	}

	/**
	 * Returns the decrypted token for one request. Do not keep or log it.
	 * @throws {NotFoundError} when the user has no link with this id
	 */
	async getTokenForUse(user: User, id: string): Promise<LinkedInstanceCredentials> {
		const credentials = await this.store.readCredentials(user.id, id);
		if (!credentials) throw new NotFoundError(LINK_NOT_FOUND_MESSAGE);
		return credentials;
	}

	/** Only a new token or a new default project needs the instance. */
	private async readRemoteChanges(
		user: User,
		current: LinkedInstanceSummary,
		update: LinkUpdateInput,
	): Promise<LinkedInstanceChanges> {
		if (update.token === undefined && update.defaultRemoteProjectId === undefined) return {};

		const stored = await this.store.readCredentials(user.id, current.id);
		if (!stored) throw new NotFoundError(LINK_NOT_FOUND_MESSAGE);
		const token = update.token ?? stored.token;
		return await this.withClient({ origin: stored.origin, token }, async (client) => {
			const toolNames = await probeOrThrow(client);
			if (update.defaultRemoteProjectId !== undefined) {
				const project = await this.findListedProject(
					client,
					toolNames,
					update.defaultRemoteProjectId,
				);
				return { ...this.tokenChanges(update.token), defaultRemoteProject: project };
			}
			// The new token can belong to another user, who sees other projects.
			const projects = await this.tryListProjects(client, toolNames, stored.origin);
			const defaultRemoteProject = projects
				? reconcileDefaultRemoteProject(current.defaultRemoteProject, projects)
				: undefined;
			return { ...this.tokenChanges(update.token), defaultRemoteProject };
		});
	}

	private tokenChanges(token: string | undefined): LinkedInstanceChanges {
		if (token === undefined) return {};
		return { token, status: 'online', verifiedAt: new Date() };
	}

	/**
	 * A link works without a default project, so a failure here only leaves the project unknown.
	 * @returns `undefined` when the instance does not list its projects for this token
	 */
	private async tryListProjects(
		client: RemoteInstanceClient,
		toolNames: string[],
		origin: string,
	): Promise<RemoteProjectList | undefined> {
		if (!toolNames.includes(SEARCH_PROJECTS_TOOL)) return undefined;
		try {
			return await listRemoteProjects(client);
		} catch (error) {
			if (!(error instanceof RemoteInstanceError)) throw error;
			this.logger.warn('Could not list the projects of a linked instance', {
				origin,
				reason: error.reason,
			});
			return undefined;
		}
	}

	/** @throws {BadRequestError} when the instance does not list a project with this id */
	private async findListedProject(
		client: RemoteInstanceClient,
		toolNames: string[],
		projectId: string,
	): Promise<LinkedInstanceRemoteProject> {
		if (!toolNames.includes(SEARCH_PROJECTS_TOOL)) {
			throw new BadRequestError(REMOTE_PROJECTS_MESSAGES.unavailable);
		}
		const { projects } = await listRemoteProjects(client).catch((error: unknown) => {
			if (error instanceof RemoteInstanceError) {
				throw new BadRequestError(REMOTE_PROJECTS_MESSAGES.failed);
			}
			throw error;
		});
		const project = projects.find(({ id }) => id === projectId);
		if (!project) throw new BadRequestError(LINK_INPUT_MESSAGES.defaultRemoteProjectId);
		return project;
	}

	/** Opens one client for the work and always closes it. */
	private async withClient<T>(
		credentials: LinkedInstanceCredentials,
		work: (client: RemoteInstanceClient) => Promise<T>,
	): Promise<T> {
		const client = this.clientFactory.create(credentials);
		try {
			return await work(client);
		} finally {
			await client.close();
		}
	}
}
