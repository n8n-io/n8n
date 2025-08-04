'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const luxon_1 = require('luxon');
const executions_1 = require('@test-integration/db/executions');
describe('UserRepository', () => {
	let executionRepository;
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
		executionRepository = di_1.Container.get(db_1.ExecutionRepository);
	});
	beforeEach(async () => {
		await backend_test_utils_1.testDb.truncate(['ExecutionEntity']);
	});
	afterAll(async () => {
		await backend_test_utils_1.testDb.terminate();
	});
	describe('findManyByRangeQuery', () => {
		test('sort by `createdAt` if `startedAt` is null', async () => {
			const now = luxon_1.DateTime.utc();
			const workflow = await (0, backend_test_utils_1.createWorkflow)();
			const execution1 = await (0, executions_1.createExecution)(
				{
					createdAt: now.plus({ minute: 1 }).toJSDate(),
					startedAt: now.plus({ minute: 1 }).toJSDate(),
				},
				workflow,
			);
			const execution2 = await (0, executions_1.createExecution)(
				{
					createdAt: now.plus({ minute: 2 }).toJSDate(),
					startedAt: null,
				},
				workflow,
			);
			const execution3 = await (0, executions_1.createExecution)(
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
			expect(executions.map((e) => e.id)).toStrictEqual([
				execution3.id,
				execution2.id,
				execution1.id,
			]);
		});
	});
});
//# sourceMappingURL=execution.repository.test.js.map
