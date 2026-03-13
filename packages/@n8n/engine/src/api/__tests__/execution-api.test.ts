import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import type { DataSource } from '@n8n/typeorm';
import type express from 'express';

import { createTestDataSource, cleanDatabase } from '../../../test/helpers';
import { EngineEventBus } from '../../engine/event-bus.service';
import { EngineService } from '../../engine/engine.service';
import { StepProcessorService } from '../../engine/step-processor.service';
import { StepPlannerService } from '../../engine/step-planner.service';
import { CompletionService } from '../../engine/completion.service';
import { BroadcasterService } from '../../engine/broadcaster.service';
import { registerEventHandlers } from '../../engine/event-handlers';
import { TranspilerService } from '../../transpiler/transpiler.service';
import { WorkflowExecution } from '../../database/entities/workflow-execution.entity';
import { ExecutionStatus } from '../../database/enums';
import { createApp } from '../server';

const SAMPLE_WORKFLOW_CODE = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Test Workflow',
	async run(ctx) {
		const data = await ctx.step({ name: 'greet' }, async () => {
			return { message: 'Hello!' };
		});
		const result = await ctx.step({ name: 'format' }, async () => {
			return { formatted: data.message + ' World' };
		});
		return result;
	},
});
`;

describe.skipIf(!process.env.DATABASE_URL)('Execution API', () => {
	let dataSource: DataSource;
	let app: express.Application;
	let eventBus: EngineEventBus;
	let workflowId: string;

	beforeAll(async () => {
		dataSource = await createTestDataSource();

		eventBus = new EngineEventBus();
		const transpiler = new TranspilerService();
		const stepPlanner = new StepPlannerService(dataSource);
		const completionService = new CompletionService(dataSource, eventBus);
		const stepProcessor = new StepProcessorService(dataSource, eventBus);
		const engineService = new EngineService(dataSource, eventBus, stepPlanner);
		const broadcaster = new BroadcasterService(eventBus);

		// Register event handlers so step:completed triggers planning
		registerEventHandlers(eventBus, dataSource, stepPlanner, completionService);

		app = createApp({
			dataSource,
			engineService,
			stepProcessor,
			broadcaster,
			eventBus,
			transpiler,
		});

		// Create a workflow to use in execution tests
		const createRes = await request(app)
			.post('/api/workflows')
			.send({ name: 'Test Workflow', code: SAMPLE_WORKFLOW_CODE })
			.expect(201);

		workflowId = createRes.body.id as string;
	});

	afterEach(async () => {
		// Clean only executions and steps, keep the workflow
		const { WorkflowStepExecution } = await import(
			'../../database/entities/workflow-step-execution.entity'
		);
		await dataSource.getRepository(WorkflowStepExecution).delete({});
		await dataSource.getRepository(WorkflowExecution).delete({});
	});

	afterAll(async () => {
		await cleanDatabase(dataSource);
		eventBus.removeAllListeners();
		await dataSource.destroy();
	});

	// -------------------------------------------------------------------
	// POST /api/workflow-executions
	// -------------------------------------------------------------------

	describe('POST /api/workflow-executions', () => {
		it('starts execution and returns executionId', async () => {
			const res = await request(app)
				.post('/api/workflow-executions')
				.send({ workflowId })
				.expect(201);

			expect(res.body.executionId).toBeDefined();
			expect(res.body.status).toBe('running');
		});

		it('starts execution with trigger data', async () => {
			const res = await request(app)
				.post('/api/workflow-executions')
				.send({
					workflowId,
					triggerData: { key: 'value' },
					mode: 'manual',
				})
				.expect(201);

			expect(res.body.executionId).toBeDefined();

			// Verify the execution was created
			const execution = await dataSource
				.getRepository(WorkflowExecution)
				.findOneBy({ id: res.body.executionId as string });

			expect(execution).not.toBeNull();
			expect(execution!.mode).toBe('manual');
		});

		it('returns 400 when workflowId is missing', async () => {
			await request(app).post('/api/workflow-executions').send({}).expect(400);
		});
	});

	// -------------------------------------------------------------------
	// GET /api/workflow-executions/:id
	// -------------------------------------------------------------------

	describe('GET /api/workflow-executions/:id', () => {
		it('returns execution with status', async () => {
			const createRes = await request(app)
				.post('/api/workflow-executions')
				.send({ workflowId })
				.expect(201);

			const executionId = createRes.body.executionId as string;

			const getRes = await request(app).get(`/api/workflow-executions/${executionId}`).expect(200);

			expect(getRes.body.id).toBe(executionId);
			expect(getRes.body.workflowId).toBe(workflowId);
			expect(getRes.body.status).toBe('running');
			expect(getRes.body.startedAt).toBeDefined();
			expect(getRes.body.cancelRequested).toBe(false);
			expect(getRes.body.pauseRequested).toBe(false);
		});

		it('returns 404 for non-existent execution', async () => {
			await request(app)
				.get('/api/workflow-executions/00000000-0000-0000-0000-000000000000')
				.expect(404);
		});
	});

	// -------------------------------------------------------------------
	// GET /api/workflow-executions/:id/steps
	// -------------------------------------------------------------------

	describe('GET /api/workflow-executions/:id/steps', () => {
		it('returns step executions for an execution', async () => {
			const createRes = await request(app)
				.post('/api/workflow-executions')
				.send({ workflowId, triggerData: { value: 42 } })
				.expect(201);

			const executionId = createRes.body.executionId as string;

			const stepsRes = await request(app)
				.get(`/api/workflow-executions/${executionId}/steps`)
				.expect(200);

			// Should have trigger step (completed) + planned successor steps
			expect(stepsRes.body.length).toBeGreaterThanOrEqual(1);

			// The trigger step should be completed
			const triggerStep = stepsRes.body.find((s: { stepType: string }) => s.stepType === 'trigger');
			expect(triggerStep).toBeDefined();
			expect(triggerStep.status).toBe('completed');
		});
	});

	// -------------------------------------------------------------------
	// GET /api/workflow-executions (list)
	// -------------------------------------------------------------------

	describe('GET /api/workflow-executions', () => {
		it('lists executions sorted by createdAt DESC', async () => {
			// Create two executions
			await request(app).post('/api/workflow-executions').send({ workflowId }).expect(201);

			await request(app).post('/api/workflow-executions').send({ workflowId }).expect(201);

			const listRes = await request(app).get('/api/workflow-executions').expect(200);

			expect(listRes.body.length).toBe(2);
			// DESC order: second created should be first
			const dates = listRes.body.map((e: { createdAt: string }) => new Date(e.createdAt).getTime());
			expect(dates[0]).toBeGreaterThanOrEqual(dates[1]);
		});

		it('filters by workflowId', async () => {
			await request(app).post('/api/workflow-executions').send({ workflowId }).expect(201);

			const listRes = await request(app)
				.get(`/api/workflow-executions?workflowId=${workflowId}`)
				.expect(200);

			expect(listRes.body.length).toBeGreaterThanOrEqual(1);
			for (const e of listRes.body) {
				expect(e.workflowId).toBe(workflowId);
			}
		});

		it('filters by status', async () => {
			await request(app).post('/api/workflow-executions').send({ workflowId }).expect(201);

			const listRes = await request(app).get('/api/workflow-executions?status=running').expect(200);

			for (const e of listRes.body) {
				expect(e.status).toBe('running');
			}
		});
	});

	// -------------------------------------------------------------------
	// POST /api/workflow-executions/:id/cancel
	// -------------------------------------------------------------------

	describe('POST /api/workflow-executions/:id/cancel', () => {
		it('sets cancel_requested on the execution', async () => {
			const createRes = await request(app)
				.post('/api/workflow-executions')
				.send({ workflowId })
				.expect(201);

			const executionId = createRes.body.executionId as string;

			const cancelRes = await request(app)
				.post(`/api/workflow-executions/${executionId}/cancel`)
				.expect(200);

			expect(cancelRes.body.cancelRequested).toBe(true);

			// Verify in DB
			const execution = await dataSource
				.getRepository(WorkflowExecution)
				.findOneBy({ id: executionId });

			expect(execution!.cancelRequested).toBe(true);
		});

		it('returns 404 for non-existent execution', async () => {
			await request(app)
				.post('/api/workflow-executions/00000000-0000-0000-0000-000000000000/cancel')
				.expect(404);
		});
	});

	// -------------------------------------------------------------------
	// POST /api/workflow-executions/:id/pause
	// -------------------------------------------------------------------

	describe('POST /api/workflow-executions/:id/pause', () => {
		it('sets pause_requested on a running execution', async () => {
			const createRes = await request(app)
				.post('/api/workflow-executions')
				.send({ workflowId })
				.expect(201);

			const executionId = createRes.body.executionId as string;

			const pauseRes = await request(app)
				.post(`/api/workflow-executions/${executionId}/pause`)
				.expect(200);

			expect(pauseRes.body.status).toBe('paused');
			expect(pauseRes.body.resumeAfter).toBeNull();
		});

		it('sets pause with resumeAfter', async () => {
			const createRes = await request(app)
				.post('/api/workflow-executions')
				.send({ workflowId })
				.expect(201);

			const executionId = createRes.body.executionId as string;
			const resumeAfter = new Date(Date.now() + 60_000).toISOString();

			const pauseRes = await request(app)
				.post(`/api/workflow-executions/${executionId}/pause`)
				.send({ resumeAfter })
				.expect(200);

			expect(pauseRes.body.resumeAfter).toBe(resumeAfter);
		});

		it('returns 409 when execution is not running', async () => {
			const createRes = await request(app)
				.post('/api/workflow-executions')
				.send({ workflowId })
				.expect(201);

			const executionId = createRes.body.executionId as string;

			// Manually set to completed
			await dataSource
				.getRepository(WorkflowExecution)
				.update(executionId, { status: ExecutionStatus.Completed });

			await request(app).post(`/api/workflow-executions/${executionId}/pause`).expect(409);
		});
	});

	// -------------------------------------------------------------------
	// POST /api/workflow-executions/:id/resume
	// -------------------------------------------------------------------

	describe('POST /api/workflow-executions/:id/resume', () => {
		it('resumes a paused execution', async () => {
			const createRes = await request(app)
				.post('/api/workflow-executions')
				.send({ workflowId })
				.expect(201);

			const executionId = createRes.body.executionId as string;

			// First pause it (set directly via DB since pauseExecution
			// only sets the flag; the event handler transitions to 'paused')
			await dataSource.getRepository(WorkflowExecution).update(executionId, {
				status: ExecutionStatus.Paused,
				pauseRequested: true,
			});

			const resumeRes = await request(app)
				.post(`/api/workflow-executions/${executionId}/resume`)
				.expect(200);

			expect(resumeRes.body.status).toBe('running');
		});

		it('returns 404 for non-existent execution', async () => {
			await request(app)
				.post('/api/workflow-executions/00000000-0000-0000-0000-000000000000/resume')
				.expect(404);
		});
	});

	// -------------------------------------------------------------------
	// DELETE /api/workflow-executions/:id
	// -------------------------------------------------------------------

	describe('DELETE /api/workflow-executions/:id', () => {
		it('deletes execution and its step executions', async () => {
			const createRes = await request(app)
				.post('/api/workflow-executions')
				.send({ workflowId })
				.expect(201);

			const executionId = createRes.body.executionId as string;

			const deleteRes = await request(app)
				.delete(`/api/workflow-executions/${executionId}`)
				.expect(200);

			expect(deleteRes.body.deleted).toBe(true);

			// Verify execution is gone
			await request(app).get(`/api/workflow-executions/${executionId}`).expect(404);
		});

		it('returns 404 for non-existent execution', async () => {
			await request(app)
				.delete('/api/workflow-executions/00000000-0000-0000-0000-000000000000')
				.expect(404);
		});
	});
});
