import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { IExecutionResponse, User } from '@n8n/db';
import {
	DataSource,
	IDEMPOTENCY_KEY_TTL_MS,
	IdempotencyKey,
	IdempotencyKeyRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

import { ExecutionService } from '@/executions/execution.service';
import { fingerprintParts } from '@/idempotency/idempotency-request';
import {
	IDEMPOTENCY_KEY_IN_PROGRESS_MESSAGE,
	IDEMPOTENCY_KEY_INVALID_MESSAGE,
	IDEMPOTENCY_KEY_MISMATCH_MESSAGE,
} from '@/idempotency/idempotency.middleware';

import { createSuccessfulExecution } from '../shared/db/executions';
import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

const triggerNode = {
	id: 'uuid-1234',
	parameters: {},
	name: 'Start',
	type: 'n8n-nodes-base.manualTrigger',
	typeVersion: 1,
	position: [240, 300],
} as const;

function workflowPayload(name: string) {
	return {
		name,
		nodes: [triggerNode],
		connections: {},
		settings: { executionOrder: 'v1' },
	};
}

function workflowsPath(): string {
	return `/${Container.get(GlobalConfig).publicApi.path}/v1/workflows`;
}

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
	member = await createMemberWithApiKey();
	await utils.initNodeTypes();
});

beforeEach(async () => {
	await testDb.truncate(['SharedWorkflow', 'WorkflowEntity', 'IdempotencyKey', 'ExecutionEntity']);
	authOwnerAgent = testServer.publicApiAgentFor(owner);
	authMemberAgent = testServer.publicApiAgentFor(member);
});

describe('Public API idempotency', () => {
	test('returns the first workflow when the same key and body are sent again', async () => {
		const payload = workflowPayload('same');
		const first = await authOwnerAgent
			.post('/workflows')
			.set('Idempotency-Key', 'create-workflow')
			.send(payload);

		const second = await authOwnerAgent
			.post('/workflows')
			.set('Idempotency-Key', 'create-workflow')
			.send(payload);

		expect(first.statusCode).toBe(200);
		expect(second.statusCode).toBe(200);
		expect(second.body).toEqual(first.body);

		const workflows = await Container.get(WorkflowRepository).find();
		expect(workflows).toHaveLength(1);
		expect(workflows[0]?.id).toBe(first.body.id);
	});

	test('returns 422 when the same key is sent with a different body', async () => {
		const first = await authOwnerAgent
			.post('/workflows')
			.set('Idempotency-Key', 'create-workflow')
			.send(workflowPayload('one'));

		const second = await authOwnerAgent
			.post('/workflows')
			.set('Idempotency-Key', 'create-workflow')
			.send(workflowPayload('two'));

		expect(first.statusCode).toBe(200);
		expect(second.statusCode).toBe(422);
		expect(second.body).toEqual({ message: IDEMPOTENCY_KEY_MISMATCH_MESSAGE });

		const workflows = await Container.get(WorkflowRepository).find();
		expect(workflows).toHaveLength(1);
	});

	test('returns 409 when the same key is still processing', async () => {
		const payload = workflowPayload('inflight');
		const body = JSON.stringify(payload);
		const fingerprint = fingerprintParts({
			method: 'POST',
			path: workflowsPath(),
			query: '',
			body,
		});

		await Container.get(IdempotencyKeyRepository).insertProcessing({
			userId: owner.id,
			idempotencyKey: 'inflight',
			fingerprint,
		});

		const response = await authOwnerAgent
			.post('/workflows')
			.set('Idempotency-Key', 'inflight')
			.set('Content-Type', 'application/json')
			.send(body);

		expect(response.statusCode).toBe(409);
		expect(response.body).toEqual({ message: IDEMPOTENCY_KEY_IN_PROGRESS_MESSAGE });
		expect(await Container.get(WorkflowRepository).count()).toBe(0);
	});

	test('does not store a key for a headerless POST, a GET, or a PUT', async () => {
		await authOwnerAgent.post('/workflows').send(workflowPayload('plain'));
		await authOwnerAgent.get('/workflows').set('Idempotency-Key', 'ignored');
		await authOwnerAgent.put('/workflows/missing').set('Idempotency-Key', 'ignored').send({});

		const keys = await Container.get(IdempotencyKeyRepository).find();
		expect(keys).toHaveLength(0);
		expect(await Container.get(WorkflowRepository).count()).toBe(1);
	});

	test('returns 400 for a malformed key and does not create a workflow', async () => {
		const response = await authOwnerAgent
			.post('/workflows')
			.set('Idempotency-Key', 'bad key')
			.send(workflowPayload('nope'));

		expect(response.statusCode).toBe(400);
		expect(response.body).toEqual({ message: IDEMPOTENCY_KEY_INVALID_MESSAGE });
		expect(await Container.get(WorkflowRepository).count()).toBe(0);
		expect(await Container.get(IdempotencyKeyRepository).count()).toBe(0);
	});

	test('keeps a separate row for the same key from a different user', async () => {
		const payload = workflowPayload('shared-key');
		const ownerResponse = await authOwnerAgent
			.post('/workflows')
			.set('Idempotency-Key', 'shared')
			.send(payload);
		const memberResponse = await authMemberAgent
			.post('/workflows')
			.set('Idempotency-Key', 'shared')
			.send(payload);

		expect(ownerResponse.statusCode).toBe(200);
		expect(memberResponse.statusCode).toBe(200);
		expect(memberResponse.body.id).not.toBe(ownerResponse.body.id);
		expect(await Container.get(WorkflowRepository).count()).toBe(2);
		expect(await Container.get(IdempotencyKeyRepository).count()).toBe(2);
	});

	test('runs the handler again when the stored row is older than the TTL', async () => {
		const repository = Container.get(IdempotencyKeyRepository);
		const id = await repository.insertProcessing({
			userId: owner.id,
			idempotencyKey: 'expired',
			fingerprint: 'stale',
		});
		if (!id) throw new Error('Failed to insert a processing idempotency key');

		const dataSource = Container.get(DataSource);
		const metadata = dataSource.getMetadata(IdempotencyKey);
		const createdAt = metadata.findColumnWithPropertyName('createdAt');
		const idColumn = metadata.findColumnWithPropertyName('id');
		if (!createdAt || !idColumn) throw new Error('idempotency key columns are missing');

		const table = metadata.schema
			? `${dataSource.driver.escape(metadata.schema)}.${dataSource.driver.escape(metadata.tableName)}`
			: dataSource.driver.escape(metadata.tableName);
		const [sql, parameters] = dataSource.driver.escapeQueryWithParameters(
			`UPDATE ${table} SET ${dataSource.driver.escape(createdAt.databaseName)} = :createdAt WHERE ${dataSource.driver.escape(idColumn.databaseName)} = :id`,
			{
				createdAt: new Date(Date.now() - IDEMPOTENCY_KEY_TTL_MS - 60_000),
				id,
			},
			{},
		);
		await dataSource.query(sql, parameters);

		const response = await authOwnerAgent
			.post('/workflows')
			.set('Idempotency-Key', 'expired')
			.send(workflowPayload('fresh'));

		expect(response.statusCode).toBe(200);
		expect(response.body.stale).toBeUndefined();
		expect(response.body.id).toEqual(expect.any(String));
		expect(await Container.get(WorkflowRepository).count()).toBe(1);
	});

	test('does not create two workflows when two requests share one key', async () => {
		const payload = workflowPayload('concurrent');
		const send = () =>
			authOwnerAgent.post('/workflows').set('Idempotency-Key', 'concurrent').send(payload);

		const [first, second] = await Promise.all([send(), send()]);
		const statuses = [first.statusCode, second.statusCode].sort();

		expect(statuses[0]).toBe(200);
		expect([200, 409]).toContain(statuses[1]);
		if (first.statusCode === 200 && second.statusCode === 200) {
			expect(second.body).toEqual(first.body);
		}
		expect(await Container.get(WorkflowRepository).count()).toBe(1);
	});

	describe('POST /executions/:id/retry', () => {
		const retryServiceResponse = () =>
			({
				id: '1001',
				mode: 'retry',
				startedAt: new Date('2026-01-01T00:00:00.000Z'),
				workflowId: 'workflow-1',
				finished: false,
				retryOf: '1000',
				status: 'waiting',
				waitTill: new Date('2026-01-01T00:05:00.000Z'),
				data: { resultData: { runData: {} } },
				workflowData: { id: 'workflow-1', name: 'My workflow', nodes: [], connections: {} },
				customData: { key: 'value' },
				annotation: { id: 1, vote: 'up', tags: [{ id: 'tag-1', name: 'important' }] },
				storedAt: 'db',
			}) as unknown as Omit<IExecutionResponse, 'createdAt'>;

		test('returns the first retry response and does not retry again', async () => {
			const executionServiceSpy = vi
				.spyOn(Container.get(ExecutionService), 'retry')
				.mockResolvedValue(retryServiceResponse());

			const workflow = await createWorkflow({}, owner);
			const execution = await createSuccessfulExecution(workflow);

			const first = await authOwnerAgent
				.post(`/executions/${execution.id}/retry`)
				.set('Idempotency-Key', 'retry-once');
			const second = await authOwnerAgent
				.post(`/executions/${execution.id}/retry`)
				.set('Idempotency-Key', 'retry-once');

			expect(first.statusCode).toBe(200);
			expect(second.statusCode).toBe(200);
			expect(second.body).toEqual(first.body);
			expect(executionServiceSpy).toHaveBeenCalledTimes(1);

			executionServiceSpy.mockRestore();
		});

		test('runs the retry again when the first attempt fails', async () => {
			const executionServiceSpy = vi
				.spyOn(Container.get(ExecutionService), 'retry')
				.mockRejectedValueOnce(new Error('temporary'))
				.mockResolvedValue(retryServiceResponse());

			const workflow = await createWorkflow({}, owner);
			const execution = await createSuccessfulExecution(workflow);

			const first = await authOwnerAgent
				.post(`/executions/${execution.id}/retry`)
				.set('Idempotency-Key', 'retry-after-error');
			const second = await authOwnerAgent
				.post(`/executions/${execution.id}/retry`)
				.set('Idempotency-Key', 'retry-after-error');

			expect(first.statusCode).toBeGreaterThanOrEqual(400);
			expect(second.statusCode).toBe(200);
			expect(executionServiceSpy).toHaveBeenCalledTimes(2);

			executionServiceSpy.mockRestore();
		});
	});
});
