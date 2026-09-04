import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AllowAllAdmittance } from '../../admittance';
import { mintIdentityToken, SharedSecretIdentityVerifier } from '../../auth';
import { createDataSource, createStores, WorkflowExecution } from '../../database';
import { generateId } from '../../database/generate-id';
import { ExecutionQueryService, StartExecutionService } from '../../execution';
import type { WorkflowGraph } from '../../graph';
import type { OrchestrationMessage, WorkQueue } from '../../queue';
import { createEngineRuntime } from '../../runtime';
import { startEngineServer } from '../../testing/start-engine-server';

const sampleGraph: WorkflowGraph = {
	nodes: [{ id: 'trigger', name: 'Manual Trigger', type: 'trigger', config: {} }],
	edges: [],
};

/** Opaque to the engine: it is stored and reported, never read into. */
const sampleWorkflow = {
	id: 'wf-1',
	name: 'Sample',
	nodes: [{ name: 'Manual Trigger' }],
	connections: {},
};

const secret = 'a'.repeat(32);

const authHeader = () => ({
	authorization: `Bearer ${mintIdentityToken(secret, { cpId: 'cp-1', tenantId: 'tenant-1' })}`,
});

/** The caller always mints the id, so every valid body carries one. */
const startBody = (overrides: Record<string, unknown> = {}) => ({
	workflowId: 'wf-1',
	graph: sampleGraph,
	workflow: sampleWorkflow,
	executionId: generateId(),
	...overrides,
});

let container: StartedPostgreSqlContainer;
let dataSource: DataSource;
let workQueue: WorkQueue<OrchestrationMessage>;
let url: string;
let stop: () => Promise<void>;

// One container for the file: both suites talk to the same schema, and each
// test gets a fresh server over it.
beforeAll(async () => {
	container = await new PostgreSqlContainer(postgresVersions.primary).start();
	dataSource = createDataSource(container.getConnectionUri());
	await dataSource.initialize();
	await dataSource.runMigrations();
}, 120_000);

beforeEach(async () => {
	workQueue = { publish: vi.fn(), start: vi.fn(), stop: vi.fn() };
	const { executionStore, executionViewStore } = createStores(dataSource);
	({ url, stop } = await startEngineServer({
		startExecution: new StartExecutionService(new AllowAllAdmittance(), executionStore, workQueue),
		executionQuery: new ExecutionQueryService(executionViewStore),
		identityVerifier: new SharedSecretIdentityVerifier(secret),
	}));
});

afterEach(async () => {
	if (stop) await stop();
});

afterAll(async () => {
	if (dataSource?.isInitialized) await dataSource.destroy();
	if (container) await container.stop();
});

describe('POST /api/workflow-executions (integration)', () => {
	it('creates the row under the caller-minted id, publishes execution:enqueued, returns 201', async () => {
		const body = startBody({ triggerOutputs: [[{ json: { hello: 'world' } }]] });

		const response = await request(url)
			.post('/api/workflow-executions')
			.set(authHeader())
			.send(body);

		expect(response.status).toBe(201);
		const { executionId } = response.body as { executionId: string };
		expect(executionId).toBe(body.executionId);

		const repo = dataSource.getRepository(WorkflowExecution);
		// `findOne({ where })`, not `findOneByOrFail`: the latter's overload exceeds
		// TypeScript's instantiation depth on the recursive `triggerOutputs` column type.
		const row = await repo.findOneOrFail({ where: { id: executionId } });
		expect(row.workflowId).toBe('wf-1');
		expect(row.status).toBe('queued');
		expect(row.mode).toBe('production');
		expect(row.graph).toEqual(sampleGraph);
		expect(row.workflow).toEqual(sampleWorkflow);
		expect(row.triggerOutputs).toEqual([[{ json: { hello: 'world' } }]]);

		expect(workQueue.publish).toHaveBeenCalledWith({ type: 'execution:enqueued', executionId });
	});

	// v4 included: the id has to be time-ordered. `undefined` covers the omitted
	// case — the engine never mints a replacement.
	it.each(['not-a-uuid', '9f1b7d0e-2c4a-4f8b-9d3e-6a5c1b2d3e4f', undefined])(
		'rejects the execution id %p with 400',
		async (executionId) => {
			const response = await request(url)
				.post('/api/workflow-executions')
				.set(authHeader())
				.send({ workflowId: 'wf-1', graph: sampleGraph, workflow: sampleWorkflow, executionId });

			expect(response.status).toBe(400);
			expect((response.body as { error: string }).error).toBe('invalid_request');
		},
	);

	it('rejects an invalid body with 400', async () => {
		const response = await request(url)
			.post('/api/workflow-executions')
			.set(authHeader())
			.send({ workflowId: 'wf-1' }); // missing graph

		expect(response.status).toBe(400);
		expect((response.body as { error: string }).error).toBe('invalid_request');
	});

	it.each([
		['absent', undefined],
		['not an object', 'a workflow'],
		['an array', []],
	])('rejects a workflow that is %s with 400', async (_case, workflow) => {
		const body = startBody();
		if (workflow === undefined) delete (body as { workflow?: unknown }).workflow;
		else (body as { workflow?: unknown }).workflow = workflow;

		const response = await request(url)
			.post('/api/workflow-executions')
			.set(authHeader())
			.send(body);

		expect(response.status).toBe(400);
		expect((response.body as { error: string }).error).toBe('invalid_request');
	});

	it('rejects a bare-object triggerOutputs with 400 (the legacy, dropped shape)', async () => {
		const response = await request(url)
			.post('/api/workflow-executions')
			.set(authHeader())
			.send(startBody({ triggerOutputs: { hello: 'world' } }));

		expect(response.status).toBe(400);
		expect((response.body as { error: string }).error).toBe('invalid_request');
	});

	it.each([['str'], [42]])('rejects triggerOutputs %p with 400', async (triggerOutputs) => {
		const response = await request(url)
			.post('/api/workflow-executions')
			.set(authHeader())
			.send(startBody({ triggerOutputs }));

		expect(response.status).toBe(400);
		expect((response.body as { error: string }).error).toBe('invalid_request');
	});

	it('rejects an empty-array triggerOutputs with 400 (send null or omit for "no payload")', async () => {
		const response = await request(url)
			.post('/api/workflow-executions')
			.set(authHeader())
			.send(startBody({ triggerOutputs: [] }));

		expect(response.status).toBe(400);
		expect((response.body as { error: string }).error).toBe('invalid_request');
	});

	it('rejects a triggerOutputs with more slots than the cap with 400', async () => {
		const response = await request(url)
			.post('/api/workflow-executions')
			.set(authHeader())
			.send(startBody({ triggerOutputs: Array.from({ length: 102 }, () => []) }));

		expect(response.status).toBe(400);
		expect((response.body as { error: string }).error).toBe('invalid_request');
	});

	it('rejects a graph without a trigger with 400, creating nothing', async () => {
		const response = await request(url)
			.post('/api/workflow-executions')
			.set(authHeader())
			.send(startBody({ graph: { nodes: [{ id: 'a', name: 'A', type: 'v1-node' }], edges: [] } }));

		expect(response.status).toBe(400);
		expect((response.body as { error: string }).error).toBe('invalid_graph');
		expect(workQueue.publish).not.toHaveBeenCalled();
	});

	it('rejects a back-edge to a node that cannot loop with 400, creating nothing', async () => {
		// only a batch node knows how to advance a loop, so this can never run
		const response = await request(url)
			.post('/api/workflow-executions')
			.set(authHeader())
			.send({
				...startBody(),
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

		expect(response.status).toBe(400);
		expect((response.body as { error: string }).error).toBe('invalid_graph');
		expect(workQueue.publish).not.toHaveBeenCalled();
	});

	it('rejects a nested loop with 501, creating nothing', async () => {
		// coherent, but the engine does not run it yet
		const response = await request(url)
			.post('/api/workflow-executions')
			.set(authHeader())
			.send({
				...startBody(),
				graph: {
					nodes: [
						{ id: 'trigger', name: 'T', type: 'trigger' },
						{ id: 'outer', name: 'Outer', type: 'batch', config: { batchSize: 1 } },
						{ id: 'inner', name: 'Inner', type: 'batch', config: { batchSize: 1 } },
						{ id: 'x', name: 'X', type: 'v1-node' },
						{ id: 'tail', name: 'Tail', type: 'v1-node' },
						{ id: 'done', name: 'Done', type: 'v1-node' },
					],
					edges: [
						{ from: 'trigger', to: 'outer' },
						{ from: 'outer', to: 'inner', outputIndex: 1 },
						{ from: 'inner', to: 'x', outputIndex: 1 },
						{ from: 'x', to: 'inner', isBackEdge: true },
						{ from: 'inner', to: 'tail', outputIndex: 0 },
						{ from: 'tail', to: 'outer', isBackEdge: true },
						{ from: 'outer', to: 'done', outputIndex: 0 },
					],
				},
			});

		expect(response.status).toBe(501);
		expect((response.body as { error: string }).error).toBe('unimplemented');
		expect(workQueue.publish).not.toHaveBeenCalled();
	});
});

describe('GET /api/workflow-executions/:id (integration)', () => {
	async function createExecution(): Promise<string> {
		const response = await request(url)
			.post('/api/workflow-executions')
			.set(authHeader())
			.send(startBody({ triggerOutputs: [[{ json: { hello: 'world' } }]] }));
		return (response.body as { executionId: string }).executionId;
	}

	it('returns the persisted status, mode, workflow id, graph, workflow and ISO timestamps', async () => {
		const executionId = await createExecution();

		const response = await request(url)
			.get(`/api/workflow-executions/${executionId}`)
			.set(authHeader());

		expect(response.status).toBe(200);
		expect(response.body).toMatchObject({
			id: executionId,
			workflowId: 'wf-1',
			status: 'queued',
			mode: 'production',
			graph: sampleGraph,
			workflow: sampleWorkflow,
			finishedAt: null,
		});
		expect(response.body).not.toHaveProperty('steps');
		const body = response.body as { createdAt: string; updatedAt: string };
		expect(new Date(body.createdAt).toISOString()).toBe(body.createdAt);
		expect(new Date(body.updatedAt).toISOString()).toBe(body.updatedAt);
	});

	it('returns 404 not_found for an unknown execution id', async () => {
		const response = await request(url)
			.get('/api/workflow-executions/00000000-0000-0000-0000-000000000000')
			.set(authHeader());

		expect(response.status).toBe(404);
		expect((response.body as { error: string }).error).toBe('not_found');
	});

	it('returns 400 invalid_request for a non-uuid id', async () => {
		const response = await request(url)
			.get('/api/workflow-executions/not-a-uuid')
			.set(authHeader());

		expect(response.status).toBe(400);
		expect((response.body as { error: string }).error).toBe('invalid_request');
	});

	it('returns the trigger step with its outputs in the slot shape the POST supplied', async () => {
		// A trigger-only graph runs to completion with no executor needed, so
		// this waits on a real orchestration queue to see the trigger step land.
		let done!: () => void;
		const finished = new Promise<void>((resolve) => (done = resolve));
		const runtime = createEngineRuntime({
			dataSource,
			admittance: new AllowAllAdmittance(),
			identityVerifier: new SharedSecretIdentityVerifier(secret),
			externalDependencies: ({ executionStore }) => {
				const finishExecution = executionStore.finishExecution.bind(executionStore);
				vi.spyOn(executionStore, 'finishExecution').mockImplementation(async (id, status) => {
					const recorded = await finishExecution(id, status);
					done();
					return recorded;
				});
				return {};
			},
		});
		runtime.start();

		const postResponse = await request(runtime.app)
			.post('/api/workflow-executions')
			.set(authHeader())
			.send(startBody({ triggerOutputs: [[{ json: { hello: 'world' } }]] }));
		const { executionId } = postResponse.body as { executionId: string };
		await finished;

		const response = await request(runtime.app)
			.get(`/api/workflow-executions/${executionId}`)
			.query({ includeSteps: 'true' })
			.set(authHeader());
		await runtime.stop();

		expect(response.status).toBe(200);
		const { steps } = response.body as { steps: Array<Record<string, unknown>> };
		expect(steps).toHaveLength(1);
		expect(steps[0]).toMatchObject({
			nodeId: 'trigger',
			iteration: 0,
			status: 'completed',
			outputs: [[{ json: { hello: 'world' } }]],
			error: null,
		});
	});

	it('returns an empty step list for an execution that has run nothing yet', async () => {
		const executionId = await createExecution();

		const response = await request(url)
			.get(`/api/workflow-executions/${executionId}`)
			.query({ includeSteps: 'true' })
			.set(authHeader());

		expect(response.status).toBe(200);
		expect((response.body as { steps: unknown[] }).steps).toEqual([]);
		// The steps are aggregated into the execution row, so the execution's own
		// columns still have to come back beside them.
		expect(response.body).toMatchObject({ graph: sampleGraph, workflow: sampleWorkflow });
	});

	it('returns 404 not_found for an unknown execution id even when steps are asked for', async () => {
		const response = await request(url)
			.get('/api/workflow-executions/00000000-0000-0000-0000-000000000000')
			.query({ includeSteps: 'true' })
			.set(authHeader());

		expect(response.status).toBe(404);
		expect((response.body as { error: string }).error).toBe('not_found');
	});

	it('returns 400 invalid_request for a misspelled query key', async () => {
		const executionId = await createExecution();

		// Stripping it would answer 200 with no steps, which reads the same as an
		// execution that ran none.
		const response = await request(url)
			.get(`/api/workflow-executions/${executionId}`)
			.query({ includeStep: 'true' })
			.set(authHeader());

		expect(response.status).toBe(400);
		expect((response.body as { error: string }).error).toBe('invalid_request');
	});

	it('returns 400 invalid_request for an includeSteps value that is not a boolean', async () => {
		const executionId = await createExecution();

		const response = await request(url)
			.get(`/api/workflow-executions/${executionId}`)
			.query({ includeSteps: 'yes' })
			.set(authHeader());

		expect(response.status).toBe(400);
		expect((response.body as { error: string }).error).toBe('invalid_request');
	});
});
