import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { ExecutionDataRepository, ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { DbStore } from '../db-store';
import { createExecutionRef } from '../types';
import type { ExecutionDataPayload } from '../types';
import { payload, workflowId } from './mocks';

let dbStore: DbStore;
let repository: ExecutionDataRepository;
let executionRepository: ExecutionRepository;

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

		await dbStore.write(ref, payload);

		const stored = await repository.findOneBy({ executionId: execution.id });

		expect(stored).toMatchObject(payload);
	});

	it('should overwrite on duplicate `executionId`', async () => {
		const execution = await createExecution();
		const ref = createExecutionRef(workflowId, execution.id);

		await dbStore.write(ref, payload);

		const updatedPayload: ExecutionDataPayload = {
			...payload,
			data: '[[{"json":{"updated":true}},null]]',
		};

		await dbStore.write(ref, updatedPayload);

		const count = await repository.count();
		expect(count).toBe(1);

		const stored = await repository.findOneBy({ executionId: execution.id });
		expect(stored).toMatchObject(updatedPayload);
	});
});

describe('read', () => {
	it('should retrieve stored execution data', async () => {
		const execution = await createExecution();
		const ref = createExecutionRef(workflowId, execution.id);

		await dbStore.write(ref, payload);

		const stored = await dbStore.read(ref);

		expect(stored).toMatchObject({ ...payload, version: 1 });
	});

	it('should return `null` for non-existent execution', async () => {
		const result = await dbStore.read(createExecutionRef(workflowId, '999'));

		expect(result).toBeNull();
	});
});

describe('delete', () => {
	it('should delete data for single execution', async () => {
		const execution = await createExecution();
		const ref = createExecutionRef(workflowId, execution.id);

		await dbStore.write(ref, payload);

		await dbStore.delete(ref);

		const result = await repository.findOneBy({ executionId: execution.id });
		expect(result).toBeNull();
	});

	it('should delete data for multiple executions', async () => {
		const executions = await Promise.all([createExecution(), createExecution(), createExecution()]);

		const refs = executions.map((e) => createExecutionRef(workflowId, e.id));

		for (const ref of refs) {
			await dbStore.write(ref, payload);
		}

		await dbStore.delete([refs[0], refs[1]]);

		const remaining = await repository.find();
		expect(remaining).toHaveLength(1);
		expect(remaining[0].executionId).toBe(executions[2].id);
	});

	it('should skip deletion on empty array', async () => {
		const execution = await createExecution();
		const ref = createExecutionRef(workflowId, execution.id);

		await dbStore.write(ref, payload);

		await dbStore.delete([]);

		const count = await repository.count();
		expect(count).toBe(1);
	});

	it('should not throw on deleting a non-existent execution', async () => {
		await expect(dbStore.delete(createExecutionRef(workflowId, '999'))).resolves.toBeUndefined();
	});
});
