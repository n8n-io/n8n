import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { ExecutionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { DateTime } from 'luxon';

import { createExecution } from '@test-integration/db/executions';

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
		test('sort by `createdAt` if `startedAt` is null', async () => {
			const now = DateTime.utc();
			const workflow = await createWorkflow();
			const execution1 = await createExecution(
				{
					createdAt: now.plus({ minute: 1 }).toJSDate(),
					startedAt: now.plus({ minute: 1 }).toJSDate(),
				},
				workflow,
			);
			const execution2 = await createExecution(
				{
					createdAt: now.plus({ minute: 2 }).toJSDate(),
					startedAt: null,
				},
				workflow,
			);
			const execution3 = await createExecution(
				{
					createdAt: now.plus({ minute: 3 }).toJSDate(),
					startedAt: now.plus({ minute: 3 }).toJSDate(),
				},
				workflow,
			);

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
