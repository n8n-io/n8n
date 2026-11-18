import { Logger } from '@n8n/backend-common';
import { ExecutionRepository, UserRepository, WorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';
import type { ClaimedTask, DispatchDecision, DispatchReporter, TaskHandler } from '@n8n/scheduler';

import { ExecutionService } from '@/executions/execution.service';
import { DurableJobProvisioner } from '@/scheduling/durable-job-provisioner';
import { WorkflowScheduledJobOwner } from '@/scheduling/workflow-scheduled-job-owner';
import { WorkflowPublisherService } from '@/workflows/workflow-publisher.service';

import {
	autoRetryMemberId,
	EXECUTION_AUTO_RETRY_TASK_TYPE,
	isAutoRetryEnabled,
	isAutoRetryJobPayload,
} from './execution-auto-retry-job';

/**
 * Starts the retry of a failed execution as the publisher of the version it ran.
 * It does not wait for the retry, so a long run cannot hold the lease.
 */
@Service()
export class ExecutionAutoRetryTaskHandler implements TaskHandler {
	readonly taskType = EXECUTION_AUTO_RETRY_TASK_TYPE;

	constructor(
		private logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly userRepository: UserRepository,
		private readonly workflowPublisherService: WorkflowPublisherService,
		private readonly executionService: ExecutionService,
		private readonly provisioner: DurableJobProvisioner,
		private readonly owner: WorkflowScheduledJobOwner,
	) {
		this.logger = this.logger.scoped('scheduler');
	}

	async execute(task: ClaimedTask, report: DispatchReporter): Promise<DispatchDecision> {
		if (!isAutoRetryJobPayload(task.payload)) {
			throw new UnexpectedError('Auto-retry payload is missing workflowId or executionId', {
				extra: { taskId: task.id, jobId: task.jobId },
			});
		}
		const { workflowId, executionId } = task.payload;
		const publisher = await this.findRetryPublisher(workflowId, executionId);

		let decision: DispatchDecision;
		if (publisher) {
			this.startRetry(publisher, workflowId, executionId);
			decision = report.dispatched();
		} else {
			// No later run ends to remove this job, so it removes itself.
			await this.deleteJob(workflowId, executionId);
			decision = report.notDispatched();
		}
		return decision;
	}

	/**
	 * The user to retry as, or `null` when the execution no longer qualifies for a retry.
	 * A failed lookup throws, so the scheduler tries the task again instead of dropping it.
	 */
	private async findRetryPublisher(workflowId: string, executionId: string): Promise<User | null> {
		const link = await this.executionRepository.findRetryLink(executionId);
		const versionId = link?.workflowVersionId;
		const awaitsRetry = !!versionId && link.retrySuccessId === null;
		const workflow = awaitsRetry ? await this.workflowRepository.findById(workflowId) : null;
		const publisherId =
			versionId && workflow?.activeVersionId && isAutoRetryEnabled(workflow.settings)
				? await this.workflowPublisherService.findPublisherUserIdForAccessCheck(
						workflowId,
						versionId,
					)
				: undefined;

		return publisherId ? await this.userRepository.findByIdWithRole(publisherId) : null;
	}

	private startRetry(user: User, workflowId: string, executionId: string): void {
		void this.executionService
			.retry({
				executionId,
				options: { loadWorkflow: false },
				sharedWorkflowIds: [workflowId],
				user,
			})
			.catch(async (error: unknown) => {
				this.logger.warn('Could not start an automatic retry', {
					workflowId,
					executionId,
					error: error instanceof Error ? error.message : String(error),
				});
				await this.deleteJob(workflowId, executionId);
			})
			.catch((error: unknown) => {
				this.logger.warn('Could not remove the job of a refused automatic retry', {
					workflowId,
					executionId,
					error: error instanceof Error ? error.message : String(error),
				});
			});
	}

	private async deleteJob(workflowId: string, executionId: string): Promise<void> {
		await this.provisioner.deprovisionOwnerMember(
			this.owner.member(workflowId, autoRetryMemberId(executionId)),
		);
	}
}
