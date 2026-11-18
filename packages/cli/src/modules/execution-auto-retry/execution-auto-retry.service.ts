import { Logger } from '@n8n/backend-common';
import { retryabilityFromError } from '@n8n/backend-network';
import { ScheduledJobMisfirePolicy } from '@n8n/constants';
import { ExecutionRepository, WorkflowRepository } from '@n8n/db';
import { OnLifecycleEvent, type WorkflowExecuteAfterContext } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { ExecutionError, WorkflowExecuteMode } from 'n8n-workflow';

import { toSaveSettings } from '@/execution-lifecycle/to-save-settings';
import { DurableJobProvisioner } from '@/scheduling/durable-job-provisioner';
import { DurableScheduler } from '@/scheduling/durable-scheduler';
import { WorkflowScheduledJobOwner } from '@/scheduling/workflow-scheduled-job-owner';

import {
	autoRetryJobName,
	autoRetryMemberId,
	EXECUTION_AUTO_RETRY_TASK_TYPE,
	isAutoRetryEnabled,
	RETRY_WAITS_SECONDS,
} from './execution-auto-retry-job';

const PRODUCTION_MODES: ReadonlySet<WorkflowExecuteMode> = new Set(['trigger', 'webhook']);

/**
 * The run keeps a copy of the node error without its `cause`, so a connection
 * failure code such as `ECONNREFUSED` survives only in `httpCode`.
 */
function isTemporaryFailure(error: ExecutionError | undefined): boolean {
	const failureCode = error && 'httpCode' in error ? error.httpCode : undefined;
	return [error, { code: failureCode }].some(
		(candidate) => retryabilityFromError(candidate).retryable === 'yes',
	);
}

/**
 * Owns the auto-retry job of each failed run: removes the spent one, schedules the next.
 * The module loads only on mains, so in queue mode the main that awaited the job handles each run once.
 */
@Service()
export class ExecutionAutoRetryService {
	constructor(
		private logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
		private readonly executionRepository: ExecutionRepository,
		private readonly durableScheduler: DurableScheduler,
		private readonly provisioner: DurableJobProvisioner,
		private readonly owner: WorkflowScheduledJobOwner,
	) {
		this.logger = this.logger.scoped('scheduler');
	}

	@OnLifecycleEvent('workflowExecuteAfter')
	async onWorkflowExecuteAfter(ctx: WorkflowExecuteAfterContext): Promise<void> {
		try {
			await this.updateRetryJobs(ctx);
		} catch (error) {
			// A throw here would replace the saved error of the run and run every after-hook again.
			this.logger.warn('Could not update the automatic retry of an execution', {
				workflowId: ctx.workflow.id,
				executionId: ctx.executionId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private async updateRetryJobs(ctx: WorkflowExecuteAfterContext): Promise<void> {
		const workflowId = ctx.workflow.id;

		if (ctx.retryOf) {
			await this.provisioner.deprovisionOwnerMember(
				this.owner.member(workflowId, autoRetryMemberId(ctx.retryOf)),
			);
		}

		const originalId = (await this.isRetryCandidate(ctx))
			? await this.findProductionOriginal(ctx)
			: undefined;
		const retries =
			originalId === undefined
				? undefined
				: await this.executionRepository.countRetries(workflowId, originalId);

		if (originalId !== undefined && retries !== undefined && retries < RETRY_WAITS_SECONDS.length) {
			const fireAt = new Date(Date.now() + RETRY_WAITS_SECONDS[retries] * 1000);
			await this.provisioner.provision({
				owner: this.owner.member(workflowId, autoRetryMemberId(originalId)),
				taskType: EXECUTION_AUTO_RETRY_TASK_TYPE,
				payload: { workflowId, executionId: originalId },
				desired: [
					{
						name: autoRetryJobName(workflowId, originalId),
						schedule: { kind: 'one_off', fireAt },
						firstRunAt: fireAt,
					},
				],
				misfirePolicy: ScheduledJobMisfirePolicy.Coalesce,
			});
		}
	}

	private async isRetryCandidate(ctx: WorkflowExecuteAfterContext): Promise<boolean> {
		const saveErrors = toSaveSettings(ctx.workflow.settings).error;
		const isCandidate =
			ctx.runData.status === 'error' &&
			(saveErrors === true || saveErrors === 'all') &&
			this.durableScheduler.isActive() &&
			isTemporaryFailure(ctx.runData.data.resultData.error);

		return isCandidate && (await this.isEnabledFor(ctx.workflow.id));
	}

	private async isEnabledFor(workflowId: string): Promise<boolean> {
		const workflow = await this.workflowRepository.findById(workflowId);
		return isAutoRetryEnabled(workflow?.settings);
	}

	/**
	 * The id of the run that every automatic retry re-runs, or `undefined` when
	 * that run did not come from a production trigger.
	 */
	private async findProductionOriginal(
		ctx: WorkflowExecuteAfterContext,
	): Promise<string | undefined> {
		let originalId = ctx.executionId;
		let mode = ctx.mode;
		let parentId = await this.findParentId(ctx);
		let hops = 0;

		while (mode === 'retry' && parentId !== undefined && hops <= RETRY_WAITS_SECONDS.length) {
			const parent = await this.executionRepository.findRetryLink(parentId);
			originalId = parentId;
			mode = parent?.mode ?? 'manual';
			parentId = parent?.retryOf ?? undefined;
			hops++;
		}

		return PRODUCTION_MODES.has(mode) ? originalId : undefined;
	}

	/** A retry run resumed from a wait carries no `retryOf` in its context, so its row supplies it. */
	private async findParentId(ctx: WorkflowExecuteAfterContext): Promise<string | undefined> {
		const storedRetryOf =
			ctx.mode === 'retry' && ctx.retryOf === undefined
				? (await this.executionRepository.findRetryLink(ctx.executionId))?.retryOf
				: undefined;

		return ctx.retryOf ?? storedRetryOf ?? undefined;
	}
}
