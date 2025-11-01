import { createWorkflow, testDb, mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { WorkflowHistoryRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { In } from '@n8n/typeorm';
import { DateTime } from 'luxon';

import { License } from '@/license';
import { WorkflowHistoryManager } from '@/workflows/workflow-history.ee/workflow-history-manager.ee';

import { createManyWorkflowHistoryItems } from './shared/db/workflow-history';

describe('Workflow History Manager', () => {
	const license = mockInstance(License);
	let repo: WorkflowHistoryRepository;
	let manager: WorkflowHistoryManager;
	let globalConfig: GlobalConfig;

	beforeAll(async () => {
		await testDb.init();
		repo = Container.get(WorkflowHistoryRepository);
		manager = Container.get(WorkflowHistoryManager);
		globalConfig = Container.get(GlobalConfig);
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowEntity']);
		jest.clearAllMocks();

		globalConfig.workflowHistory.enabled = true;
		globalConfig.workflowHistory.pruneTime = -1;

		license.isWorkflowHistoryLicensed.mockReturnValue(true);
		license.getWorkflowHistoryPruneLimit.mockReturnValue(-1);
	});

	afterAll(async () => {
		await testDb.terminate();
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
			await repo.count({ where: { versionId: In(recentVersions.map((i) => i.versionId)) } }),
		).toBe(10);
		expect(
			await repo.count({ where: { versionId: In(oldVersions.map((i) => i.versionId)) } }),
		).toBe(0);
	});

	const createWorkflowHistory = async (ageInDays = 2) => {
		const workflow = await createWorkflow();
		const time = DateTime.now().minus({ days: ageInDays }).toJSDate();
		return await createManyWorkflowHistoryItems(workflow.id, 10, time);
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
