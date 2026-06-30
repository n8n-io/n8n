import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import type { CreateExecutionPayload, WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { createEmptyRunExecutionData } from 'n8n-workflow';

import { DuplicateExecutionError } from '@/errors/duplicate-execution.error';
import { ExecutionPersistence } from '@/executions/execution-persistence';

describe('ExecutionPersistence', () => {
	let executionPersistence: ExecutionPersistence;

	beforeAll(async () => {
		await testDb.init();
		executionPersistence = Container.get(ExecutionPersistence);
	});

	beforeEach(async () => {
		await testDb.truncate(['ExecutionEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('create with deduplicationKey', () => {
		const buildPayload = (
			workflow: WorkflowEntity,
			deduplicationKey?: string,
		): CreateExecutionPayload => ({
			data: createEmptyRunExecutionData(),
			workflowData: workflow,
			mode: 'trigger',
			finished: false,
			status: 'new',
			workflowId: workflow.id,
			deduplicationKey,
		});

		it('creates multiple executions when deduplicationKey is null', async () => {
			const workflow = await createWorkflow();

			const id1 = await executionPersistence.create(buildPayload(workflow));
			const id2 = await executionPersistence.create(buildPayload(workflow));
			const id3 = await executionPersistence.create(buildPayload(workflow));

			expect(new Set([id1, id2, id3]).size).toBe(3);
		});

		it('creates executions with distinct deduplicationKeys', async () => {
			const workflow = await createWorkflow();

			const id1 = await executionPersistence.create(buildPayload(workflow, 'wf:node:t1'));
			const id2 = await executionPersistence.create(buildPayload(workflow, 'wf:node:t2'));

			expect(id1).not.toBe(id2);
		});

		it('throws DuplicateExecutionError when deduplicationKey is reused', async () => {
			const workflow = await createWorkflow();
			const key = 'wf:node:t1';

			await executionPersistence.create(buildPayload(workflow, key));

			await expect(executionPersistence.create(buildPayload(workflow, key))).rejects.toBeInstanceOf(
				DuplicateExecutionError,
			);
			await expect(executionPersistence.create(buildPayload(workflow, key))).rejects.toMatchObject({
				deduplicationKey: key,
			});
		});
	});
});
