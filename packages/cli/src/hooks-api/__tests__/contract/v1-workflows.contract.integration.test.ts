/**
 * Contract tests for `WorkflowsApiV1`. See v1-ownership.contract.integration.test.ts.
 */
import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { HooksApiV1 } from '@n8n/hooks-api';

import { ExternalHooks } from '@/external-hooks';
import { HooksApiService } from '@/hooks-api/hooks-api.service';
import { createExecution } from '@test-integration/db/executions';

let api: HooksApiV1;

beforeAll(async () => {
	await testDb.init();

	Container.get(ExternalHooks).registerFunctions.push(async (hooksApi) => {
		if (!hooksApi.v1) throw new Error('V1 is not offered');
		api = hooksApi.v1;
	});
	await Container.get(HooksApiService).register();
});

afterEach(async () => {
	await testDb.truncate(['ExecutionEntity', 'WorkflowEntity']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('WorkflowsApiV1 contract', () => {
	describe('getWorkflowIdForExecution()', () => {
		it('returns the ID of the workflow that the execution belongs to', async () => {
			const workflow = await createWorkflow();
			const execution = await createExecution({}, workflow);

			await expect(api.workflows.getWorkflowIdForExecution(execution.id)).resolves.toBe(
				workflow.id,
			);
		});

		it('also finds executions that are soft-deleted', async () => {
			const workflow = await createWorkflow();
			const execution = await createExecution({}, workflow);
			await Container.get(ExecutionRepository).softDelete(execution.id);

			await expect(api.workflows.getWorkflowIdForExecution(execution.id)).resolves.toBe(
				workflow.id,
			);
		});

		it.each(['999999', 'does-not-exist', ''])(
			'returns null for an execution that does not exist (%j)',
			async (executionId) => {
				await expect(api.workflows.getWorkflowIdForExecution(executionId)).resolves.toBeNull();
			},
		);
	});
});
