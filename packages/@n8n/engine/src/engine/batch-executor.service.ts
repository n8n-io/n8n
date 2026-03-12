import type { DataSource } from '@n8n/typeorm';

import type { WorkflowGraph } from '../graph/workflow-graph';
import { StepStatus } from '../database/enums';
import { WorkflowStepExecution } from '../database/entities/workflow-step-execution.entity';
import type { EngineEventBus } from './event-bus.service';

/**
 * Result of processing a single batch item.
 */
export interface BatchItemResult {
	status: 'fulfilled' | 'rejected';
	value?: unknown;
	reason?: { message: string; stack?: string };
}

/**
 * Executes batch steps by fanning out N child step executions (one per item)
 * and aggregating results back into the parent step.
 *
 * Supports three failure strategies via `onItemFailure`:
 * - 'fail-fast': Stop on first failure, fail the parent immediately
 * - 'continue': Process all items, collect failures in results
 * - 'abort-remaining': Stop on first failure, but don't fail parent --
 *   return partial results with remaining items marked as rejected
 */
export class BatchExecutorService {
	constructor(
		private readonly dataSource: DataSource,
		private readonly eventBus: EngineEventBus,
	) {}

	/**
	 * Fan out a batch step into N child step executions.
	 * Creates child step execution records in the database and queues them.
	 *
	 * @param parentStepExecution - The parent batch step execution
	 * @param items - Array of items to process
	 * @param graph - The workflow graph (used for generating child step IDs)
	 * @param onItemFailure - Failure strategy: 'fail-fast' | 'continue' | 'abort-remaining'
	 */
	async processBatch(
		parentStepExecution: WorkflowStepExecution,
		items: unknown[],
		graph: WorkflowGraph,
		onItemFailure: 'fail-fast' | 'continue' | 'abort-remaining' = 'continue',
	): Promise<void> {
		if (items.length === 0) {
			// No items to process -- complete parent immediately with empty results
			await this.completeParent(parentStepExecution, []);
			return;
		}

		// Store batch metadata on the parent step
		const batchMeta = {
			itemCount: items.length,
			onItemFailure,
			completedCount: 0,
			failedCount: 0,
			results: new Array(items.length).fill(null) as (BatchItemResult | null)[],
		};

		await this.dataSource
			.getRepository(WorkflowStepExecution)
			.createQueryBuilder()
			.update(WorkflowStepExecution)
			.set({
				status: StepStatus.Waiting,
				metadata: batchMeta,
			} as Record<string, unknown>)
			.where('id = :id', { id: parentStepExecution.id })
			.execute();

		// Create child step executions
		const stepRepo = this.dataSource.getRepository(WorkflowStepExecution);

		for (let i = 0; i < items.length; i++) {
			const childStepId = graph.getBatchChildStepId(parentStepExecution.stepId, i);

			await stepRepo
				.createQueryBuilder()
				.insert()
				.into(WorkflowStepExecution)
				.values({
					executionId: parentStepExecution.executionId,
					stepId: childStepId,
					stepType: 'step',
					status: StepStatus.Queued,
					input: { item: items[i], index: i },
					parentStepExecutionId: parentStepExecution.id,
					metadata: {
						batchIndex: i,
						parentStepId: parentStepExecution.stepId,
						functionRef: `step_${parentStepExecution.stepId}`,
					},
				} as Record<string, unknown>)
				.orIgnore()
				.execute();
		}
	}

	/**
	 * Handle a child step completion. Aggregates results and checks if the
	 * batch is complete.
	 *
	 * @returns true if the batch is now complete (all children done or aborted)
	 */
	async handleChildCompletion(
		parentStepExecutionId: string,
		childIndex: number,
		result: BatchItemResult,
	): Promise<{ complete: boolean; results?: BatchItemResult[] }> {
		// Atomic update using PostgreSQL jsonb_set + increment to avoid race conditions.
		// Multiple children can complete concurrently — each atomically updates its slot
		// and increments the counter in a single query.
		const resultJson = JSON.stringify(result);
		const isFailed = result.status === 'rejected' ? 1 : 0;

		await this.dataSource.query(
			`UPDATE workflow_step_execution
			 SET metadata = jsonb_set(
				jsonb_set(
					jsonb_set(
						metadata,
						'{results,${childIndex}}',
						$1::jsonb
					),
					'{completedCount}',
					to_jsonb((metadata->>'completedCount')::int + 1)
				),
				'{failedCount}',
				to_jsonb((metadata->>'failedCount')::int + $2)
			 )
			 WHERE id = $3`,
			[resultJson, isFailed, parentStepExecutionId],
		);

		// Re-read the parent to check if batch is now complete
		const parentStep = await this.dataSource
			.getRepository(WorkflowStepExecution)
			.findOneByOrFail({ id: parentStepExecutionId });

		const meta = parentStep.metadata as unknown as {
			itemCount: number;
			onItemFailure: string;
			completedCount: number;
			failedCount: number;
			results: (BatchItemResult | null)[];
		};

		const onItemFailure = meta.onItemFailure || 'continue';

		// Check failure strategies
		if (result.status === 'rejected' && onItemFailure === 'fail-fast') {
			await this.failParent(parentStep, meta.results, result.reason);
			return { complete: true, results: meta.results as BatchItemResult[] };
		}

		if (result.status === 'rejected' && onItemFailure === 'abort-remaining') {
			for (let i = 0; i < meta.results.length; i++) {
				if (meta.results[i] === null) {
					meta.results[i] = {
						status: 'rejected',
						reason: { message: 'Aborted: previous item failed' },
					};
				}
			}
			await this.completeParent(parentStep, meta.results as BatchItemResult[]);
			return { complete: true, results: meta.results as BatchItemResult[] };
		}

		// Check if all children are done
		if (meta.completedCount >= meta.itemCount) {
			await this.completeParent(parentStep, meta.results as BatchItemResult[]);
			return { complete: true, results: meta.results as BatchItemResult[] };
		}

		return { complete: false };
	}

	private async completeParent(
		parentStep: WorkflowStepExecution,
		results: BatchItemResult[],
	): Promise<void> {
		await this.dataSource
			.getRepository(WorkflowStepExecution)
			.createQueryBuilder()
			.update(WorkflowStepExecution)
			.set({
				status: StepStatus.Completed,
				output: results,
				completedAt: new Date(),
			} as Record<string, unknown>)
			.where('id = :id', { id: parentStep.id })
			.execute();

		this.eventBus.emit({
			type: 'step:completed',
			executionId: parentStep.executionId,
			stepId: parentStep.stepId,
			output: results,
			durationMs: 0,
		});
	}

	private async failParent(
		parentStep: WorkflowStepExecution,
		results: (BatchItemResult | null)[],
		error?: { message: string; stack?: string },
	): Promise<void> {
		const errorData = {
			message: error?.message ?? 'Batch item failed',
			code: 'BATCH_ITEM_FAILED',
			category: 'step' as const,
			retriable: false,
			batchResults: results,
		};

		await this.dataSource
			.getRepository(WorkflowStepExecution)
			.createQueryBuilder()
			.update(WorkflowStepExecution)
			.set({
				status: StepStatus.Failed,
				error: errorData,
				completedAt: new Date(),
			})
			.where('id = :id', { id: parentStep.id })
			.execute();

		this.eventBus.emit({
			type: 'step:failed',
			executionId: parentStep.executionId,
			stepId: parentStep.stepId,
			error: errorData,
		});
	}
}
