import type { DataSource } from '@n8n/typeorm';

import type { WorkflowGraph } from '../graph/workflow-graph';
import { TERMINAL_STATUSES, StepStatus, StepType, ExecutionStatus } from '../database/enums';
import { WorkflowExecution } from '../database/entities/workflow-execution.entity';
import { WorkflowStepExecution } from '../database/entities/workflow-step-execution.entity';
import type { EngineEventBus } from './event-bus.service';
import type { MetricsService } from './metrics.service';

/**
 * Determines when a workflow execution is complete and calculates
 * final metrics. An execution is complete when all planned step
 * executions are in a terminal status.
 */
export class CompletionService {
	constructor(
		private readonly dataSource: DataSource,
		private readonly eventBus: EngineEventBus,
		private readonly metrics?: MetricsService,
	) {}

	async checkExecutionComplete(executionId: string, graph: WorkflowGraph): Promise<void> {
		const stepRepo = this.dataSource.getRepository(WorkflowStepExecution);

		// 1. Count non-terminal step executions
		const nonTerminalCount = await stepRepo
			.createQueryBuilder('wse')
			.where('wse.executionId = :executionId', { executionId })
			.andWhere('wse.status NOT IN (:...statuses)', {
				statuses: TERMINAL_STATUSES,
			})
			.getCount();

		// 2. If > 0, return (not complete yet)
		if (nonTerminalCount > 0) return;

		// 3. Determine final status
		// Count completed non-trigger steps
		const hasCompletedSteps = await stepRepo
			.createQueryBuilder('wse')
			.where('wse.executionId = :executionId AND wse.status = :s AND wse.stepType != :t', {
				executionId,
				s: StepStatus.Completed,
				t: StepType.Trigger,
			})
			.getCount();

		// 4. Find last leaf step output for execution result
		const leafStepIds = graph.getLeafNodes().map((n) => n.id);
		let lastLeaf: WorkflowStepExecution | null = null;

		if (leafStepIds.length > 0) {
			lastLeaf = await stepRepo
				.createQueryBuilder('wse')
				.where('wse.executionId = :executionId AND wse.status = :s', {
					executionId,
					s: StepStatus.Completed,
				})
				.andWhere('wse.stepId IN (:...leafIds)', { leafIds: leafStepIds })
				.orderBy('wse.completedAt', 'DESC')
				.getOne();
		}

		// Load execution for startedAt and cancelRequested
		const execution = await this.dataSource
			.getRepository(WorkflowExecution)
			.findOneByOrFail({ id: executionId });

		// 5. Calculate metrics
		const steps = await stepRepo
			.createQueryBuilder('wse')
			.select(['wse.stepType', 'wse.durationMs'])
			.where('wse.executionId = :executionId AND wse.status IN (:...s)', {
				executionId,
				s: [StepStatus.Completed, StepStatus.Cached],
			})
			.getMany();

		const computeMs = steps
			.filter((s) => s.stepType !== StepType.Approval)
			.reduce((sum, s) => sum + (s.durationMs ?? 0), 0);
		const wallMs = Date.now() - execution.startedAt.getTime();

		// Determine final status:
		// - If cancel was requested -> 'cancelled'
		// - If at least one non-trigger step completed -> 'completed'
		// - Otherwise -> 'failed'
		let finalStatus: ExecutionStatus;
		if (execution.cancelRequested) {
			finalStatus = ExecutionStatus.Cancelled;
		} else if (hasCompletedSteps > 0) {
			finalStatus = ExecutionStatus.Completed;
		} else {
			finalStatus = ExecutionStatus.Failed;
		}

		// 6. CAS guard: only finalize if execution is still in a non-terminal status
		// Prevents double-finalization when two steps complete simultaneously
		// TypeORM's _QueryDeepPartialEntity rejects null for jsonb columns,
		// but null is valid for PostgreSQL jsonb. Cast the set object.
		const updateResult = await this.dataSource
			.getRepository(WorkflowExecution)
			.createQueryBuilder()
			.update(WorkflowExecution)
			.set({
				status: finalStatus,
				result: lastLeaf?.output ?? null,
				completedAt: new Date(),
				durationMs: wallMs,
				computeMs,
				waitMs: wallMs - computeMs,
			} as Record<string, unknown>)
			.where('id = :id AND status NOT IN (:...terminal)', {
				id: executionId,
				terminal: [ExecutionStatus.Completed, ExecutionStatus.Failed, ExecutionStatus.Cancelled],
			})
			.execute();

		// If no rows affected, another call already finalized -- skip event emission
		if (updateResult.affected === 0) return;

		// Track execution completion metrics
		this.metrics?.executionTotal.inc({ status: finalStatus });
		this.metrics?.executionDuration.observe({ workflow_id: execution.workflowId }, wallMs);

		// 7. Emit execution:completed or execution:failed
		if (finalStatus === ExecutionStatus.Completed) {
			this.eventBus.emit({
				type: 'execution:completed',
				executionId,
				result: lastLeaf?.output ?? null,
			});
		} else if (finalStatus === ExecutionStatus.Failed) {
			this.eventBus.emit({
				type: 'execution:failed',
				executionId,
				error: {
					message: 'Execution failed: no steps completed successfully',
					code: 'EXECUTION_FAILED',
					category: 'step',
					retriable: false,
				},
			});
		} else {
			this.eventBus.emit({
				type: 'execution:cancelled',
				executionId,
			});
		}
	}
}
