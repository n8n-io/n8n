import { Logger } from '@n8n/backend-common';
import {
	ExecutionRepository,
	UserRepository,
	WorkflowCredentialBindingRepository,
	WorkflowSubscriptionRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { ClaimedTask, DispatchDecision, DispatchReporter, TaskHandler } from '@n8n/scheduler';
import { ErrorReporter } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

import { DuplicateExecutionError } from '@/errors/duplicate-execution.error';
import { ScheduledTriggerIdentityService } from '@/modules/dynamic-credentials.ee/credential-resolvers/identifiers/scheduled-trigger-identity';
import { CatalogRunService } from '@/workflows/catalog-run.service';
import {
	CATALOG_SUBSCRIPTION_TASK_TYPE,
	catalogSubscriptionDeduplicationKey,
	isCatalogSubscriptionTaskPayload,
} from '@/workflows/catalog-subscription-task';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

/**
 * Runs one person's scheduled catalog workflow.
 *
 * Everything that a live request would have proved — that the person still
 * exists, still consents, and may still execute the workflow — has to be proved
 * again here, because the only thing the occurrence carries is a subscription
 * id written when the schedule was created. A check that fails is not an error:
 * consent gets withdrawn and access gets removed in the ordinary course of
 * things, so the occurrence reports no dispatch and the job is left for the
 * service that owns it to clean up.
 */
@Service()
export class CatalogSubscriptionTaskHandler implements TaskHandler {
	readonly taskType = CATALOG_SUBSCRIPTION_TASK_TYPE;

	constructor(
		private logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly subscriptions: WorkflowSubscriptionRepository,
		private readonly bindings: WorkflowCredentialBindingRepository,
		private readonly userRepository: UserRepository,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly scheduledTriggerIdentityService: ScheduledTriggerIdentityService,
		private readonly catalogRunService: CatalogRunService,
	) {
		this.logger = this.logger.scoped('scheduler');
	}

	async execute(task: ClaimedTask, report: DispatchReporter): Promise<DispatchDecision> {
		const { subscriptionId } = this.parsePayload(task);

		const subscription = await this.subscriptions.findOneById(subscriptionId);
		if (!subscription?.enabled) {
			return this.skip(report, task, subscriptionId, subscription ? 'paused' : 'gone');
		}

		// With the role loaded: there is no request to take an authenticated user
		// from, and the access check below reads the scopes it carries.
		const user = await this.userRepository.findOneWithRole(subscription.userId);
		if (!user || user.disabled) {
			return this.skip(report, task, subscriptionId, 'user-cannot-run');
		}

		if (!(await this.bindings.isActive(subscription.workflowId, subscription.userId))) {
			return this.skip(report, task, subscriptionId, 'consent-withdrawn');
		}

		// Also the access check: revoking project membership never touches the
		// binding, so this is what catches someone who kept the grant but lost the
		// workflow.
		const workflowData = await this.workflowFinderService.findWorkflowForUser(
			subscription.workflowId,
			user,
			['workflow:execute'],
		);
		if (!workflowData) {
			return this.skip(report, task, subscriptionId, 'no-execute-access');
		}

		const deduplicationKey = catalogSubscriptionDeduplicationKey(task);

		try {
			const { executionId } = await this.catalogRunService.run(
				workflowData,
				user,
				subscription.inputs,
				{
					// Minted per occurrence rather than stored: the token is short-lived
					// by design, and one written at subscribe time would be long expired.
					encryptedRunnerIdentity: await this.scheduledTriggerIdentityService.mintCredentialContext(
						user.id,
						subscription.workflowId,
					),
					deduplicationKey,
				},
			);

			const decision = report.dispatched();

			this.logger.debug('Handed off a catalog subscription to a new execution', {
				taskId: task.id,
				jobId: task.jobId,
				subscriptionId,
				workflowId: subscription.workflowId,
				executionId,
			});

			return decision;
		} catch (error) {
			if (!(error instanceof DuplicateExecutionError)) {
				throw error;
			}
			// A previous delivery of this same occurrence already created the run.
			await this.recordExistingHandoff(task, error);
			return report.notDispatched();
		}
	}

	private parsePayload(task: ClaimedTask): { subscriptionId: string } {
		if (!isCatalogSubscriptionTaskPayload(task.payload)) {
			throw new UnexpectedError('Catalog-subscription task payload is missing subscriptionId', {
				extra: { taskId: task.id, jobId: task.jobId },
			});
		}
		return task.payload;
	}

	/**
	 * The subscription can no longer run. Reported as a non-dispatch rather than a
	 * failure — nothing is broken — but logged, because a job that keeps reaching
	 * this point is one whose owner failed to deprovision it.
	 */
	private skip(
		report: DispatchReporter,
		task: ClaimedTask,
		subscriptionId: string,
		reason: 'gone' | 'paused' | 'user-cannot-run' | 'consent-withdrawn' | 'no-execute-access',
	): DispatchDecision {
		this.logger.warn('Skipped a catalog subscription occurrence', {
			taskId: task.id,
			jobId: task.jobId,
			subscriptionId,
			reason,
		});
		return report.notDispatched();
	}

	private async recordExistingHandoff(
		task: ClaimedTask,
		error: DuplicateExecutionError,
	): Promise<void> {
		const { deduplicationKey } = error;
		const existing = await this.executionRepository.findOne({
			where: { deduplicationKey },
			select: ['id', 'status'],
		});

		const context = {
			taskId: task.id,
			jobId: task.jobId,
			attempts: task.attempts,
			deduplicationKey,
			executionId: existing?.id,
			executionStatus: existing?.status,
		};
		this.logger.warn(
			'Catalog subscription occurrence redelivered after a previously recorded execution; skipping',
			context,
		);
		this.errorReporter.warn(error, { extra: context, shouldBeLogged: false });
	}
}
