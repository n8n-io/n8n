import type { DataSource } from '@n8n/typeorm';

import type { EngineEventBus } from './event-bus.service';
import type { StepPlannerService } from './step-planner.service';
import type { CompletionService } from './completion.service';
import type { BatchExecutorService } from './batch-executor.service';
import type {
	StepCompletedEvent,
	StepFailedEvent,
	StepCancelledEvent,
	ExecutionCompletedEvent,
	ExecutionFailedEvent,
} from './event-bus.types';
import { WorkflowGraph } from '../graph/workflow-graph';
import type { WorkflowGraphData } from '../graph/graph.types';
import { StepStatus, ExecutionStatus } from '../database/enums';
import type { WorkflowEntity } from '../database/entities/workflow.entity';
import { WorkflowExecution } from '../database/entities/workflow-execution.entity';
import { WorkflowStepExecution } from '../database/entities/workflow-step-execution.entity';

/**
 * Loads the workflow entity for a given execution (by executionId).
 * Returns the workflow at the pinned version.
 */
async function loadWorkflowForExecution(
	dataSource: DataSource,
	executionId: string,
): Promise<{ workflow: WorkflowEntity; execution: WorkflowExecution }> {
	const execution = await dataSource
		.getRepository(WorkflowExecution)
		.findOneByOrFail({ id: executionId });

	const workflow = (await dataSource
		.getRepository('WorkflowEntity')
		.createQueryBuilder('w')
		.where('w.id = :id AND w.version = :version', {
			id: execution.workflowId,
			version: execution.workflowVersion,
		})
		.getOneOrFail()) as WorkflowEntity;

	return { workflow, execution };
}

/**
 * Resolves a parent step when its child step completes.
 * Marks the parent as 'completed' with the child's output and emits step:completed
 * for the parent, which re-triggers the step:completed handler.
 */
async function resolveParentStep(
	dataSource: DataSource,
	eventBus: EngineEventBus,
	parentStepExecutionId: string,
	output: unknown,
): Promise<void> {
	const parentStep = await dataSource
		.getRepository(WorkflowStepExecution)
		.findOneByOrFail({ id: parentStepExecutionId });

	await dataSource
		.getRepository(WorkflowStepExecution)
		.createQueryBuilder()
		.update(WorkflowStepExecution)
		.set({
			status: StepStatus.Completed,
			output,
			completedAt: new Date(),
		} as Record<string, unknown>)
		.where('id = :id', { id: parentStepExecutionId })
		.execute();

	// Emit step:completed for the parent -- re-triggers the handler
	eventBus.emit({
		type: 'step:completed',
		executionId: parentStep.executionId,
		stepId: parentStep.stepId,
		output,
		durationMs: 0,
		// Parent steps don't have their own parent (unless nested)
		parentStepExecutionId: parentStep.parentStepExecutionId ?? undefined,
	});
}

/**
 * Fails a parent step when its child step fails.
 * Marks the parent as 'failed' and emits step:failed for the parent.
 */
async function failParentStep(
	dataSource: DataSource,
	eventBus: EngineEventBus,
	parentStepExecutionId: string,
): Promise<void> {
	const parentStep = await dataSource
		.getRepository(WorkflowStepExecution)
		.findOneByOrFail({ id: parentStepExecutionId });

	const errorData = {
		message: 'Child step failed',
		code: 'CHILD_STEP_FAILED',
		category: 'step' as const,
		retriable: false,
	};

	await dataSource
		.getRepository(WorkflowStepExecution)
		.createQueryBuilder()
		.update(WorkflowStepExecution)
		.set({
			status: StepStatus.Failed,
			error: errorData,
			completedAt: new Date(),
		})
		.where('id = :id', { id: parentStepExecutionId })
		.execute();

	eventBus.emit({
		type: 'step:failed',
		executionId: parentStep.executionId,
		stepId: parentStep.stepId,
		error: errorData,
		parentStepExecutionId: parentStep.parentStepExecutionId ?? undefined,
	});
}

/**
 * Marks an execution as paused.
 */
async function markExecutionPaused(dataSource: DataSource, executionId: string): Promise<void> {
	await dataSource
		.getRepository(WorkflowExecution)
		.createQueryBuilder()
		.update(WorkflowExecution)
		.set({ status: ExecutionStatus.Paused })
		.where('id = :id AND status = :status', {
			id: executionId,
			status: ExecutionStatus.Running,
		})
		.execute();
}

/**
 * Registers event handlers that drive the engine forward.
 * These handlers react to step lifecycle events and trigger:
 * - Planning of next steps
 * - Parent step resolution (for child steps)
 * - Execution completion checks
 * - Pause/cancel logic
 */
export function registerEventHandlers(
	eventBus: EngineEventBus,
	dataSource: DataSource,
	stepPlanner: StepPlannerService,
	completionService: CompletionService,
	batchExecutor?: BatchExecutorService,
): void {
	// step:completed handler
	eventBus.on<StepCompletedEvent>('step:completed', async (event) => {
		// If this is a child step (has parentStepExecutionId):
		if (event.parentStepExecutionId) {
			// Check if this is a batch child step by looking up step metadata
			if (batchExecutor) {
				const childStep = await dataSource
					.getRepository(WorkflowStepExecution)
					.createQueryBuilder('wse')
					.where('wse.executionId = :executionId AND wse.stepId = :stepId', {
						executionId: event.executionId,
						stepId: event.stepId,
					})
					.getOne();

				if (childStep?.metadata?.batchIndex !== undefined) {
					// Batch child: delegate to batch executor for aggregation
					await batchExecutor.handleChildCompletion(
						event.parentStepExecutionId,
						childStep.metadata.batchIndex as number,
						{ status: 'fulfilled', value: event.output },
					);
					return;
				}
			}

			// Regular (non-batch) child step: resolve parent directly
			await resolveParentStep(dataSource, eventBus, event.parentStepExecutionId, event.output);
			return;
		}

		const { workflow, execution } = await loadWorkflowForExecution(dataSource, event.executionId);
		const graph = new WorkflowGraph(workflow.graph as WorkflowGraphData);

		// Check for pause BEFORE planning next steps
		if (execution.pauseRequested) {
			// But first: check if this was the LAST step (no successors to plan).
			// If so, the execution is done -- don't pause a completed execution.
			const successors = graph.getSuccessors(event.stepId, event.output);
			if (successors.length === 0) {
				// No more steps -- check if execution is complete
				await completionService.checkExecutionComplete(event.executionId, graph);
				return;
			}
			await markExecutionPaused(dataSource, event.executionId);
			eventBus.emit({
				type: 'execution:paused',
				executionId: event.executionId,
				lastCompletedStepId: event.stepId,
			});
			return;
		}

		// Normal step completion -- plan successors
		await stepPlanner.planNextSteps(event.executionId, event.stepId, event.output, graph);
		await completionService.checkExecutionComplete(event.executionId, graph);
	});

	// step:failed handler
	eventBus.on<StepFailedEvent>('step:failed', async (event) => {
		// If child step -> check if batch child or regular child
		if (event.parentStepExecutionId) {
			if (batchExecutor) {
				const childStep = await dataSource
					.getRepository(WorkflowStepExecution)
					.createQueryBuilder('wse')
					.where('wse.executionId = :executionId AND wse.stepId = :stepId', {
						executionId: event.executionId,
						stepId: event.stepId,
					})
					.getOne();

				if (childStep?.metadata?.batchIndex !== undefined) {
					// Batch child: delegate to batch executor for aggregation
					await batchExecutor.handleChildCompletion(
						event.parentStepExecutionId,
						childStep.metadata.batchIndex as number,
						{
							status: 'rejected',
							reason: {
								message: event.error?.message ?? 'Batch item failed',
								stack: event.error?.stack,
							},
						},
					);
					return;
				}
			}

			// Regular (non-batch) child step: fail parent directly
			await failParentStep(dataSource, eventBus, event.parentStepExecutionId);
			return;
		}

		// Check for error handlers (catch blocks) before failing the execution
		const { workflow } = await loadWorkflowForExecution(dataSource, event.executionId);
		const graph = new WorkflowGraph(workflow.graph as WorkflowGraphData);
		const errorHandlers = graph.getErrorHandlers(event.stepId);

		if (errorHandlers.length > 0) {
			// Route to catch handler steps instead of failing the execution.
			// Pass the error as input so the catch handler can access it via ctx.error.
			const errorPayload = event.error ?? { message: 'Unknown error' };

			for (const handler of errorHandlers) {
				// Gather normal input from data predecessors, then add the error
				const input = await stepPlanner.gatherStepInput(event.executionId, handler.id, graph);
				(input as Record<string, unknown>).__error__ = errorPayload;

				await dataSource
					.getRepository(WorkflowStepExecution)
					.createQueryBuilder()
					.insert()
					.into(WorkflowStepExecution)
					.values({
						executionId: event.executionId,
						stepId: handler.id,
						stepType: handler.type,
						status: StepStatus.Queued,
						input,
					})
					.orIgnore()
					.execute();

				stepPlanner.onStepQueued?.();
			}
			return;
		}

		// FAIL FAST: immediately mark execution as failed and set cancel_requested
		// to prevent other branches' queued/waiting steps from being picked up.
		const executionError = { ...event.error, stepId: event.stepId };

		// Calculate metrics before marking as failed
		const execution = await dataSource
			.getRepository(WorkflowExecution)
			.findOneByOrFail({ id: event.executionId });
		const completedSteps = await dataSource
			.getRepository(WorkflowStepExecution)
			.createQueryBuilder('wse')
			.where('wse.executionId = :executionId AND wse.status IN (:...s)', {
				executionId: event.executionId,
				s: [StepStatus.Completed, StepStatus.Failed],
			})
			.getMany();
		const computeMs = completedSteps.reduce((sum, s) => sum + (s.durationMs ?? 0), 0);
		const wallMs = Date.now() - execution.startedAt.getTime();

		await dataSource
			.getRepository(WorkflowExecution)
			.createQueryBuilder()
			.update(WorkflowExecution)
			.set({
				status: ExecutionStatus.Failed,
				cancelRequested: true,
				error: executionError as Record<string, unknown>,
				completedAt: new Date(),
				durationMs: wallMs,
				computeMs,
				waitMs: wallMs - computeMs,
			})
			.where('id = :id AND status NOT IN (:...terminal)', {
				id: event.executionId,
				terminal: [ExecutionStatus.Completed, ExecutionStatus.Failed, ExecutionStatus.Cancelled],
			})
			.execute();

		eventBus.emit({
			type: 'execution:failed',
			executionId: event.executionId,
			error: executionError,
		});
	});

	// step:cancelled handler
	eventBus.on<StepCancelledEvent>('step:cancelled', async (event) => {
		const { workflow } = await loadWorkflowForExecution(dataSource, event.executionId);
		const graph = new WorkflowGraph(workflow.graph as WorkflowGraphData);
		await completionService.checkExecutionComplete(event.executionId, graph);
	});

	// execution:completed handler — resolve parent steps waiting for child executions
	eventBus.on<ExecutionCompletedEvent>('execution:completed', async (event) => {
		await resolveWaitingParentSteps(dataSource, eventBus, event.executionId, event.result);
	});

	// execution:failed handler — fail parent steps waiting for child executions
	eventBus.on<ExecutionFailedEvent>('execution:failed', async (event) => {
		await failWaitingParentSteps(dataSource, eventBus, event.executionId);
	});
}

/**
 * When a child execution completes, find any parent step (in any execution)
 * that is waiting for this child execution (via metadata.childExecutionId),
 * and resolve it with the child's result.
 */
async function resolveWaitingParentSteps(
	dataSource: DataSource,
	eventBus: EngineEventBus,
	childExecutionId: string,
	result: unknown,
): Promise<void> {
	// Find all steps waiting for this child execution
	const waitingSteps = await dataSource
		.getRepository(WorkflowStepExecution)
		.createQueryBuilder('wse')
		.where("wse.status = :status AND wse.metadata->>'childExecutionId' = :childId", {
			status: StepStatus.Waiting,
			childId: childExecutionId,
		})
		.getMany();

	for (const parentStep of waitingSteps) {
		await dataSource
			.getRepository(WorkflowStepExecution)
			.createQueryBuilder()
			.update(WorkflowStepExecution)
			.set({
				status: StepStatus.Completed,
				output: result,
				completedAt: new Date(),
			} as Record<string, unknown>)
			.where('id = :id', { id: parentStep.id })
			.execute();

		eventBus.emit({
			type: 'step:completed',
			executionId: parentStep.executionId,
			stepId: parentStep.stepId,
			output: result,
			durationMs: 0,
			parentStepExecutionId: parentStep.parentStepExecutionId ?? undefined,
		});
	}
}

/**
 * When a child execution fails, find any parent step (in any execution)
 * that is waiting for this child execution, and mark it as failed.
 */
async function failWaitingParentSteps(
	dataSource: DataSource,
	eventBus: EngineEventBus,
	childExecutionId: string,
): Promise<void> {
	const waitingSteps = await dataSource
		.getRepository(WorkflowStepExecution)
		.createQueryBuilder('wse')
		.where("wse.status = :status AND wse.metadata->>'childExecutionId' = :childId", {
			status: StepStatus.Waiting,
			childId: childExecutionId,
		})
		.getMany();

	const errorData = {
		message: 'Child workflow execution failed',
		code: 'CHILD_WORKFLOW_FAILED',
		category: 'step' as const,
		retriable: false,
	};

	for (const parentStep of waitingSteps) {
		await dataSource
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

		eventBus.emit({
			type: 'step:failed',
			executionId: parentStep.executionId,
			stepId: parentStep.stepId,
			error: errorData,
			parentStepExecutionId: parentStep.parentStepExecutionId ?? undefined,
		});
	}
}
