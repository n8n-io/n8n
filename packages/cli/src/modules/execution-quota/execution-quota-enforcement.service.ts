import { Logger } from '@n8n/backend-common';
import { SharedWorkflowRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';

import type { IWorkflowErrorData } from '@/interfaces';

import type { ExecutionQuotaConfig } from './database/entities/execution-quota-config';
import { ExecutionQuotaExceededError } from './execution-quota.errors';
import { ExecutionQuotaService } from './execution-quota.service';

interface QuotaExceededContext {
	workflowId: string;
	workflowName: string;
	projectId: string;
	projectName: string;
	currentCount: number;
	limit: number;
	period: string;
	periodStart: Date;
}

@Service()
export class ExecutionQuotaEnforcementService {
	constructor(
		private readonly quotaService: ExecutionQuotaService,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('execution-quota');
	}

	/**
	 * Check and enforce quota before a workflow execution starts.
	 * Throws ExecutionQuotaExceededError if enforcement mode is 'block'.
	 */
	async enforceQuota(workflowId: string, workflowName: string): Promise<void> {
		const shared = await this.sharedWorkflowRepository.findOne({
			where: { workflowId, role: 'workflow:owner' },
			relations: { project: true },
		});

		if (!shared) return;

		const result = await this.quotaService.checkQuota(workflowId, shared.projectId);

		if (result.allowed || !result.exceededConfig) return;

		const context: QuotaExceededContext = {
			workflowId,
			workflowName,
			projectId: shared.projectId,
			projectName: shared.project.name,
			currentCount: result.currentCount!,
			limit: result.exceededConfig.limit,
			period: result.exceededConfig.period,
			periodStart: result.periodStart!,
		};

		await this.enforce(result.exceededConfig, context);
	}

	private async enforce(
		config: ExecutionQuotaConfig,
		context: QuotaExceededContext,
	): Promise<void> {
		const scope = config.workflowId ? 'workflow' : 'project';

		switch (config.enforcementMode) {
			case 'block':
				this.logger.warn('Execution blocked by quota', {
					workflowId: context.workflowId,
					projectId: context.projectId,
					period: context.period,
					count: context.currentCount,
					limit: context.limit,
				});
				throw new ExecutionQuotaExceededError(
					config.period,
					context.limit,
					context.currentCount,
					scope,
				);

			case 'warn':
				this.logger.warn('Execution quota exceeded (warn mode, allowing execution)', {
					workflowId: context.workflowId,
					projectId: context.projectId,
					period: context.period,
					count: context.currentCount,
					limit: context.limit,
				});
				break;

			case 'workflow':
				if (config.quotaWorkflowId) {
					void this.triggerQuotaWorkflow(config.quotaWorkflowId, context);
				} else {
					this.logger.error(
						'Quota enforcement mode is "workflow" but no quotaWorkflowId configured',
						{ configId: config.id },
					);
				}
				break;
		}
	}

	private async triggerQuotaWorkflow(
		quotaWorkflowId: string,
		context: QuotaExceededContext,
	): Promise<void> {
		try {
			this.logger.debug('Triggering quota workflow', {
				quotaWorkflowId,
				workflowId: context.workflowId,
			});

			// Lazy import to avoid circular dependencies
			const { WorkflowExecutionService } = await import('@/workflows/workflow-execution.service');
			const { OwnershipService } = await import('@/services/ownership.service');

			const ownershipService = Container.get(OwnershipService);
			const executionService = Container.get(WorkflowExecutionService);

			const project = await ownershipService.getWorkflowProjectCached(context.workflowId);

			// Construct IWorkflowErrorData matching the expected interface.
			// The error trigger node receives this as JSON data on its output.
			const workflowErrorData: IWorkflowErrorData = {
				workflow: {
					id: context.workflowId,
					name: context.workflowName,
				},
				quota: {
					projectId: context.projectId,
					projectName: context.projectName,
					currentCount: context.currentCount,
					limit: context.limit,
					period: context.period,
					periodStart: context.periodStart.toISOString(),
					exceeded: true,
				},
			};

			await executionService.executeErrorWorkflow(quotaWorkflowId, workflowErrorData, project);
		} catch (error) {
			this.logger.error('Failed to trigger quota workflow', {
				quotaWorkflowId,
				error,
			});
		}
	}
}
