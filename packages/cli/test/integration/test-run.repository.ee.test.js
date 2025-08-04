'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const evaluation_1 = require('@test-integration/db/evaluation');
describe('TestRunRepository', () => {
	let testRunRepository;
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
		testRunRepository = di_1.Container.get(db_1.TestRunRepository);
	});
	afterEach(async () => {
		await backend_test_utils_1.testDb.truncate([
			'User',
			'WorkflowEntity',
			'TestRun',
			'TestCaseExecution',
		]);
	});
	afterAll(async () => {
		await backend_test_utils_1.testDb.terminate();
	});
	describe('getTestRunSummaryById', () => {
		let workflow;
		beforeAll(async () => {
			workflow = await (0, backend_test_utils_1.createWorkflow)();
		});
		it('should return the final result of a test run', async () => {
			const testRun = await (0, evaluation_1.createTestRun)(workflow.id, {
				status: 'completed',
				runAt: new Date(),
				completedAt: new Date(),
				metrics: { total: 1, success: 1 },
			});
			await Promise.all([
				(0, evaluation_1.createTestCaseExecution)(testRun.id, {
					status: 'success',
				}),
				(0, evaluation_1.createTestCaseExecution)(testRun.id, {
					status: 'success',
				}),
			]);
			const result = await testRunRepository.getTestRunSummaryById(testRun.id);
			expect(result).toEqual(
				expect.objectContaining({
					id: testRun.id,
					workflowId: workflow.id,
					status: 'completed',
					finalResult: 'success',
					runAt: expect.any(Date),
					completedAt: expect.any(Date),
					metrics: { total: 1, success: 1 },
				}),
			);
		});
	});
});
//# sourceMappingURL=test-run.repository.ee.test.js.map
