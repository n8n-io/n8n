import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { ExecutionDataRepository, ExecutionRepository } from '@n8n/db';
import type { EntityManager } from '@n8n/db';
import { Container } from '@n8n/di';

import { DbStore } from '../db-store';
import { MissingExecutionDataError } from '../missing-execution-data.error';
import { createExecutionRef } from '../types';
import type { ExecutionDataPayload } from '../types';
import { payload, workflowId } from './mocks';

let dbStore: DbStore;
let repository: ExecutionDataRepository;
let executionRepository: ExecutionRepository;
let em: EntityManager;

async function createExecution() {
	const execution = await executionRepository.save({
		workflowId,
		finished: true,
		mode: 'manual',
		createdAt: new Date(),
		startedAt: new Date(),
		stoppedAt: new Date(),
		status: 'success',
	});

	return execution;
}

beforeAll(async () => {
	await testDb.init();
	repository = Container.get(ExecutionDataRepository);
	executionRepository = Container.get(ExecutionRepository);
	em = executionRepository.manager;
	dbStore = Container.get(DbStore);
	await createWorkflow({ id: workflowId });
});

beforeEach(async () => {
	await testDb.truncate(['ExecutionData', 'ExecutionEntity']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('write', () => {
	it('should store execution data', async () => {
		const execution = await createExecution();
		const ref = createExecutionRef(workflowId, execution.id);

		await dbStore.write(ref, payload, em);

		const stored = await repository.findOneBy({ executionId: execution.id });

		expect(stored).toMatchObject(payload);
	});

	it('should return the byte size of the stored bundle', async () => {
		const execution = await createExecution();
		const ref = createExecutionRef(workflowId, execution.id);

		const bytes = await dbStore.write(ref, payload, em);

		const expected =
			Buffer.byteLength(payload.data, 'utf8') +
			Buffer.byteLength(JSON.stringify(payload.workflowData), 'utf8') +
			Buffer.byteLength(payload.workflowVersionId ?? '', 'utf8');
		expect(bytes).toBe(expected);
	});

	it('should overwrite on duplicate `executionId`', async () => {
		const execution = await createExecution();
		const ref = createExecutionRef(workflowId, execution.id);

		await dbStore.write(ref, payload, em);

		const updatedPayload: ExecutionDataPayload = {
			...payload,
			data: '[[{"json":{"updated":true}},null]]',
		};

		await dbStore.write(ref, updatedPayload, em);

		const count = await repository.count();
		expect(count).toBe(1);

		const stored = await repository.findOneBy({ executionId: execution.id });
		expect(stored).toMatchObject(updatedPayload);
	});
});

describe('overwrite', () => {
	it('should replace data and snapshot in place and return the byte size', async () => {
		const execution = await createExecution();
		const ref = createExecutionRef(workflowId, execution.id);
		await dbStore.write(ref, payload, em);

		const updatedPayload: ExecutionDataPayload = {
			...payload,
			data: '[[{"json":{"updated":true}},null]]',
		};
		const bytes = await dbStore.overwrite(ref, updatedPayload, em);

		const expected =
			Buffer.byteLength(updatedPayload.data, 'utf8') +
			Buffer.byteLength(JSON.stringify(updatedPayload.workflowData), 'utf8') +
			Buffer.byteLength(updatedPayload.workflowVersionId ?? '', 'utf8');
		expect(bytes).toBe(expected);

		const stored = await repository.findOneBy({ executionId: execution.id });
		expect(stored).toMatchObject(updatedPayload);
	});

	it('should throw MissingExecutionDataError when the row does not exist', async () => {
		const ref = createExecutionRef(workflowId, '999');

		await expect(dbStore.overwrite(ref, payload, em)).rejects.toThrow(MissingExecutionDataError);
	});
});

describe('read', () => {
	it('should retrieve stored execution data', async () => {
		const execution = await createExecution();
		const ref = createExecutionRef(workflowId, execution.id);

		await dbStore.write(ref, payload, em);

		const stored = await dbStore.read(ref);

		expect(stored).toMatchObject(payload);
	});

	it('should return `null` for non-existent execution', async () => {
		const result = await dbStore.read(createExecutionRef(workflowId, '999'));

		expect(result).toBeNull();
	});
});

describe('readMany', () => {
	it('should return a map of payloads keyed by executionId, omitting missing ones', async () => {
		const [a, b] = await Promise.all([createExecution(), createExecution()]);
		const refA = createExecutionRef(workflowId, a.id);
		const refB = createExecutionRef(workflowId, b.id);
		await dbStore.write(refA, payload, em);

		const payloads = await dbStore.readMany([refA, refB]);

		expect(payloads.size).toBe(1);
		expect(payloads.get(a.id)).toMatchObject(payload);
		expect(payloads.has(b.id)).toBe(false);
	});

	it('should return an empty map for an empty array', async () => {
		const payloads = await dbStore.readMany([]);

		expect(payloads.size).toBe(0);
	});

	it('should batch the IN-clause so a large id set stays within the DB parameter limit', async () => {
		const refs = Array.from({ length: 2500 }, (_, i) =>
			createExecutionRef(workflowId, String(100000 + i)),
		);

		await expect(dbStore.readMany(refs)).resolves.toEqual(new Map());
	});
});

describe('readWorkflowData', () => {
	it('should retrieve only the workflow snapshot', async () => {
		const execution = await createExecution();
		const ref = createExecutionRef(workflowId, execution.id);

		await dbStore.write(ref, payload, em);

		const snapshot = await dbStore.readWorkflowData(ref);

		expect(snapshot).toMatchObject({
			workflowData: payload.workflowData,
			workflowVersionId: payload.workflowVersionId,
		});
	});

	it('should return `null` for non-existent execution', async () => {
		const result = await dbStore.readWorkflowData(createExecutionRef(workflowId, '999'));

		expect(result).toBeNull();
	});
});
