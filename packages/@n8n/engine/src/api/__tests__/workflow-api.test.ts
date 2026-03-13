import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import type { DataSource } from '@n8n/typeorm';
import type express from 'express';

import { createTestDataSource, cleanDatabase } from '../../../test/helpers';
import { EngineEventBus } from '../../engine/event-bus.service';
import { EngineService } from '../../engine/engine.service';
import { StepProcessorService } from '../../engine/step-processor.service';
import { StepPlannerService } from '../../engine/step-planner.service';
import { BroadcasterService } from '../../engine/broadcaster.service';
import { TranspilerService } from '../../transpiler/transpiler.service';
import { WebhookEntity } from '../../database/entities/webhook.entity';
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

const INVALID_WORKFLOW_CODE = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Bad Workflow',
	async run(ctx) {
		// No ctx.step() calls
	},
});
`;

const WEBHOOK_WORKFLOW_CODE = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Webhook Workflow',
	triggers: [],
	async run(ctx) {
		const data = await ctx.step({ name: 'process' }, async () => {
			return { ok: true };
		});
		return data;
	},
});
`;

describe.skipIf(!process.env.DATABASE_URL)('Workflow API', () => {
	let dataSource: DataSource;
	let app: express.Application;

	beforeAll(async () => {
		dataSource = await createTestDataSource();

		const eventBus = new EngineEventBus();
		const transpiler = new TranspilerService();
		const stepPlanner = new StepPlannerService(dataSource);
		const stepProcessor = new StepProcessorService(dataSource, eventBus);
		const engineService = new EngineService(dataSource, eventBus, stepPlanner);
		const broadcaster = new BroadcasterService(eventBus);

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
	});

	afterAll(async () => {
		await dataSource.destroy();
	});

	// -------------------------------------------------------------------
	// POST /api/workflows
	// -------------------------------------------------------------------

	describe('POST /api/workflows', () => {
		it('creates a workflow with version 1', async () => {
			const res = await request(app)
				.post('/api/workflows')
				.send({
					name: 'My Workflow',
					code: SAMPLE_WORKFLOW_CODE,
				})
				.expect(201);

			expect(res.body.id).toBeDefined();
			expect(res.body.version).toBe(1);
			expect(res.body.name).toBe('My Workflow');
			expect(res.body.graph).toBeDefined();
			expect(res.body.graph.nodes).toHaveLength(3);
			expect(res.body.active).toBe(false);
		});

		it('returns 422 with compilation errors for invalid code', async () => {
			const res = await request(app)
				.post('/api/workflows')
				.send({
					name: 'Bad Workflow',
					code: INVALID_WORKFLOW_CODE,
				})
				.expect(422);

			expect(res.body.errors).toBeDefined();
			expect(res.body.errors.length).toBeGreaterThan(0);
		});

		it('returns 400 when name is missing', async () => {
			await request(app).post('/api/workflows').send({ code: SAMPLE_WORKFLOW_CODE }).expect(400);
		});

		it('returns 400 when code is missing', async () => {
			await request(app).post('/api/workflows').send({ name: 'Test' }).expect(400);
		});
	});

	// -------------------------------------------------------------------
	// PUT /api/workflows/:id
	// -------------------------------------------------------------------

	describe('PUT /api/workflows/:id', () => {
		it('creates version 2 with updated graph', async () => {
			// Create initial workflow
			const createRes = await request(app)
				.post('/api/workflows')
				.send({ name: 'My Workflow', code: SAMPLE_WORKFLOW_CODE })
				.expect(201);

			const workflowId = createRes.body.id as string;

			// Update with new code
			const updatedCode = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Updated Workflow',
	async run(ctx) {
		const a = await ctx.step({ name: 'step-a' }, async () => ({ value: 1 }));
		const b = await ctx.step({ name: 'step-b' }, async () => ({ value: a.value + 1 }));
		const c = await ctx.step({ name: 'step-c' }, async () => ({ value: b.value + 1 }));
		return c;
	},
});
`;

			const updateRes = await request(app)
				.put(`/api/workflows/${workflowId}`)
				.send({ name: 'Updated Workflow', code: updatedCode })
				.expect(200);

			expect(updateRes.body.version).toBe(2);
			expect(updateRes.body.graph).toBeDefined();
			expect(updateRes.body.graph.nodes).toHaveLength(4);
		});

		it('returns 422 with compilation errors for invalid code', async () => {
			const createRes = await request(app)
				.post('/api/workflows')
				.send({ name: 'My Workflow', code: SAMPLE_WORKFLOW_CODE })
				.expect(201);

			const workflowId = createRes.body.id as string;

			const res = await request(app)
				.put(`/api/workflows/${workflowId}`)
				.send({ name: 'Bad', code: INVALID_WORKFLOW_CODE })
				.expect(422);

			expect(res.body.errors).toBeDefined();
			expect(res.body.errors.length).toBeGreaterThan(0);
		});

		it('returns 404 for non-existent workflow', async () => {
			await request(app)
				.put('/api/workflows/00000000-0000-0000-0000-000000000000')
				.send({ name: 'Test', code: SAMPLE_WORKFLOW_CODE })
				.expect(404);
		});
	});

	// -------------------------------------------------------------------
	// GET /api/workflows/:id
	// -------------------------------------------------------------------

	describe('GET /api/workflows/:id', () => {
		it('returns latest version by default', async () => {
			const createRes = await request(app)
				.post('/api/workflows')
				.send({ name: 'My Workflow', code: SAMPLE_WORKFLOW_CODE })
				.expect(201);

			const workflowId = createRes.body.id as string;

			// Create version 2
			await request(app)
				.put(`/api/workflows/${workflowId}`)
				.send({ name: 'Updated', code: SAMPLE_WORKFLOW_CODE })
				.expect(200);

			const getRes = await request(app).get(`/api/workflows/${workflowId}`).expect(200);

			expect(getRes.body.version).toBe(2);
			expect(getRes.body.name).toBe('Updated');
		});

		it('returns specific version with ?version=N', async () => {
			const createRes = await request(app)
				.post('/api/workflows')
				.send({ name: 'V1 Workflow', code: SAMPLE_WORKFLOW_CODE })
				.expect(201);

			const workflowId = createRes.body.id as string;

			// Create version 2
			await request(app)
				.put(`/api/workflows/${workflowId}`)
				.send({ name: 'V2 Workflow', code: SAMPLE_WORKFLOW_CODE })
				.expect(200);

			const getRes = await request(app).get(`/api/workflows/${workflowId}?version=1`).expect(200);

			expect(getRes.body.version).toBe(1);
			expect(getRes.body.name).toBe('V1 Workflow');
		});

		it('returns 404 for non-existent workflow', async () => {
			await request(app).get('/api/workflows/00000000-0000-0000-0000-000000000000').expect(404);
		});

		it('returns 404 for soft-deleted workflow', async () => {
			const createRes = await request(app)
				.post('/api/workflows')
				.send({ name: 'My Workflow', code: SAMPLE_WORKFLOW_CODE })
				.expect(201);

			const workflowId = createRes.body.id as string;

			await request(app).delete(`/api/workflows/${workflowId}`).expect(200);

			await request(app).get(`/api/workflows/${workflowId}`).expect(404);
		});
	});

	// -------------------------------------------------------------------
	// GET /api/workflows/:id/versions
	// -------------------------------------------------------------------

	describe('GET /api/workflows/:id/versions', () => {
		it('lists all versions', async () => {
			const createRes = await request(app)
				.post('/api/workflows')
				.send({ name: 'V1', code: SAMPLE_WORKFLOW_CODE })
				.expect(201);

			const workflowId = createRes.body.id as string;

			await request(app)
				.put(`/api/workflows/${workflowId}`)
				.send({ name: 'V2', code: SAMPLE_WORKFLOW_CODE })
				.expect(200);

			await request(app)
				.put(`/api/workflows/${workflowId}`)
				.send({ name: 'V3', code: SAMPLE_WORKFLOW_CODE })
				.expect(200);

			const versionsRes = await request(app)
				.get(`/api/workflows/${workflowId}/versions`)
				.expect(200);

			expect(versionsRes.body).toHaveLength(3);
			// Ordered DESC by version
			expect(versionsRes.body[0].version).toBe(3);
			expect(versionsRes.body[1].version).toBe(2);
			expect(versionsRes.body[2].version).toBe(1);

			// Each entry has expected fields
			for (const v of versionsRes.body) {
				expect(v.id).toBe(workflowId);
				expect(v.version).toBeDefined();
				expect(v.name).toBeDefined();
				expect(v.createdAt).toBeDefined();
			}
		});

		it('returns 404 for non-existent workflow', async () => {
			await request(app)
				.get('/api/workflows/00000000-0000-0000-0000-000000000000/versions')
				.expect(404);
		});
	});

	// -------------------------------------------------------------------
	// DELETE /api/workflows/:id
	// -------------------------------------------------------------------

	describe('DELETE /api/workflows/:id', () => {
		it('soft deletes workflow', async () => {
			const createRes = await request(app)
				.post('/api/workflows')
				.send({ name: 'My Workflow', code: SAMPLE_WORKFLOW_CODE })
				.expect(201);

			const workflowId = createRes.body.id as string;

			const deleteRes = await request(app).delete(`/api/workflows/${workflowId}`).expect(200);

			expect(deleteRes.body.deleted).toBe(true);

			// Verify GET returns 404
			await request(app).get(`/api/workflows/${workflowId}`).expect(404);
		});

		it('returns 404 for non-existent workflow', async () => {
			await request(app).delete('/api/workflows/00000000-0000-0000-0000-000000000000').expect(404);
		});
	});

	// -------------------------------------------------------------------
	// POST /api/workflows/:id/activate
	// -------------------------------------------------------------------

	describe('POST /api/workflows/:id/activate', () => {
		it('creates webhook records and marks workflow as active', async () => {
			const createRes = await request(app)
				.post('/api/workflows')
				.send({
					name: 'Webhook Workflow',
					code: WEBHOOK_WORKFLOW_CODE,
					triggers: [
						{
							type: 'webhook',
							config: { path: '/test-hook', method: 'POST' },
						},
					],
				})
				.expect(201);

			const workflowId = createRes.body.id as string;

			const activateRes = await request(app)
				.post(`/api/workflows/${workflowId}/activate`)
				.expect(200);

			expect(activateRes.body.active).toBe(true);

			// Verify webhook record was created
			const webhooks = await dataSource.getRepository(WebhookEntity).findBy({ workflowId });

			expect(webhooks).toHaveLength(1);
			expect(webhooks[0].method).toBe('POST');
			expect(webhooks[0].path).toBe('test-hook');
		});

		it('returns 404 for non-existent workflow', async () => {
			await request(app)
				.post('/api/workflows/00000000-0000-0000-0000-000000000000/activate')
				.expect(404);
		});
	});

	// -------------------------------------------------------------------
	// POST /api/workflows/:id/deactivate
	// -------------------------------------------------------------------

	describe('POST /api/workflows/:id/deactivate', () => {
		it('removes webhook records and marks workflow as inactive', async () => {
			const createRes = await request(app)
				.post('/api/workflows')
				.send({
					name: 'Webhook Workflow',
					code: WEBHOOK_WORKFLOW_CODE,
					triggers: [
						{
							type: 'webhook',
							config: { path: '/deact-hook', method: 'POST' },
						},
					],
				})
				.expect(201);

			const workflowId = createRes.body.id as string;

			// Activate first
			await request(app).post(`/api/workflows/${workflowId}/activate`).expect(200);

			// Verify webhook exists
			let webhooks = await dataSource.getRepository(WebhookEntity).findBy({ workflowId });
			expect(webhooks).toHaveLength(1);

			// Deactivate
			const deactivateRes = await request(app)
				.post(`/api/workflows/${workflowId}/deactivate`)
				.expect(200);

			expect(deactivateRes.body.active).toBe(false);

			// Verify webhooks are gone
			webhooks = await dataSource.getRepository(WebhookEntity).findBy({ workflowId });
			expect(webhooks).toHaveLength(0);
		});

		it('returns 404 for non-existent workflow', async () => {
			await request(app)
				.post('/api/workflows/00000000-0000-0000-0000-000000000000/deactivate')
				.expect(404);
		});
	});
});
