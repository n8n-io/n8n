import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { createExecution } from '@test-integration/db/executions';
import { createWorkflow } from '@test-integration/db/workflows';

import * as testDb from './shared/test-db';

describe('UserRepository', () => {
	let executionRepository: ExecutionRepository;

	beforeAll(async () => {
		await testDb.init();
		executionRepository = Container.get(ExecutionRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['ExecutionEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('findManyByRangeQuery', () => {
		// eslint-disable-next-line n8n-local-rules/no-skipped-tests
		test.skip('sort by `createdAt` if `startedAt` is null', async () => {
			const workflow = await createWorkflow();
			const execution1 = await createExecution({}, workflow);
			const execution2 = await createExecution({ startedAt: null }, workflow);
			const execution3 = await createExecution({}, workflow);

			const executions = await executionRepository.findManyByRangeQuery({
				workflowId: workflow.id,
				accessibleWorkflowIds: [workflow.id],
				kind: 'range',
				range: { limit: 10 },
				order: { startedAt: 'DESC' },
			});

			// Executions are returned in reverse order, and if `startedAt` is not
			// defined `createdAt` is used.
			expect(executions.map((e) => e.id)).toStrictEqual([
				execution3.id,
				execution2.id,
				execution1.id,
			]);
		});
	});
});
