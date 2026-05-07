import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AllowAllAdmittance } from '../../admittance';
import { createDataPlaneDataSource, WorkflowExecution } from '../../database';
import type { WorkflowGraph } from '../../graph';
import { InMemoryWorkQueue } from '../../queue';
import { startEngineServer } from '../../testing/start-engine-server';

const sampleGraph: WorkflowGraph = {
	nodes: [{ id: 'trigger', name: 'Manual Trigger', type: 'trigger', config: {} }],
	edges: [],
};

describe('POST /api/workflow-executions (integration)', () => {
	let container: StartedPostgreSqlContainer;
	let dataSource: DataSource;
	let workQueue: InMemoryWorkQueue;
	let url: string;
	let stop: () => Promise<void>;

	beforeAll(async () => {
		container = await new PostgreSqlContainer('postgres:18-alpine').start();
		dataSource = createDataPlaneDataSource({ url: container.getConnectionUri() });
		await dataSource.initialize();
		await dataSource.runMigrations();
	}, 120_000);

	beforeEach(async () => {
		workQueue = new InMemoryWorkQueue();
		({ url, stop } = await startEngineServer({
			dataSource,
			admittance: new AllowAllAdmittance(),
			workQueue,
		}));
	});

	afterEach(async () => {
		if (stop) await stop();
	});

	afterAll(async () => {
		if (dataSource?.isInitialized) await dataSource.destroy();
		if (container) await container.stop();
	});

	it('creates an execution row, publishes execution_started, returns 201', async () => {
		const response = await request(url)
			.post('/api/workflow-executions')
			.send({
				workflowId: 'wf-1',
				graph: sampleGraph,
				triggerPayload: { hello: 'world' },
			});

		expect(response.status).toBe(201);
		const { executionId } = response.body as { executionId: string };
		expect(executionId).toBeTruthy();

		const repo = dataSource.getRepository(WorkflowExecution);
		const row = await repo.findOneByOrFail({ id: executionId });
		expect(row.workflowId).toBe('wf-1');
		expect(row.status).toBe('running');
		expect(row.mode).toBe('production');
		expect(row.graph).toEqual(sampleGraph);
		expect(row.triggerPayload).toEqual({ hello: 'world' });

		expect(workQueue.messages).toEqual([{ type: 'execution:started', executionId }]);
	});

	it('rejects an invalid body with 400', async () => {
		const response = await request(url)
			.post('/api/workflow-executions')
			.send({ workflowId: 'wf-1' }); // missing graph

		expect(response.status).toBe(400);
		expect((response.body as { error: string }).error).toBe('invalid_request');
	});
});
