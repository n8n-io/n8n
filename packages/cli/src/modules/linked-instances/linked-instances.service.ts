import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ConflictError, NotFoundError } from '@n8n/errors';

import { parseLinkInput, type LinkInstanceInput } from './link-input';
import { LinkedInstanceStore, type LinkedInstanceCredentials } from './linked-instance.store';
import type { LinkedInstanceSummary } from './linked-instances.types';
import {
	RemoteInstanceClientFactory,
	type RemoteProbeFailureReason,
} from './remote/remote-instance.client';

export const DUPLICATE_LINK_MESSAGE = 'You already linked this instance.';
export const LINK_NOT_FOUND_MESSAGE = 'We could not find this linked instance.';

export const PROBE_FAILURE_MESSAGES: Record<RemoteProbeFailureReason, string> = {
	unreachable: 'We could not reach an n8n instance at this address. Check the address.',
	'mcp-disabled': 'Turn on MCP access in that instance: Settings → Instance-level MCP.',
	unauthorised: 'That instance refused the access token. Create a new token and try again.',
};

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
	 * Stores the link only when the instance answers with the token.
	 * @throws {BadRequestError} when the input is not valid or the probe fails
	 * @throws {ConflictError} when the user already linked this address
	 */
	async link(user: User, input: LinkInstanceInput): Promise<LinkedInstanceSummary> {
		const { name, origin, token } = parseLinkInput(input);
		if (await this.store.existsForUser(user.id, origin)) {
			throw new ConflictError(DUPLICATE_LINK_MESSAGE);
		}

		await this.verify(origin, token);

		const linked = await this.store.create({
			userId: user.id,
			name,
			origin,
			token,
			status: 'online',
			verifiedAt: new Date(),
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

	private async verify(origin: string, token: string): Promise<void> {
		const client = this.clientFactory.create({ origin, token });
		try {
			const probe = await client.probe();
			if (!probe.ok) throw new BadRequestError(PROBE_FAILURE_MESSAGES[probe.reason]);
		} finally {
			await client.close();
		}
	}
}
