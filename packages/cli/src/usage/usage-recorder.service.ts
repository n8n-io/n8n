import { Logger } from '@n8n/backend-common';
import { UsageRepository, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { ExecutionStatus, WorkflowExecuteMode, WorkflowExecutionSource } from 'n8n-workflow';

import { OwnershipService } from '@/services/ownership.service';

import { isFinalStatus } from './usage-units';

export type FinishedWorkflowRun = {
	executionId: string;
	workflowId: string;
	workflowName?: string | null;
	mode: WorkflowExecuteMode;
	status: ExecutionStatus;
	source?: WorkflowExecutionSource;
	startedAt?: Date | null;
	endedAt: Date;
	/** Set for a sub-workflow run. */
	parentExecutionId?: string | null;
};

export type FinishedAgentMessage = {
	executionId: string;
	agentId: string;
	agentName: string;
	projectId: string;
	source: string | null;
	/** A draft or test-session message. */
	isTest: boolean;
	/** Set for a sub-agent message. */
	parentThreadId: string | null;
	status: string;
	startedAt: Date | null;
	endedAt: Date;
};

/** Writes one raw usage fact per finished workflow run or agent message. No unit rules here. */
@Service()
export class UsageRecorder {
	constructor(
		private readonly logger: Logger,
		private readonly usageRepository: UsageRepository,
		private readonly ownershipService: OwnershipService,
	) {
		this.logger = this.logger.scoped('usage');
	}

	/** Never throws: losing a count must not fail the run that produced it. */
	async recordWorkflowRun(run: FinishedWorkflowRun): Promise<void> {
		if (!isFinalStatus(run.status)) return;

		try {
			await this.usageRepository.append({
				kind: 'workflow',
				executionId: run.executionId,
				phase: 'finished',
				subjectId: run.workflowId,
				subjectName: run.workflowName ?? null,
				projectId: await this.projectOf(run.workflowId),
				trigger: run.mode,
				status: run.status,
				origin: run.source ?? null,
				isTest: false,
				parentId: run.parentExecutionId ?? null,
				startedAt: run.startedAt ?? null,
				occurredAt: run.endedAt,
			});
		} catch (error) {
			this.logger.error('Failed to record workflow usage', {
				executionId: run.executionId,
				error: ensureError(error),
			});
		}
	}

	/** Throws, so the caller's transaction rolls back with the message's final status. */
	async recordAgentMessage(message: FinishedAgentMessage, ctx: OperationContext): Promise<void> {
		await this.usageRepository.append(
			{
				kind: 'agent',
				executionId: message.executionId,
				phase: 'finished',
				subjectId: message.agentId,
				subjectName: message.agentName,
				projectId: message.projectId,
				trigger: message.source ?? 'unknown',
				status: message.status,
				origin: null,
				isTest: message.isTest,
				parentId: message.parentThreadId,
				startedAt: message.startedAt,
				occurredAt: message.endedAt,
			},
			ctx,
		);
	}

	private async projectOf(workflowId: string): Promise<string | null> {
		try {
			return (await this.ownershipService.getWorkflowProjectCached(workflowId)).id;
		} catch {
			// The workflow lost its owner, e.g. it was deleted while running.
			return null;
		}
	}
}
