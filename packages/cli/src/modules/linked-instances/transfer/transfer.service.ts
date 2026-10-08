import type {
	LinkedInstancePullResult,
	LinkedInstancePushResult,
	LinkedInstanceRemoteProject,
	LinkedInstanceSummary,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import type { User, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import type { ImportedWorkflowPackage } from '@/modules/n8n-packages/capabilities/import-summary';
import { reasonForClient } from '@/modules/n8n-packages/capabilities/package-tool-error';

import type { StoredLinkedInstance } from '../linked-instance.store';
import { LinkedInstanceSessions, type RemoteSession } from './linked-instance-sessions';
import type { TurnOffOptions } from './local-workflow-deactivator';
import {
	exportFromRemote,
	importOnRemote,
	publishOnRemote,
	type RemoteImportArgs,
	type RemoteImportResult,
} from './remote-transfer-tools';
import {
	isProjectRefusal,
	toTransferHttpError,
	transferContext,
	transferFailureReason,
	TRANSFER_WARNINGS,
	type TransferDirection,
} from './transfer-errors';
import { TransferLocalWorkflows } from './transfer-local-workflows';

export type PushInput = {
	workflowId: string;
	/** Puts the copy live in the linked instance. */
	publish?: boolean;
	/** Turns off the workflow here after the move. */
	deactivateLocal?: boolean;
};

export type PullInput = {
	remoteWorkflowId: string;
	/** Defaults to the personal project of the user. */
	projectId?: string;
};

/** What happened in the linked instance during a push. */
type RemoteOutcome = {
	imported: RemoteImportResult;
	targetProject: LinkedInstanceRemoteProject | null;
	published: boolean;
	warnings: string[];
};

type StepOutcome = { warnings: string[] };

/** A failed move, for the audit event and the log. Ids only. */
type TransferFailure = {
	link: LinkedInstanceSummary;
	direction: TransferDirection;
	error: unknown;
	ids: { workflowId?: string; remoteWorkflowId?: string; projectId?: string };
};

/** Opens the copy in the editor of the linked instance. */
export function remoteWorkflowUrl(baseUrl: string, workflowId: string): string {
	return `${baseUrl}/workflow/${encodeURIComponent(workflowId)}`;
}

/**
 * Moves workflows between this instance and the user's linked instances. Each request checks
 * access in this instance as the acting user. The linked instance checks the rights of the
 * access token's user.
 */
@Service()
export class TransferService {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly eventService: EventService,
		private readonly sessions: LinkedInstanceSessions,
		private readonly local: TransferLocalWorkflows,
	) {
		this.logger = logger.scoped('mcp');
	}

	/**
	 * Exports the workflow here and imports it into the default project of the link. A repeated
	 * move updates the same copy. Then puts the copy live and turns off the workflow here, when
	 * asked. A failure after the import is a warning in the result.
	 * @throws {NotFoundError} when the user has no such link or cannot read the workflow
	 * @throws {ForbiddenError} when `deactivateLocal` is set and the user cannot turn off the workflow
	 * @throws {BadRequestError} when the linked instance cannot be used or refuses the workflow
	 */
	async push(
		user: User,
		linkId: string,
		input: PushInput,
		options: TurnOffOptions = {},
	): Promise<LinkedInstancePushResult> {
		const link = await this.sessions.findLink(user, linkId);
		const { id: linkedInstanceId } = link.summary;
		try {
			const result = await this.runPush(user, link, input, options);
			this.eventService.emit('linked-instance-workflow-pushed', {
				user,
				linkedInstanceId,
				workflowId: input.workflowId,
				remoteWorkflowId: result.remoteWorkflowId,
				remoteProjectId: result.targetProject?.id ?? null,
				created: result.created,
				published: result.published,
				localDeactivated: result.localDeactivated,
			});
			this.logger.info('Moved a workflow to a linked instance', {
				userId: user.id,
				linkedInstanceId,
				workflowId: input.workflowId,
				remoteWorkflowId: result.remoteWorkflowId,
				created: result.created,
				published: result.published,
			});
			return result;
		} catch (error) {
			this.recordFailure(user, {
				link: link.summary,
				direction: 'push',
				error,
				ids: { workflowId: input.workflowId },
			});
			throw toTransferHttpError(error, transferContext(link.summary, 'push'));
		}
	}

	/**
	 * Exports the workflow in the linked instance and imports it here. A repeated pull of the same
	 * workflow into the same project updates the workflow of the first pull.
	 * @throws {NotFoundError} when the user has no such link
	 * @throws {ForbiddenError} when the user cannot create workflows in the project
	 * @throws {BadRequestError} when the linked instance cannot be used or refuses to send the workflow
	 */
	async pull(user: User, linkId: string, input: PullInput): Promise<LinkedInstancePullResult> {
		const link = await this.sessions.findLink(user, linkId);
		const { id: linkedInstanceId } = link.summary;
		const { remoteWorkflowId, projectId } = input;
		try {
			await this.local.assertCanImportInto(user, projectId);
			const packageBase64 = await this.sessions.withSession(
				link,
				'pull',
				async (session) => await exportFromRemote(session, remoteWorkflowId),
			);
			const imported = await this.local.importPackage(user, {
				packageBase64,
				projectId,
				sourceWorkflowId: remoteWorkflowId,
			});
			this.eventService.emit('linked-instance-workflow-pulled', {
				user,
				linkedInstanceId,
				remoteWorkflowId,
				workflowId: imported.workflowId,
				...(projectId === undefined ? {} : { projectId }),
				created: imported.created,
			});
			this.logger.info('Brought a workflow from a linked instance', {
				userId: user.id,
				linkedInstanceId,
				remoteWorkflowId,
				workflowId: imported.workflowId,
				created: imported.created,
			});
			return toPullResult(imported);
		} catch (error) {
			this.recordFailure(user, {
				link: link.summary,
				direction: 'pull',
				error,
				ids: { remoteWorkflowId, projectId },
			});
			throw toTransferHttpError(error, transferContext(link.summary, 'pull'));
		}
	}

	private async runPush(
		user: User,
		link: StoredLinkedInstance,
		input: PushInput,
		options: TurnOffOptions,
	): Promise<LinkedInstancePushResult> {
		const workflow = await this.local.findMovable(user, input.workflowId);
		// Before any request to the linked instance, so that a refusal moves nothing.
		if (input.deactivateLocal) await this.local.assertCanTurnOff(user, workflow.id);

		const remote = await this.sessions.withSession(
			link,
			'push',
			async (session) => await this.sendAndPublish(user, session, workflow, input.publish === true),
		);
		const localStep = await this.turnOffLocalCopy(user, link.summary, workflow.id, {
			requested: input.deactivateLocal === true,
			publishFailed: input.publish === true && !remote.published,
			options,
		});

		const { imported, targetProject, published } = remote;
		return {
			remoteWorkflowId: imported.workflowId,
			remoteUrl: remoteWorkflowUrl(link.summary.baseUrl, imported.workflowId),
			targetProject,
			created: imported.created,
			published,
			credentialsNeedingSetup: imported.credentialsNeedingSetup,
			missingNodeTypes: imported.missingNodeTypes,
			localDeactivated: localStep.localDeactivated,
			// What did not work comes first, then what the linked instance reported.
			warnings: [...remote.warnings, ...localStep.warnings, ...imported.warnings],
		};
	}

	/** Runs after the probe, so that no export happens for an instance that cannot take it. */
	private async sendAndPublish(
		user: User,
		session: RemoteSession,
		workflow: WorkflowEntity,
		publish: boolean,
	): Promise<RemoteOutcome> {
		const { packageBase64 } = await this.local.exportPackage(user, workflow);
		const sent = await importWithFallback(session, {
			packageBase64,
			sourceWorkflowId: workflow.id,
		});
		if (!publish) return { ...sent, published: sent.imported.published };
		const publishing = await publishCopy(session, sent.imported);
		return {
			...sent,
			published: publishing.published,
			warnings: [...sent.warnings, ...publishing.warnings],
		};
	}

	/** The copy is in the linked instance already, so a failure here is a warning. */
	private async turnOffLocalCopy(
		user: User,
		link: LinkedInstanceSummary,
		workflowId: string,
		step: { requested: boolean; publishFailed: boolean; options: TurnOffOptions },
	): Promise<StepOutcome & { localDeactivated: boolean }> {
		if (!step.requested) return { localDeactivated: false, warnings: [] };
		// The user asked for the copy to run there. With both copies off, the automation stops.
		if (step.publishFailed) {
			return { localDeactivated: false, warnings: [TRANSFER_WARNINGS.keptLocalLive(link.name)] };
		}
		try {
			return {
				localDeactivated: await this.local.turnOff(user, workflowId, step.options),
				warnings: [],
			};
		} catch (error) {
			this.logger.warn('Could not turn off a workflow after it moved to a linked instance', {
				userId: user.id,
				linkedInstanceId: link.id,
				workflowId,
				reason: transferFailureReason(error),
			});
			return {
				localDeactivated: false,
				warnings: [TRANSFER_WARNINGS.turnOffFailed(reasonForClient(error))],
			};
		}
	}

	private recordFailure(user: User, failure: TransferFailure): void {
		const { link, direction, error, ids } = failure;
		const reason = transferFailureReason(error);
		const event = { linkedInstanceId: link.id, direction, ...ids, reason };
		this.eventService.emit('linked-instance-workflow-transfer-failed', { user, ...event });
		this.logger.warn('A move with a linked instance failed', { userId: user.id, ...event });
	}
}

function toPullResult(imported: ImportedWorkflowPackage): LinkedInstancePullResult {
	return {
		workflowId: imported.workflowId,
		workflowName: imported.workflowName,
		created: imported.created,
		published: imported.published,
		credentialsNeedingSetup: imported.credentialsNeedingSetup,
		missingNodeTypes: imported.missingNodeTypes,
		warnings: imported.warnings,
	};
}

/**
 * Imports into the default project of the link. When the linked instance refuses that project,
 * for example because the token's user is a viewer there, the personal project takes the workflow.
 */
async function importWithFallback(
	session: RemoteSession,
	args: RemoteImportArgs,
): Promise<Omit<RemoteOutcome, 'published'>> {
	const project = session.link.defaultRemoteProject;
	if (!project) {
		return { imported: await importOnRemote(session, args), targetProject: null, warnings: [] };
	}
	try {
		const imported = await importOnRemote(session, { ...args, projectId: project.id });
		return { imported, targetProject: project, warnings: [] };
	} catch (error) {
		if (!isProjectRefusal(error)) throw error;
		return {
			imported: await importOnRemote(session, args),
			targetProject: null,
			warnings: [TRANSFER_WARNINGS.personalProjectFallback(session.link.name, project.name)],
		};
	}
}

/** Puts the copy live. The linked instance never publishes a workflow with missing node types. */
async function publishCopy(
	session: RemoteSession,
	imported: RemoteImportResult,
): Promise<StepOutcome & { published: boolean }> {
	const { name } = session.link;
	if (imported.missingNodeTypes.length > 0) {
		return { published: imported.published, warnings: [TRANSFER_WARNINGS.missingNodeTypes(name)] };
	}
	const outcome = await publishOnRemote(session, imported.workflowId);
	if (outcome.ok) return { published: true, warnings: [] };
	const warning =
		outcome.failure === 'unavailable'
			? TRANSFER_WARNINGS.cannotPublish(name)
			: TRANSFER_WARNINGS.publishFailed(name, outcome.reason);
	// An earlier version can stay live after a failed publish.
	return { published: imported.published, warnings: [warning] };
}
