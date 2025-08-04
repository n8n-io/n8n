'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const evaluation_1 = require('../../shared/db/evaluation');
describe('WorkflowRepository', () => {
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
	});
	beforeEach(async () => {
		await backend_test_utils_1.testDb.truncate(['WorkflowEntity']);
	});
	afterAll(async () => {
		await backend_test_utils_1.testDb.terminate();
	});
	describe('activateAll', () => {
		it('should activate all workflows', async () => {
			const workflowRepository = di_1.Container.get(db_1.WorkflowRepository);
			const workflows = await Promise.all([
				(0, backend_test_utils_1.createWorkflowWithTrigger)(),
				(0, backend_test_utils_1.createWorkflowWithTrigger)(),
			]);
			expect(workflows).toMatchObject([{ active: false }, { active: false }]);
			await workflowRepository.activateAll();
			const after = await (0, backend_test_utils_1.getAllWorkflows)();
			expect(after).toMatchObject([{ active: true }, { active: true }]);
		});
	});
	describe('deactivateAll', () => {
		it('should deactivate all workflows', async () => {
			const workflowRepository = di_1.Container.get(db_1.WorkflowRepository);
			const workflows = await Promise.all([
				(0, backend_test_utils_1.createWorkflowWithTrigger)({ active: true }),
				(0, backend_test_utils_1.createWorkflowWithTrigger)({ active: true }),
			]);
			expect(workflows).toMatchObject([{ active: true }, { active: true }]);
			await workflowRepository.deactivateAll();
			const after = await (0, backend_test_utils_1.getAllWorkflows)();
			expect(after).toMatchObject([{ active: false }, { active: false }]);
		});
	});
	describe('getActiveIds', () => {
		it('should return all active workflow IDs when invoked without maxResults', async () => {
			const workflows = await Promise.all([
				(0, backend_test_utils_1.createWorkflow)({ active: true }),
				(0, backend_test_utils_1.createWorkflow)({ active: false }),
				(0, backend_test_utils_1.createWorkflow)({ active: false }),
			]);
			const activeIds = await di_1.Container.get(db_1.WorkflowRepository).getActiveIds();
			expect(activeIds).toEqual([workflows[0].id]);
			expect(activeIds).toHaveLength(1);
		});
		it('should return a capped number of active workflow IDs when invoked with maxResults', async () => {
			await Promise.all([
				(0, backend_test_utils_1.createWorkflow)({ active: true }),
				(0, backend_test_utils_1.createWorkflow)({ active: false }),
				(0, backend_test_utils_1.createWorkflow)({ active: true }),
			]);
			const activeIds = await di_1.Container.get(db_1.WorkflowRepository).getActiveIds({
				maxResults: 1,
			});
			expect(activeIds).toHaveLength(1);
		});
	});
	describe('getWorkflowsWithEvaluationCount', () => {
		it('should return 0 when no workflows have test runs', async () => {
			const workflowRepository = di_1.Container.get(db_1.WorkflowRepository);
			await (0, backend_test_utils_1.createWorkflow)();
			await (0, backend_test_utils_1.createWorkflow)();
			const count = await workflowRepository.getWorkflowsWithEvaluationCount();
			expect(count).toBe(0);
		});
		it('should return correct count when some workflows have test runs', async () => {
			const workflowRepository = di_1.Container.get(db_1.WorkflowRepository);
			const workflow1 = await (0, backend_test_utils_1.createWorkflow)();
			await (0, backend_test_utils_1.createWorkflow)();
			const workflow3 = await (0, backend_test_utils_1.createWorkflow)();
			await (0, evaluation_1.createTestRun)(workflow1.id);
			await (0, evaluation_1.createTestRun)(workflow3.id);
			const count = await workflowRepository.getWorkflowsWithEvaluationCount();
			expect(count).toBe(2);
		});
		it('should count each workflow only once even with multiple test runs', async () => {
			const workflowRepository = di_1.Container.get(db_1.WorkflowRepository);
			const workflow1 = await (0, backend_test_utils_1.createWorkflow)();
			const workflow2 = await (0, backend_test_utils_1.createWorkflow)();
			await (0, evaluation_1.createTestRun)(workflow1.id);
			await (0, evaluation_1.createTestRun)(workflow1.id);
			await (0, evaluation_1.createTestRun)(workflow1.id);
			await (0, evaluation_1.createTestRun)(workflow2.id);
			await (0, evaluation_1.createTestRun)(workflow2.id);
			const count = await workflowRepository.getWorkflowsWithEvaluationCount();
			expect(count).toBe(2);
		});
	});
});
//# sourceMappingURL=workflow.repository.test.js.map
