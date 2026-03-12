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
import { WebhookEntity } from '../../src/database/entities/webhook.entity';
import { createApp } from '../../src/api/server';

const WEBHOOK_WORKFLOW_CODE = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Webhook Echo',
	async run(ctx) {
		const result = await ctx.step({ name: 'process' }, async () => {
			return { echo: true, input: ctx.triggerData };
		});
		return result;
	},
});
`;

const RESPOND_WITH_NODE_CODE = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Webhook RespondWithNode',
	async run(ctx) {
		const processed = await ctx.step({ name: 'process' }, async () => {
			return { processed: true };
		});
		const respond = await ctx.step({ name: 'respond' }, async () => {
			await ctx.respondToWebhook({
				statusCode: 201,
				body: { custom: 'response', data: processed.processed },
				headers: { 'X-Custom': 'header-value' },
			});
			return { responded: true };
		});
		return respond;
	},
});
`;

describe.skipIf(!process.env.DATABASE_URL)('Webhook', () => {
	let dataSource: DataSource;
	let app: express.Application;
	let eventBus: EngineEventBus;
	let queue: StepQueueService;
	let transpiler: TranspilerService;

	beforeAll(async () => {
		dataSource = await createTestDataSource();

		eventBus = new EngineEventBus();
		transpiler = new TranspilerService();
		const stepPlanner = new StepPlannerService(dataSource);
		const completionService = new CompletionService(dataSource, eventBus);
		const stepProcessor = new StepProcessorService(dataSource, eventBus);
		const engineService = new EngineService(dataSource, eventBus, stepPlanner);
		const broadcaster = new BroadcasterService(eventBus);

		registerEventHandlers(eventBus, dataSource, stepPlanner, completionService);

		// Start queue poller for step execution
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
		// Re-register event handlers since we removed all listeners
		const stepPlanner = new StepPlannerService(dataSource);
		const completionService = new CompletionService(dataSource, eventBus);
		registerEventHandlers(eventBus, dataSource, stepPlanner, completionService);
	});

	afterAll(async () => {
		queue.stop();
		eventBus.removeAllListeners();
		await dataSource.destroy();
	});

	/**
	 * Helper: create a workflow with webhook triggers and activate it.
	 * Returns the workflow ID.
	 */
	async function createAndActivateWebhookWorkflow(
		code: string,
		triggers: Array<{
			type: string;
			config: { path: string; method: string; responseMode?: string };
		}>,
		name = 'Webhook Workflow',
	): Promise<string> {
		const createRes = await request(app)
			.post('/api/workflows')
			.send({ name, code, triggers })
			.expect(201);

		const workflowId = createRes.body.id as string;

		await request(app).post(`/api/workflows/${workflowId}/activate`).expect(200);

		return workflowId;
	}

	// -----------------------------------------------------------------------
	// Webhook -- Response modes
	// -----------------------------------------------------------------------

	describe('Webhook -- Response modes', () => {
		it('lastNode: webhook waits for execution to complete and returns last step output', async () => {
			await createAndActivateWebhookWorkflow(WEBHOOK_WORKFLOW_CODE, [
				{
					type: 'webhook',
					config: {
						path: '/echo-last',
						method: 'POST',
						responseMode: 'lastNode',
					},
				},
			]);

			const res = await request(app)
				.post('/webhook/echo-last')
				.send({ hello: 'world' })
				.expect(200);

			// lastNode mode returns the execution result directly
			expect(res.body).toBeDefined();
			expect(res.body.echo).toBe(true);
		});

		it('respondImmediately: webhook returns 202 immediately, execution continues', async () => {
			await createAndActivateWebhookWorkflow(WEBHOOK_WORKFLOW_CODE, [
				{
					type: 'webhook',
					config: {
						path: '/echo-immediate',
						method: 'POST',
						responseMode: 'respondImmediately',
					},
				},
			]);

			const res = await request(app)
				.post('/webhook/echo-immediate')
				.send({ fast: true })
				.expect(202);

			expect(res.body.executionId).toBeDefined();
			expect(res.body.status).toBe('running');
		});

		it('respondWithNode: webhook waits for ctx.respondToWebhook() call', async () => {
			await createAndActivateWebhookWorkflow(RESPOND_WITH_NODE_CODE, [
				{
					type: 'webhook',
					config: {
						path: '/custom-response',
						method: 'POST',
						responseMode: 'respondWithNode',
					},
				},
			]);

			const res = await request(app)
				.post('/webhook/custom-response')
				.send({ data: 'test' })
				.expect(201);

			expect(res.body.custom).toBe('response');
			expect(res.body.data).toBe(true);
			expect(res.headers['x-custom']).toBe('header-value');
		});

		it('allData: webhook waits for completion and returns result wrapped', async () => {
			await createAndActivateWebhookWorkflow(WEBHOOK_WORKFLOW_CODE, [
				{
					type: 'webhook',
					config: {
						path: '/echo-all',
						method: 'POST',
						responseMode: 'allData',
					},
				},
			]);

			const res = await request(app).post('/webhook/echo-all').send({ all: true }).expect(200);

			// allData mode wraps the result
			expect(res.body.result).toBeDefined();
		});

		it('unregistered path returns 404', async () => {
			await request(app).post('/webhook/non-existent-path').send({}).expect(404);
		});

		it('wrong HTTP method returns 404', async () => {
			await createAndActivateWebhookWorkflow(WEBHOOK_WORKFLOW_CODE, [
				{
					type: 'webhook',
					config: {
						path: '/post-only',
						method: 'POST',
					},
				},
			]);

			// Send a GET request to a POST-only webhook
			await request(app).get('/webhook/post-only').expect(404);
		});
	});

	// -----------------------------------------------------------------------
	// Webhook -- Input data
	// -----------------------------------------------------------------------

	describe('Webhook -- Input data', () => {
		it('trigger step output contains body, headers, query, method, path', async () => {
			await createAndActivateWebhookWorkflow(WEBHOOK_WORKFLOW_CODE, [
				{
					type: 'webhook',
					config: {
						path: '/input-check',
						method: 'POST',
						responseMode: 'lastNode',
					},
				},
			]);

			const res = await request(app)
				.post('/webhook/input-check?key=value')
				.set('X-Test-Header', 'test-value')
				.send({ payload: 'data' })
				.expect(200);

			// The execution should have a trigger step whose output contains
			// the webhook request data. We check the input field of the
			// first step to verify trigger data was passed through.
			expect(res.body).toBeDefined();
			// The step function receives ctx.triggerData which comes from
			// the trigger step's output
			expect(res.body.input).toBeDefined();
			expect(res.body.input.body).toEqual({ payload: 'data' });
			expect(res.body.input.method).toBe('POST');
			expect(res.body.input.path).toBe('input-check');
		});
	});

	// -----------------------------------------------------------------------
	// Webhook -- Registration
	// -----------------------------------------------------------------------

	describe('Webhook -- Registration', () => {
		it('activate workflow creates webhook record', async () => {
			const createRes = await request(app)
				.post('/api/workflows')
				.send({
					name: 'Webhook Reg Test',
					code: WEBHOOK_WORKFLOW_CODE,
					triggers: [
						{
							type: 'webhook',
							config: { path: '/reg-test', method: 'POST' },
						},
					],
				})
				.expect(201);

			const workflowId = createRes.body.id as string;

			// Before activation: no webhook records
			let webhooks = await dataSource.getRepository(WebhookEntity).findBy({ workflowId });
			expect(webhooks).toHaveLength(0);

			// Activate
			await request(app).post(`/api/workflows/${workflowId}/activate`).expect(200);

			// After activation: webhook record exists
			webhooks = await dataSource.getRepository(WebhookEntity).findBy({ workflowId });
			expect(webhooks).toHaveLength(1);
			expect(webhooks[0].method).toBe('POST');
			expect(webhooks[0].path).toBe('reg-test');
		});

		it('deactivate workflow deletes webhook record', async () => {
			const createRes = await request(app)
				.post('/api/workflows')
				.send({
					name: 'Webhook Dereg Test',
					code: WEBHOOK_WORKFLOW_CODE,
					triggers: [
						{
							type: 'webhook',
							config: { path: '/dereg-test', method: 'POST' },
						},
					],
				})
				.expect(201);

			const workflowId = createRes.body.id as string;

			// Activate then deactivate
			await request(app).post(`/api/workflows/${workflowId}/activate`).expect(200);

			let webhooks = await dataSource.getRepository(WebhookEntity).findBy({ workflowId });
			expect(webhooks).toHaveLength(1);

			await request(app).post(`/api/workflows/${workflowId}/deactivate`).expect(200);

			webhooks = await dataSource.getRepository(WebhookEntity).findBy({ workflowId });
			expect(webhooks).toHaveLength(0);
		});

		it('duplicate (method, path) is handled gracefully with orIgnore', async () => {
			// Create two workflows with the same webhook path/method
			const createRes1 = await request(app)
				.post('/api/workflows')
				.send({
					name: 'Webhook A',
					code: WEBHOOK_WORKFLOW_CODE,
					triggers: [
						{
							type: 'webhook',
							config: { path: '/dup-path', method: 'POST' },
						},
					],
				})
				.expect(201);

			const createRes2 = await request(app)
				.post('/api/workflows')
				.send({
					name: 'Webhook B',
					code: WEBHOOK_WORKFLOW_CODE,
					triggers: [
						{
							type: 'webhook',
							config: { path: '/dup-path', method: 'POST' },
						},
					],
				})
				.expect(201);

			const wfId1 = createRes1.body.id as string;
			const wfId2 = createRes2.body.id as string;

			// Activate first -- should succeed
			await request(app).post(`/api/workflows/${wfId1}/activate`).expect(200);

			// Activate second -- should succeed (orIgnore on duplicate)
			// The activate endpoint uses INSERT ... ON CONFLICT DO NOTHING
			await request(app).post(`/api/workflows/${wfId2}/activate`).expect(200);

			// Only one webhook record should exist for this path/method
			const webhooks = await dataSource.getRepository(WebhookEntity).find({
				where: { method: 'POST', path: 'dup-path' },
			});
			expect(webhooks).toHaveLength(1);
		});
	});
});
