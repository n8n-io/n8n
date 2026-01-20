import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { ExecutionDataRepository, ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { DbStore } from '../db-store';
import type { ExecutionDataPayload, ExecutionRef } from '../types';
import { executionId, payload, ref, workflowId } from './mocks';

let dbStore: DbStore;
let repository: ExecutionDataRepository;
let executionRepository: ExecutionRepository;

async function createExecution(id: string) {
	await executionRepository.save({
		id,
		workflowId,
		finished: true,
		mode: 'manual',
		createdAt: new Date(),
		startedAt: new Date(),
		stoppedAt: new Date(),
		status: 'success',
	});
}

beforeAll(async () => {
	await testDb.init();
	repository = Container.get(ExecutionDataRepository);
	executionRepository = Container.get(ExecutionRepository);
	dbStore = Container.get(DbStore);
});

beforeEach(async () => {
	await testDb.truncate(['ExecutionData', 'ExecutionEntity', 'WorkflowEntity']);
	await createWorkflow({ id: workflowId });
});

afterAll(async () => {
	await testDb.terminate();
});

describe('write', () => {
	it('should store execution data', async () => {
		await createExecution(executionId);
		await dbStore.write(ref, payload);

		const stored = await repository.findOneBy({ executionId });

		expect(stored).toMatchObject(payload);
	});

	it('should overwrite on duplicate `executionId`', async () => {
		await createExecution(executionId);
		await dbStore.write(ref, payload);

		const updatedPayload: ExecutionDataPayload = {
			...payload,
			data: '[[{"json":{"updated":true}},null]]',
		};

		await dbStore.write(ref, updatedPayload);

		const count = await repository.count();
		expect(count).toBe(1);

		const stored = await repository.findOneBy({ executionId });
		expect(stored).toMatchObject(updatedPayload);
	});
});

describe('read', () => {
	it('should retrieve stored execution data', async () => {
		await createExecution(executionId);
		await dbStore.write(ref, payload);

		const stored = await dbStore.read(ref);

		expect(stored).toMatchObject({ ...payload, version: 1 });
	});

	it('should return `null` for non-existent execution', async () => {
		const result = await dbStore.read({ workflowId, executionId: '999' });

		expect(result).toBeNull();
	});
});

describe('delete', () => {
	it('should delete data for single execution', async () => {
		await createExecution(executionId);
		await dbStore.write(ref, payload);

		await dbStore.delete(ref);

		const result = await repository.findOneBy({ executionId });
		expect(result).toBeNull();
	});

	it('should delete data for multiple executions', async () => {
		const refs: ExecutionRef[] = [
			{ workflowId, executionId: '1' },
			{ workflowId, executionId: '2' },
			{ workflowId, executionId: '3' },
		];

		for (const r of refs) {
			await createExecution(r.executionId);
			await dbStore.write(r, payload);
		}

		await dbStore.delete([refs[0], refs[1]]);

		const remaining = await repository.find();
		expect(remaining[0].executionId).toBe('3');
	});

	it('should skip deletion on empty array', async () => {
		await createExecution(executionId);
		await dbStore.write(ref, payload);

		await dbStore.delete([]);

		const count = await repository.count();
		expect(count).toBe(1);
	});

	it('should not throw on deleting a non-existent execution', async () => {
		await expect(dbStore.delete({ workflowId, executionId: '999' })).resolves.not.toThrow();
	});
});
