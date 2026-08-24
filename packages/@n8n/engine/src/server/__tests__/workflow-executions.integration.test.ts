import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AllowAllAdmittance } from '../../admittance';
import { mintIdentityToken, SharedSecretIdentityVerifier } from '../../auth';
import { createDataSource, createStores, WorkflowExecution } from '../../database';
import { StartExecutionService } from '../../execution';
import type { WorkflowGraph } from '../../graph';
import type { OrchestrationMessage, WorkQueue } from '../../queue';
import { startEngineServer } from '../../testing/start-engine-server';

const sampleGraph: WorkflowGraph = {
	nodes: [{ id: 'trigger', name: 'Manual Trigger', type: 'trigger', config: {} }],
	edges: [],
};

const secret = 'a'.repeat(32);

const authHeader = () => ({
	authorization: `Bearer ${mintIdentityToken(secret, { cpId: 'cp-1', tenantId: 'tenant-1' })}`,
});

describe('POST /api/workflow-executions (integration)', () => {
	let container: StartedPostgreSqlContainer;
	let dataSource: DataSource;
	let workQueue: WorkQueue<OrchestrationMessage>;
	let url: string;
	let stop: () => Promise<void>;

	beforeAll(async () => {
		container = await new PostgreSqlContainer(postgresVersions.primary).start();
		dataSource = createDataSource(container.getConnectionUri());
		await dataSource.initialize();
		await dataSource.runMigrations();
	}, 120_000);

	beforeEach(async () => {
		workQueue = { publish: vi.fn(), start: vi.fn(), stop: vi.fn() };
		const { executionStore } = createStores(dataSource);
		({ url, stop } = await startEngineServer(
			new StartExecutionService(new AllowAllAdmittance(), executionStore, workQueue),
			new SharedSecretIdentityVerifier(secret),
		));
	});

	afterEach(async () => {
		if (stop) await stop();
	});

	afterAll(async () => {
		if (dataSource?.isInitialized) await dataSource.destroy();
		if (container) await container.stop();
	});

	it('creates an execution row, publishes execution:enqueued, returns 201', async () => {
		const response = await request(url)
			.post('/api/workflow-executions')
			.set(authHeader())
			.send({
				workflowId: 'wf-1',
				graph: sampleGraph,
				triggerOutputs: [[{ json: { hello: 'world' } }]],
			});

		expect(response.status).toBe(201);
		const { executionId } = response.body as { executionId: string };
		expect(executionId).toBeTruthy();

		const repo = dataSource.getRepository(WorkflowExecution);
		// `findOne({ where })`, not `findOneByOrFail`: the latter's overload exceeds
		// TypeScript's instantiation depth on the recursive `triggerOutputs` column type.
		const row = await repo.findOneOrFail({ where: { id: executionId } });
		expect(row.workflowId).toBe('wf-1');
		expect(row.status).toBe('queued');
		expect(row.mode).toBe('production');
		expect(row.graph).toEqual(sampleGraph);
		expect(row.triggerOutputs).toEqual([[{ json: { hello: 'world' } }]]);

		expect(workQueue.publish).toHaveBeenCalledWith({ type: 'execution:enqueued', executionId });
	});

	it('rejects an invalid body with 400', async () => {
		const response = await request(url)
			.post('/api/workflow-executions')
			.set(authHeader())
			.send({ workflowId: 'wf-1' }); // missing graph

		expect(response.status).toBe(400);
		expect((response.body as { error: string }).error).toBe('invalid_request');
	});

	it('rejects a bare-object triggerOutputs with 400 (the legacy, dropped shape)', async () => {
		const response = await request(url)
			.post('/api/workflow-executions')
			.set(authHeader())
			.send({
				workflowId: 'wf-1',
				graph: sampleGraph,
				triggerOutputs: { hello: 'world' },
			});

		expect(response.status).toBe(400);
		expect((response.body as { error: string }).error).toBe('invalid_request');
	});

	it.each([['str'], [42]])('rejects triggerOutputs %p with 400', async (triggerOutputs) => {
		const response = await request(url)
			.post('/api/workflow-executions')
			.set(authHeader())
			.send({ workflowId: 'wf-1', graph: sampleGraph, triggerOutputs });

		expect(response.status).toBe(400);
		expect((response.body as { error: string }).error).toBe('invalid_request');
	});

	it('rejects an empty-array triggerOutputs with 400 (send null or omit for "no payload")', async () => {
		const response = await request(url).post('/api/workflow-executions').set(authHeader()).send({
			workflowId: 'wf-1',
			graph: sampleGraph,
			triggerOutputs: [],
		});

		expect(response.status).toBe(400);
		expect((response.body as { error: string }).error).toBe('invalid_request');
	});

	it('rejects a triggerOutputs with more slots than the cap with 400', async () => {
		const response = await request(url)
			.post('/api/workflow-executions')
			.set(authHeader())
			.send({
				workflowId: 'wf-1',
				graph: sampleGraph,
				triggerOutputs: Array.from({ length: 102 }, () => []),
			});

		expect(response.status).toBe(400);
		expect((response.body as { error: string }).error).toBe('invalid_request');
	});

	it('rejects a graph without a trigger with 400, creating nothing', async () => {
		const response = await request(url)
			.post('/api/workflow-executions')
			.set(authHeader())
			.send({
				workflowId: 'wf-1',
				graph: { nodes: [{ id: 'a', name: 'A', type: 'v1-node' }], edges: [] },
			});

		expect(response.status).toBe(400);
		expect((response.body as { error: string }).error).toBe('invalid_graph');
		expect(workQueue.publish).not.toHaveBeenCalled();
	});

	it('rejects a graph with back-edges with 501, creating nothing', async () => {
		const response = await request(url)
			.post('/api/workflow-executions')
			.set(authHeader())
			.send({
				workflowId: 'wf-1',
				graph: {
					nodes: [
						{ id: 'trigger', name: 'T', type: 'trigger' },
						{ id: 'a', name: 'A', type: 'v1-node' },
					],
					edges: [
						{ from: 'trigger', to: 'a' },
						{ from: 'a', to: 'trigger', isBackEdge: true },
					],
				},
			});

		expect(response.status).toBe(501);
		expect((response.body as { error: string }).error).toBe('unimplemented');
		expect(workQueue.publish).not.toHaveBeenCalled();
	});
});
