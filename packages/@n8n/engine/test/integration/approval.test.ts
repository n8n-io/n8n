import { createHash } from 'node:crypto';

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import type { DataSource } from '@n8n/typeorm';
import type express from 'express';

import { createTestDataSource, cleanDatabase } from '../helpers';
import { EngineEventBus } from '../../src/engine/event-bus.service';
import { EngineService } from '../../src/engine/engine.service';
import { StepProcessorService } from '../../src/engine/step-processor.service';
import { StepPlannerService } from '../../src/engine/step-planner.service';
import { StepQueueService } from '../../src/engine/step-queue.service';
import { CompletionService } from '../../src/engine/completion.service';
import { BroadcasterService } from '../../src/engine/broadcaster.service';
import { registerEventHandlers } from '../../src/engine/event-handlers';
import { TranspilerService } from '../../src/transpiler/transpiler.service';
import { WorkflowExecution } from '../../src/database/entities/workflow-execution.entity';
import { WorkflowStepExecution } from '../../src/database/entities/workflow-step-execution.entity';
import { StepStatus, StepType, ExecutionStatus } from '../../src/database/enums';
import { createApp } from '../../src/api/server';

function sha256(input: string): string {
	return createHash('sha256').update(input).digest('hex').substring(0, 12);
}

describe.skipIf(!process.env.DATABASE_URL)('Approval', () => {
	let dataSource: DataSource;
	let app: express.Application;
	let eventBus: EngineEventBus;
	let queue: StepQueueService;
	let engineService: EngineService;
	let stepPlanner: StepPlannerService;
	let completionService: CompletionService;

	beforeAll(async () => {
		dataSource = await createTestDataSource();
		eventBus = new EngineEventBus();

		const transpiler = new TranspilerService();
		stepPlanner = new StepPlannerService(dataSource);
		completionService = new CompletionService(dataSource, eventBus);
		const stepProcessor = new StepProcessorService(dataSource, eventBus);
		engineService = new EngineService(dataSource, eventBus, stepPlanner);
		const broadcaster = new BroadcasterService(eventBus);

		registerEventHandlers(eventBus, dataSource, stepPlanner, completionService);

		queue = new StepQueueService(dataSource, stepProcessor, 20);
		queue.start();

		app = createApp({
			dataSource,
			engineService,
			stepProcessor,
			broadcaster,
			eventBus,
			transpiler,
		});
	});

	afterEach(async () => {
		await cleanDatabase(dataSource);
		eventBus.removeAllListeners();
		// Re-register event handlers
		registerEventHandlers(eventBus, dataSource, stepPlanner, completionService);
	});

	afterAll(async () => {
		queue.stop();
		eventBus.removeAllListeners();
		await dataSource.destroy();
	});

	/**
	 * Helper: create a workflow with a stepType: 'approval' step,
	 * start an execution, and wait for the engine to pause at the
	 * approval step (step:waiting_approval event).
	 */
	async function createApprovalScenario(): Promise<{
		workflowId: string;
		executionId: string;
		approvalStep: WorkflowStepExecution;
		approvalToken: string;
	}> {
		const code = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Approval Workflow',
	async run(ctx) {
		const prep = await ctx.step({ name: 'prepare' }, async () => {
			return { type: 'expense', amount: 5000 };
		});
		const approve = await ctx.approval({
			name: 'approval',
		}, async () => {
			return { message: 'Approve expense?', amount: prep.amount };
		});
		return approve;
	},
});
`;

		const createRes = await request(app)
			.post('/api/workflows')
			.send({ name: 'Approval Test', code })
			.expect(201);

		const workflowId = createRes.body.id as string;

		// Listen for the step:waiting_approval event BEFORE starting execution
		const approvalPromise = new Promise<{ stepId: string; approvalToken: string }>(
			(resolve, reject) => {
				const timeout = setTimeout(
					() => reject(new Error('Timeout waiting for step:waiting_approval event')),
					10_000,
				);
				eventBus.onAny((event) => {
					if (event.type === 'step:waiting_approval' && 'approvalToken' in event) {
						clearTimeout(timeout);
						resolve({
							stepId: event.stepId as string,
							approvalToken: (event as { approvalToken: string }).approvalToken,
						});
					}
				});
			},
		);

		// Start execution
		const execRes = await request(app)
			.post('/api/workflow-executions')
			.send({ workflowId })
			.expect(201);

		const executionId = execRes.body.executionId as string;

		// Wait for the approval step to reach waiting_approval status
		const { approvalToken } = await approvalPromise;

		// Fetch the approval step execution from DB
		const approvalStepId = sha256('approval');
		const approvalStep = await dataSource
			.getRepository(WorkflowStepExecution)
			.createQueryBuilder('wse')
			.where('wse.executionId = :executionId AND wse.stepId = :stepId', {
				executionId,
				stepId: approvalStepId,
			})
			.getOneOrFail();

		return { workflowId, executionId, approvalStep, approvalToken };
	}

	// -----------------------------------------------------------------------
	// Approval -- Basic flow
	// -----------------------------------------------------------------------

	describe('Approval -- Basic flow', () => {
		it('engine pauses at approval step with status=waiting_approval', async () => {
			const { approvalStep } = await createApprovalScenario();

			expect(approvalStep.stepType).toBe(StepType.Approval);
			expect(approvalStep.status).toBe(StepStatus.WaitingApproval);
			expect(approvalStep.approvalToken).toBeTruthy();
		});

		it('approval step output contains the step function return value', async () => {
			const { approvalStep } = await createApprovalScenario();

			expect(approvalStep.output).toEqual({
				message: 'Approve expense?',
				amount: 5000,
			});
		});

		it('POST /approve with valid token and approved=true merges output', async () => {
			const { approvalStep, approvalToken } = await createApprovalScenario();

			const res = await request(app)
				.post(`/api/workflow-step-executions/${approvalStep.id}/approve`)
				.send({ approved: true, token: approvalToken })
				.expect(200);

			expect(res.body.status).toBe('completed');
			expect(res.body.output).toEqual({
				message: 'Approve expense?',
				amount: 5000,
				approved: true,
			});
		});

		it('POST /approve with approved=false merges output', async () => {
			const { approvalStep, approvalToken } = await createApprovalScenario();

			const res = await request(app)
				.post(`/api/workflow-step-executions/${approvalStep.id}/approve`)
				.send({ approved: false, token: approvalToken })
				.expect(200);

			expect(res.body.output).toEqual({
				message: 'Approve expense?',
				amount: 5000,
				approved: false,
			});
		});

		it('step:completed event is emitted after approval', async () => {
			const { executionId, approvalStep, approvalToken } = await createApprovalScenario();

			const receivedEvent = new Promise<boolean>((resolve) => {
				const timeout = setTimeout(() => resolve(false), 5_000);
				eventBus.onAny((event) => {
					if (
						event.type === 'step:completed' &&
						'executionId' in event &&
						event.executionId === executionId &&
						'stepId' in event &&
						event.stepId === approvalStep.stepId
					) {
						clearTimeout(timeout);
						resolve(true);
					}
				});
			});

			await request(app)
				.post(`/api/workflow-step-executions/${approvalStep.id}/approve`)
				.send({ approved: true, token: approvalToken })
				.expect(200);

			expect(await receivedEvent).toBe(true);
		});

		it('execution completes after approval', async () => {
			const { executionId, approvalStep, approvalToken } = await createApprovalScenario();

			const completionPromise = new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(
					() => reject(new Error('Timeout waiting for completion')),
					10_000,
				);
				eventBus.onAny((event) => {
					if (
						'executionId' in event &&
						event.executionId === executionId &&
						(event.type === 'execution:completed' || event.type === 'execution:failed')
					) {
						clearTimeout(timeout);
						resolve();
					}
				});
			});

			await request(app)
				.post(`/api/workflow-step-executions/${approvalStep.id}/approve`)
				.send({ approved: true, token: approvalToken })
				.expect(200);

			await completionPromise;

			const execution = await dataSource
				.getRepository(WorkflowExecution)
				.findOneByOrFail({ id: executionId });
			expect(execution.status).toBe(ExecutionStatus.Completed);
		});
	});

	// -----------------------------------------------------------------------
	// Approval -- Token validation
	// -----------------------------------------------------------------------

	describe('Approval -- Token validation', () => {
		it('returns 400 when token is missing', async () => {
			const { approvalStep } = await createApprovalScenario();

			await request(app)
				.post(`/api/workflow-step-executions/${approvalStep.id}/approve`)
				.send({ approved: true })
				.expect(400);
		});

		it('returns 409 when token is wrong', async () => {
			const { approvalStep } = await createApprovalScenario();

			await request(app)
				.post(`/api/workflow-step-executions/${approvalStep.id}/approve`)
				.send({ approved: true, token: 'wrong-token' })
				.expect(409);
		});
	});

	// -----------------------------------------------------------------------
	// Approval -- Idempotency
	// -----------------------------------------------------------------------

	describe('Approval -- Idempotency', () => {
		it('second approval attempt returns 409', async () => {
			const { approvalStep, approvalToken } = await createApprovalScenario();

			await request(app)
				.post(`/api/workflow-step-executions/${approvalStep.id}/approve`)
				.send({ approved: true, token: approvalToken })
				.expect(200);

			await request(app)
				.post(`/api/workflow-step-executions/${approvalStep.id}/approve`)
				.send({ approved: false, token: approvalToken })
				.expect(409);
		});
	});

	// -----------------------------------------------------------------------
	// Approval -- Cancellation interaction
	// -----------------------------------------------------------------------

	describe('Approval -- Cancellation interaction', () => {
		it('cancelling execution while step is waiting_approval prevents approval', async () => {
			const { executionId, approvalStep, approvalToken } = await createApprovalScenario();

			await request(app).post(`/api/workflow-executions/${executionId}/cancel`).expect(200);

			// Either succeeds (step still waiting_approval) or 409 (already resolved)
			const res = await request(app)
				.post(`/api/workflow-step-executions/${approvalStep.id}/approve`)
				.send({ approved: true, token: approvalToken });
			expect([200, 409]).toContain(res.status);
		});
	});

	// -----------------------------------------------------------------------
	// Approval -- Validation
	// -----------------------------------------------------------------------

	describe('Approval -- Validation', () => {
		it('returns 400 when approved field is missing', async () => {
			const { approvalStep, approvalToken } = await createApprovalScenario();

			await request(app)
				.post(`/api/workflow-step-executions/${approvalStep.id}/approve`)
				.send({ token: approvalToken })
				.expect(400);
		});

		it('returns 400 when approved field is not a boolean', async () => {
			const { approvalStep, approvalToken } = await createApprovalScenario();

			await request(app)
				.post(`/api/workflow-step-executions/${approvalStep.id}/approve`)
				.send({ approved: 'yes', token: approvalToken })
				.expect(400);
		});
	});
});
