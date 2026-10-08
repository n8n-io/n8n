import type {
	LinkedInstancePullResult,
	LinkedInstancePushResult,
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
import { exportFromRemote } from './remote-transfer-tools';
import {
	toTransferHttpError,
	transferContext,
	transferFailureReason,
	TRANSFER_WARNINGS,
	type TransferDirection,
} from './transfer-errors';
import { TransferLocalWorkflows } from './transfer-local-workflows';
import { importWithFallback, publishCopy, type RemoteOutcome } from './transfer-push-steps';

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

type LocalStepOutcome = { localDeactivated: boolean; warnings: string[] };

/** What the step that turns off the workflow here needs to know. */
type TurnOffStep = {
	requested: boolean;
	/** The move asked to publish the copy, and the new version did not go live there. */
	publishFailed: boolean;
	options: TurnOffOptions;
};

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
		const localStep = await this.turnOffLocalCopy(user, link.summary, workflow, {
			requested: input.deactivateLocal === true,
			publishFailed: remote.publishFailed,
			options,
		});
		return toPushResult(link.summary, remote, localStep);
	}

	/** Runs after the probe, so that no export happens for an instance that cannot take it. */
	private async sendAndPublish(
		user: User,
		session: RemoteSession,
		workflow: WorkflowEntity,
		publish: boolean,
	): Promise<RemoteOutcome> {
		// The warnings of the export tell an MCP client what any import must check: the error
		// workflow link and the variables. The import there reports what it found, for example the
		// variables that are missing, so the result shows only those.
		const { packageBase64 } = await this.local.exportPackage(user, workflow);
		const sent = await importWithFallback(session, {
			packageBase64,
			sourceWorkflowId: workflow.id,
		});
		if (!publish) return { ...sent, published: sent.imported.published, publishFailed: false };
		const publishing = await publishCopy(session, sent.imported);
		return {
			...sent,
			published: publishing.published,
			publishFailed: publishing.failed,
			warnings: [...sent.warnings, ...publishing.warnings],
		};
	}

	/** The copy is in the linked instance already, so a failure here is a warning. */
	private async turnOffLocalCopy(
		user: User,
		link: LinkedInstanceSummary,
		workflow: WorkflowEntity,
		step: TurnOffStep,
	): Promise<LocalStepOutcome> {
		// A workflow that is not live here has nothing to turn off, and nothing stays on.
		if (!step.requested || workflow.activeVersionId === null) {
			return { localDeactivated: false, warnings: [] };
		}
		// The user asked for the new version to run there instead. Without it, the automation would
		// stop or run an earlier version, so the workflow here stays on.
		if (step.publishFailed) {
			return { localDeactivated: false, warnings: [TRANSFER_WARNINGS.keptLocalLive(link.name)] };
		}
		try {
			return {
				localDeactivated: await this.local.turnOff(user, workflow.id, step.options),
				warnings: [],
			};
		} catch (error) {
			this.logger.warn('Could not turn off a workflow after it moved to a linked instance', {
				userId: user.id,
				linkedInstanceId: link.id,
				workflowId: workflow.id,
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

function toPushResult(
	link: LinkedInstanceSummary,
	remote: RemoteOutcome,
	local: LocalStepOutcome,
): LinkedInstancePushResult {
	const { imported, targetProject, published, publishFailed } = remote;
	return {
		remoteWorkflowId: imported.workflowId,
		remoteUrl: remoteWorkflowUrl(link.baseUrl, imported.workflowId),
		targetProject,
		created: imported.created,
		published,
		publishFailed,
		credentialsNeedingSetup: imported.credentialsNeedingSetup,
		missingNodeTypes: imported.missingNodeTypes,
		localDeactivated: local.localDeactivated,
		// What did not work comes first, then what the linked instance reported.
		warnings: [...remote.warnings, ...local.warnings, ...imported.warnings],
	};
}
