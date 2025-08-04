'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
const luxon_1 = require('luxon');
const license_1 = require('@/license');
const workflow_history_manager_ee_1 = require('@/workflows/workflow-history.ee/workflow-history-manager.ee');
const workflow_history_1 = require('./shared/db/workflow-history');
describe('Workflow History Manager', () => {
	const license = (0, backend_test_utils_1.mockInstance)(license_1.License);
	let repo;
	let manager;
	let globalConfig;
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
		repo = di_1.Container.get(db_1.WorkflowHistoryRepository);
		manager = di_1.Container.get(workflow_history_manager_ee_1.WorkflowHistoryManager);
		globalConfig = di_1.Container.get(config_1.GlobalConfig);
	});
	beforeEach(async () => {
		await backend_test_utils_1.testDb.truncate(['WorkflowEntity']);
		jest.clearAllMocks();
		globalConfig.workflowHistory.enabled = true;
		globalConfig.workflowHistory.pruneTime = -1;
		license.isWorkflowHistoryLicensed.mockReturnValue(true);
		license.getWorkflowHistoryPruneLimit.mockReturnValue(-1);
	});
	afterAll(async () => {
		await backend_test_utils_1.testDb.terminate();
	});
	test('should prune on interval', () => {
		const pruneSpy = jest.spyOn(manager, 'prune');
		const currentCount = pruneSpy.mock.calls.length;
		jest.useFakeTimers();
		manager.init();
		jest.runOnlyPendingTimers();
		expect(pruneSpy).toBeCalledTimes(currentCount + 1);
		jest.runOnlyPendingTimers();
		expect(pruneSpy).toBeCalledTimes(currentCount + 2);
		manager.shutdown();
		jest.clearAllTimers();
		jest.useRealTimers();
		pruneSpy.mockRestore();
	});
	test('should not prune when not licensed', async () => {
		license.isWorkflowHistoryLicensed.mockReturnValue(false);
		await createWorkflowHistory();
		await pruneAndAssertCount();
	});
	test('should not prune when licensed but disabled', async () => {
		globalConfig.workflowHistory.enabled = false;
		await createWorkflowHistory();
		await pruneAndAssertCount();
	});
	test('should not prune when both prune times are -1 (infinite)', async () => {
		await createWorkflowHistory();
		await pruneAndAssertCount();
	});
	test('should prune when config prune time is not -1 (infinite)', async () => {
		globalConfig.workflowHistory.pruneTime = 24;
		await createWorkflowHistory();
		await pruneAndAssertCount(0);
	});
	test('should prune when license prune time is not -1 (infinite)', async () => {
		license.getWorkflowHistoryPruneLimit.mockReturnValue(24);
		await createWorkflowHistory();
		await pruneAndAssertCount(0);
	});
	test('should only prune versions older than prune time', async () => {
		globalConfig.workflowHistory.pruneTime = 24;
		const recentVersions = await createWorkflowHistory(0);
		const oldVersions = await createWorkflowHistory();
		await pruneAndAssertCount(10, 20);
		expect(
			await repo.count({
				where: { versionId: (0, typeorm_1.In)(recentVersions.map((i) => i.versionId)) },
			}),
		).toBe(10);
		expect(
			await repo.count({
				where: { versionId: (0, typeorm_1.In)(oldVersions.map((i) => i.versionId)) },
			}),
		).toBe(0);
	});
	const createWorkflowHistory = async (ageInDays = 2) => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)();
		const time = luxon_1.DateTime.now().minus({ days: ageInDays }).toJSDate();
		return await (0, workflow_history_1.createManyWorkflowHistoryItems)(workflow.id, 10, time);
	};
	const pruneAndAssertCount = async (finalCount = 10, initialCount = 10) => {
		expect(await repo.count()).toBe(initialCount);
		const deleteSpy = jest.spyOn(repo, 'delete');
		await manager.prune();
		if (initialCount === finalCount) {
			expect(deleteSpy).not.toBeCalled();
		} else {
			expect(deleteSpy).toBeCalled();
		}
		deleteSpy.mockRestore();
		expect(await repo.count()).toBe(finalCount);
	};
});
//# sourceMappingURL=workflow-history-manager.test.js.map
