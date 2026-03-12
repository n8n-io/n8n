import type { DataSource } from '@n8n/typeorm';

import type { TriggerWorkflowConfig } from '../sdk/types';
import { StepStatus } from '../database/enums';
import { WorkflowEntity } from '../database/entities/workflow.entity';
import { WorkflowStepExecution } from '../database/entities/workflow-step-execution.entity';
import type { EngineEventBus } from './event-bus.service';
import type { EngineService } from './engine.service';
import type { ExecutionEvent } from './event-bus.types';

/**
 * Handles cross-workflow triggering. Starts a child workflow execution
 * and waits for it to complete, linking the parent step to the child
 * execution via metadata.
 */
export class WorkflowTriggerService {
	constructor(
		private readonly dataSource: DataSource,
		private readonly engineService: EngineService,
		private readonly eventBus: EngineEventBus,
	) {}

	async triggerAndAwait(
		parentStep: WorkflowStepExecution,
		config: TriggerWorkflowConfig,
	): Promise<unknown> {
		// Resolve workflow by name
		const workflow = await this.dataSource
			.getRepository(WorkflowEntity)
			.createQueryBuilder('w')
			.where('w.name = :name', { name: config.workflow })
			.orderBy('w.version', 'DESC')
			.limit(1)
			.getOne();

		if (!workflow) {
			throw new Error(`Workflow not found: "${config.workflow}"`);
		}

		// Start child execution
		const childExecutionId = await this.engineService.startExecution(
			workflow.id,
			config.input,
			'production',
		);

		// Mark parent step as waiting with child execution reference
		await this.dataSource
			.getRepository(WorkflowStepExecution)
			.createQueryBuilder()
			.update(WorkflowStepExecution)
			.set({
				status: StepStatus.Waiting,
				metadata: { ...parentStep.metadata, childExecutionId },
			} as Record<string, unknown>)
			.where('id = :id', { id: parentStep.id })
			.execute();

		// Return a promise that resolves when the child execution completes
		return new Promise((resolve, reject) => {
			const timeout = config.timeout
				? setTimeout(() => {
						cleanup();
						reject(new Error(`Trigger workflow timed out after ${config.timeout}ms`));
					}, config.timeout)
				: undefined;

			const handler = (event: ExecutionEvent) => {
				if (event.type === 'execution:completed' && event.executionId === childExecutionId) {
					cleanup();
					resolve(event.result);
				} else if (event.type === 'execution:failed' && event.executionId === childExecutionId) {
					cleanup();
					reject(new Error(`Child workflow failed: ${event.error?.message ?? 'unknown'}`));
				}
			};

			const cleanup = () => {
				if (timeout) clearTimeout(timeout);
				this.eventBus.off('execution:*', handler as (...args: unknown[]) => void);
			};

			this.eventBus.onExecutionEvent(handler);
		});
	}
}
