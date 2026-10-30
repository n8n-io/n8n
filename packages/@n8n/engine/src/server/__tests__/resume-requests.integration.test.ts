import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Application } from 'express';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AllowAllAdmittance } from '../../admittance';
import { mintIdentityToken, SharedSecretIdentityVerifier } from '../../auth';
import { mintResumeToken } from '../../auth/resume-token';
import { createDataSource, createStores } from '../../database';
import { generateId } from '../../database/generate-id';
import { ExecutionNotFoundError, type WaitDeclaration } from '../../execution';
import { MAX_SLOT_INDEX, type WorkflowGraph } from '../../graph';
import { noopExecutionResponseSender } from '../../response-channel';
import { createEngineRuntime } from '../../runtime';
import type { ResumeTargetResponse } from '../api.types';
import { createEngineServer, type EngineServerDeps } from '../create-engine-server';

const identitySecret = 'a'.repeat(32);
const resumeSecret = 'r'.repeat(32);

const graph: WorkflowGraph = {
	nodes: [
		{ id: 'trigger', name: 'Trigger', type: 'trigger', config: {} },
		{ id: 'wait-a', name: 'Wait A', type: 'v1-node', config: {} },
		{ id: 'wait-b', name: 'Wait B', type: 'v1-node', config: {} },
	],
	edges: [
		{ from: 'trigger', to: 'wait-a', outputIndex: 0, inputIndex: 0 },
		{ from: 'trigger', to: 'wait-b', outputIndex: 0, inputIndex: 0 },
	],
};

const acceptsRequest: WaitDeclaration = { resumeBinding: 'execution' };
const deadlineOnly: WaitDeclaration = {
	resumeAt: '2099-01-01T00:00:00.000Z',
	outputsAtDeadline: [],
};

const auth = () => ({
	authorization: `Bearer ${mintIdentityToken(identitySecret, { cpId: 'cp-1', tenantId: 't-1' })}`,
});

let container: StartedPostgreSqlContainer;
let dataSource: DataSource;
let app: Application;

beforeAll(async () => {
	container = await new PostgreSqlContainer(postgresVersions.primary).start();
	dataSource = createDataSource(container.getConnectionUri());
	await dataSource.initialize();
	await dataSource.runMigrations();
	// Not started: no worker claims the resumed step, so the row shows what resolve left.
	({ app } = createEngineRuntime({
		dataSource,
		admittance: new AllowAllAdmittance(),
		identityVerifier: new SharedSecretIdentityVerifier(identitySecret),
		responseSender: noopExecutionResponseSender,
		resumeSecret,
	}));
}, 120_000);

afterAll(async () => {
	if (dataSource?.isInitialized) await dataSource.destroy();
	if (container) await container.stop();
});

/** A running execution whose wait steps are suspended with the given declarations. */
async function seed(waits: Partial<Record<'wait-a' | 'wait-b', WaitDeclaration>>) {
	const { executionStore, stepStore } = createStores(dataSource);
	const executionId = generateId();
	await executionStore.createExecution({
		id: executionId,
		workflowId: 'wf-1',
		status: 'running',
		mode: 'production',
		graph: { ...graph, seeded: [] },
		workflow: { nodes: [] },
		triggerOutputs: null,
		parent: null,
		callerContext: { hostMode: 'webhook' },
		responseExpectation: { kind: 'none' },
	});
	const nodeIds = Object.keys(waits) as Array<'wait-a' | 'wait-b'>;
	const created = await stepStore.createSteps(executionId, [
		{ nodeId: 'trigger', iteration: 0, status: 'completed', outputs: [[{ json: {} }]] },
		...nodeIds.map((nodeId) => ({ nodeId, iteration: 0, status: 'queued' as const })),
	]);
	const stepIds: Record<string, string> = {};
	for (const nodeId of nodeIds) {
		const { id } = created.find((step) => step.nodeId === nodeId)!;
		await stepStore.claimStep(id);
		await stepStore.suspendStep(id, waits[nodeId]!);
		stepIds[nodeId] = id;
	}
	return { executionId, stepIds, token: mintResumeToken(resumeSecret, executionId), stepStore };
}

const resumeTarget = (executionId: string, body: object) =>
	request(app).post(`/api/workflow-executions/${executionId}/resume-target`).set(auth()).send(body);

const resolve = (stepId: string, body: object) =>
	request(app).post(`/api/step-executions/${stepId}/resolve`).set(auth()).send(body);

describe('POST /api/workflow-executions/:id/resume-target (integration)', () => {
	it('names the step that accepts a request and reports the execution with its steps', async () => {
		const { executionId, stepIds, token } = await seed({
			'wait-a': acceptsRequest,
			'wait-b': deadlineOnly,
		});

		const response = await resumeTarget(executionId, { token }).expect(200);
		const body = response.body as ResumeTargetResponse;

		expect(body.target).toEqual({ stepId: stepIds['wait-a'], nodeId: 'wait-a' });
		expect(body.execution.id).toBe(executionId);
		expect(body.execution.hostMode).toBe('webhook');
		expect(body.execution.steps?.map((step) => step.nodeId).sort()).toEqual([
			'trigger',
			'wait-a',
			'wait-b',
		]);
	});

	it('answers null for an execution that ended, even with a wait not cancelled yet', async () => {
		const { executionId, token } = await seed({ 'wait-a': acceptsRequest });
		await createStores(dataSource).executionStore.finishExecution(executionId, 'completed');

		const response = await resumeTarget(executionId, { token }).expect(200);

		expect((response.body as ResumeTargetResponse).target).toBeNull();
		expect((response.body as ResumeTargetResponse).execution.status).toBe('completed');
	});

	it('refuses two steps that accept a request at once with 409', async () => {
		const { executionId, token } = await seed({
			'wait-a': acceptsRequest,
			'wait-b': acceptsRequest,
		});

		await resumeTarget(executionId, { token }).expect(409, { error: 'ambiguous' });
	});

	it('refuses a token for another execution with 401', async () => {
		const { executionId } = await seed({ 'wait-a': acceptsRequest });
		const token = mintResumeToken(resumeSecret, generateId());

		await resumeTarget(executionId, { token }).expect(401, { error: 'invalid_token' });
	});

	it('answers 401 for a bad token even when the execution does not exist', async () => {
		await resumeTarget(generateId(), { token: mintResumeToken(resumeSecret, generateId()) }).expect(
			401,
			{ error: 'invalid_token' },
		);
	});

	it('answers 404 when the execution goes away after the token check', async () => {
		const executionId = generateId();
		const deps = {
			identityVerifier: new SharedSecretIdentityVerifier(identitySecret),
			resumeRequests: { locate: async () => null },
			executionQuery: {
				getExecutionWithSteps: async () => {
					throw new ExecutionNotFoundError(executionId);
				},
			},
		} as unknown as EngineServerDeps;
		const { app: stubbed } = createEngineServer(deps);

		await request(stubbed)
			.post(`/api/workflow-executions/${executionId}/resume-target`)
			.set(auth())
			.send({ token: mintResumeToken(resumeSecret, executionId) })
			.expect(404, { error: 'not_found' });
	});

	it('answers 404 for an execution that does not exist', async () => {
		const executionId = generateId();

		await resumeTarget(executionId, { token: mintResumeToken(resumeSecret, executionId) }).expect(
			404,
			{ error: 'not_found' },
		);
	});

	it('rejects a body with an unknown key with 400', async () => {
		const { executionId, token } = await seed({ 'wait-a': acceptsRequest });

		await resumeTarget(executionId, { token, query: {} }).expect(400);
	});

	it('requires the identity token', async () => {
		const { executionId, token } = await seed({ 'wait-a': acceptsRequest });

		await request(app)
			.post(`/api/workflow-executions/${executionId}/resume-target`)
			.send({ token })
			.expect(401);
	});
});

describe('POST /api/step-executions/:id/resolve (integration)', () => {
	const outputs = [[{ json: { approved: true } }]];

	it('ends the wait with the outputs and queues the step', async () => {
		const { stepIds, token, stepStore, executionId } = await seed({ 'wait-a': acceptsRequest });
		const stepId = stepIds['wait-a'];

		await resolve(stepId, { token, outputs }).expect(200, { executionId, stepId });

		const step = await stepStore.loadStep(stepId);
		expect(step.status).toBe('queued');
		expect(step.resumeCause).toEqual({ kind: 'request', outputs });
		expect(await stepStore.loadWaitingSteps(executionId)).toEqual([]);
	});

	it('resolves a wait once: a second request answers 409', async () => {
		const { stepIds, token } = await seed({ 'wait-a': acceptsRequest });

		await resolve(stepIds['wait-a'], { token, outputs }).expect(200);
		await resolve(stepIds['wait-a'], { token, outputs }).expect(409, { error: 'not_waiting' });
	});

	it('refuses a token for another execution with 401', async () => {
		const { stepIds } = await seed({ 'wait-a': acceptsRequest });
		const other = await seed({ 'wait-a': acceptsRequest });

		await resolve(stepIds['wait-a'], { token: other.token, outputs }).expect(401, {
			error: 'invalid_token',
		});
	});

	it('answers 401 for a step that does not exist, as for a bad token', async () => {
		const { token } = await seed({ 'wait-a': acceptsRequest });

		await resolve(generateId(), { token, outputs }).expect(401, { error: 'invalid_token' });
	});

	it('resumes the named step of an execution with two waits that accept a request', async () => {
		const { executionId, stepIds, token } = await seed({
			'wait-a': acceptsRequest,
			'wait-b': acceptsRequest,
		});

		await resolve(stepIds['wait-a'], { token, outputs }).expect(200, {
			executionId,
			stepId: stepIds['wait-a'],
		});
	});

	it('requires the identity token', async () => {
		const { stepIds, token } = await seed({ 'wait-a': acceptsRequest });

		await request(app)
			.post(`/api/step-executions/${stepIds['wait-a']}/resolve`)
			.send({ token, outputs })
			.expect(401);
	});

	it.each([
		['an unknown key', { extra: 1 }],
		['too many output slots', { outputs: Array.from({ length: MAX_SLOT_INDEX + 2 }, () => []) }],
	])('rejects a body with %s with 400', async (_, change) => {
		const { stepIds, token } = await seed({ 'wait-a': acceptsRequest });

		await resolve(stepIds['wait-a'], { token, outputs, ...change }).expect(400);
	});

	it('rejects a step id that is not a UUID with 400', async () => {
		const { token } = await seed({ 'wait-a': acceptsRequest });

		await resolve('not-a-uuid', { token, outputs }).expect(400, { error: 'invalid_request' });
	});

	it('rejects a body without outputs with 400', async () => {
		const { stepIds, token } = await seed({ 'wait-a': acceptsRequest });

		await resolve(stepIds['wait-a'], { token }).expect(400);
	});
});

describe('resume secret', () => {
	it.each([undefined, ''])(
		'answers 501 on both routes when the resume secret is %j',
		async (resumeSecret) => {
			const { app: bare } = createEngineRuntime({
				dataSource,
				admittance: new AllowAllAdmittance(),
				identityVerifier: new SharedSecretIdentityVerifier(identitySecret),
				responseSender: noopExecutionResponseSender,
				resumeSecret,
			});
			const id = generateId();

			await request(bare)
				.post(`/api/workflow-executions/${id}/resume-target`)
				.set(auth())
				.send({ token: 't' })
				.expect(501);
			await request(bare)
				.post(`/api/step-executions/${id}/resolve`)
				.set(auth())
				.send({ token: 't', outputs: [] })
				.expect(501);
		},
	);

	it('refuses to build an engine with a short resume secret', () => {
		expect(() =>
			createEngineRuntime({
				dataSource,
				admittance: new AllowAllAdmittance(),
				identityVerifier: new SharedSecretIdentityVerifier(identitySecret),
				responseSender: noopExecutionResponseSender,
				resumeSecret: 'r'.repeat(31),
			}),
		).toThrow(/at least 32 characters/);
	});
});
