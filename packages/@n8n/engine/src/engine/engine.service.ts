import type { DataSource } from '@n8n/typeorm';

import { WorkflowGraph } from '../graph/workflow-graph';
import type { WorkflowGraphData } from '../graph/graph.types';
import type { WorkflowEntity } from '../database/entities/workflow.entity';
import { WorkflowExecution } from '../database/entities/workflow-execution.entity';
import { WorkflowStepExecution } from '../database/entities/workflow-step-execution.entity';
import { ExecutionStatus, StepStatus, StepType } from '../database/enums';
import type { EngineEventBus } from './event-bus.service';
import type { StepPlannerService } from './step-planner.service';

export class EngineService {
	constructor(
		private readonly dataSource: DataSource,
		private readonly eventBus: EngineEventBus,
		private readonly stepPlanner: StepPlannerService,
	) {}

	async startExecution(
		workflowId: string,
		triggerData?: unknown,
		mode: string = 'production',
		version?: number,
	): Promise<string> {
		const workflowRepo = this.dataSource.getRepository('WorkflowEntity');

		// Fetch latest version (or specific version if pinned)
		const queryBuilder = workflowRepo
			.createQueryBuilder('w')
			.where('w.id = :id', { id: workflowId });

		if (version !== undefined) {
			queryBuilder.andWhere('w.version = :version', { version });
		}

		const workflow = (await queryBuilder
			.orderBy('w.version', 'DESC')
			.limit(1)
			.getOneOrFail()) as WorkflowEntity;

		// Create workflow_execution record with status=running
		const executionResult = await this.dataSource
			.getRepository(WorkflowExecution)
			.createQueryBuilder()
			.insert()
			.into(WorkflowExecution)
			.values({
				workflowId,
				workflowVersion: workflow.version,
				status: ExecutionStatus.Running,
				mode,
				startedAt: new Date(),
			})
			.returning('id')
			.execute();

		const executionId = executionResult.raw[0].id as string;

		// Materialize trigger as completed step execution with output=triggerData
		const graphData = workflow.graph as WorkflowGraphData;

		// Ensure graph has a trigger node (older saved workflows may lack one)
		if (!graphData.nodes.some((n) => n.type === 'trigger')) {
			graphData.nodes.unshift({
				id: 'trigger',
				name: 'Manual Trigger',
				type: 'trigger',
				stepFunctionRef: 'step_trigger',
				config: { name: 'Manual Trigger' },
			});
		}

		const graph = new WorkflowGraph(graphData);
		const triggerNode = graph.getTriggerNode();

		// TypeORM's _QueryDeepPartialEntity rejects null for jsonb columns,
		// but null is a valid value for PostgreSQL jsonb. Cast the values object.
		await this.dataSource
			.getRepository(WorkflowStepExecution)
			.createQueryBuilder()
			.insert()
			.into(WorkflowStepExecution)
			.values({
				executionId,
				stepId: triggerNode.id,
				stepType: StepType.Trigger,
				status: StepStatus.Completed,
				output: triggerData ?? null,
				startedAt: new Date(),
				completedAt: new Date(),
				durationMs: 0,
			} as Record<string, unknown>)
			.execute();

		// Plan next steps from the trigger node
		await this.stepPlanner.planNextSteps(executionId, triggerNode.id, triggerData, graph);

		// Emit execution:started event
		this.eventBus.emit({
			type: 'execution:started',
			executionId,
		});

		return executionId;
	}

	async cancelExecution(executionId: string): Promise<void> {
		// 1. Set cancel_requested flag
		await this.dataSource
			.getRepository(WorkflowExecution)
			.createQueryBuilder()
			.update(WorkflowExecution)
			.set({ cancelRequested: true })
			.where('id = :id', { id: executionId })
			.execute();

		// 2. Cancel all non-terminal steps (queued, pending, waiting, retry_pending, waiting_approval)
		await this.dataSource
			.getRepository(WorkflowStepExecution)
			.createQueryBuilder()
			.update(WorkflowStepExecution)
			.set({
				status: StepStatus.Cancelled,
				completedAt: new Date(),
			})
			.where('"executionId" = :executionId', { executionId })
			.andWhere('status IN (:...statuses)', {
				statuses: [
					StepStatus.Queued,
					StepStatus.Pending,
					StepStatus.Waiting,
					StepStatus.RetryPending,
					StepStatus.WaitingApproval,
				],
			})
			.execute();

		// 3. Check if execution is now complete (all steps terminal)
		const nonTerminalCount = await this.dataSource
			.getRepository(WorkflowStepExecution)
			.createQueryBuilder('wse')
			.where('wse."executionId" = :executionId', { executionId })
			.andWhere('wse.status NOT IN (:...terminal)', {
				terminal: ['completed', 'failed', 'cancelled', 'skipped', 'cached'],
			})
			.getCount();

		if (nonTerminalCount === 0) {
			// All steps are terminal — finalize the execution as cancelled
			await this.dataSource
				.getRepository(WorkflowExecution)
				.createQueryBuilder()
				.update(WorkflowExecution)
				.set({
					status: ExecutionStatus.Cancelled,
					completedAt: new Date(),
				})
				.where('id = :id AND status NOT IN (:...terminal)', {
					id: executionId,
					terminal: ['completed', 'failed', 'cancelled'],
				})
				.execute();

			this.eventBus.emit({
				type: 'execution:cancelled',
				executionId,
			});
		}

		this.eventBus.emit({
			type: 'execution:cancel_requested',
			executionId,
		});
	}

	async pauseExecution(executionId: string, resumeAfter?: Date): Promise<void> {
		await this.dataSource
			.getRepository(WorkflowExecution)
			.createQueryBuilder()
			.update(WorkflowExecution)
			.set({
				pauseRequested: true,
				resumeAfter: resumeAfter ?? null,
			})
			.where('id = :id AND status = :status', {
				id: executionId,
				status: ExecutionStatus.Running,
			})
			.execute();

		this.eventBus.emit({
			type: 'execution:pause_requested',
			executionId,
			resumeAfter: resumeAfter?.toISOString(),
		});
	}

	async resumeExecution(executionId: string): Promise<void> {
		// Find ALL completed steps whose successors were never planned.
		// In a parallel workflow, multiple branches may have completed before
		// the pause took effect -- we need to resume planning from ALL of them.
		const completedSteps = await this.dataSource
			.getRepository(WorkflowStepExecution)
			.createQueryBuilder('wse')
			.where('wse.executionId = :executionId AND wse.status = :s', {
				executionId,
				s: StepStatus.Completed,
			})
			.andWhere('wse.parentStepExecutionId IS NULL')
			.getMany();

		// Set pause_requested = false, resume_after = null, status = running
		// Only if execution status is 'paused'
		await this.dataSource
			.getRepository(WorkflowExecution)
			.createQueryBuilder()
			.update(WorkflowExecution)
			.set({
				pauseRequested: false,
				resumeAfter: null,
				status: ExecutionStatus.Running,
			})
			.where('id = :id AND status = :status', {
				id: executionId,
				status: ExecutionStatus.Paused,
			})
			.execute();

		// Load workflow to build graph for planning
		const execution = await this.dataSource
			.getRepository(WorkflowExecution)
			.findOneByOrFail({ id: executionId });

		const workflow = (await this.dataSource
			.getRepository('WorkflowEntity')
			.createQueryBuilder('w')
			.where('w.id = :id AND w.version = :version', {
				id: execution.workflowId,
				version: execution.workflowVersion,
			})
			.getOneOrFail()) as WorkflowEntity;

		const graph = new WorkflowGraph(workflow.graph as WorkflowGraphData);

		// Resume planning from every completed step -- planNextSteps is idempotent
		// (ON CONFLICT DO NOTHING), so calling it multiple times is safe.
		for (const step of completedSteps) {
			await this.stepPlanner.planNextSteps(executionId, step.stepId, step.output, graph);
		}

		this.eventBus.emit({
			type: 'execution:resumed',
			executionId,
		});
	}
}
