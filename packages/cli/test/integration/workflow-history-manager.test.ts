import {
	createWorkflow,
	testDb,
	mockInstance,
	createActiveWorkflow,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { WorkflowHistoryRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { In } from '@n8n/typeorm';
import { DateTime } from 'luxon';

import { License } from '@/license';
import { WorkflowHistoryManager } from '@/workflows/workflow-history/workflow-history-manager';

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
		await testDb.truncate(['WorkflowEntity', 'WorkflowHistory']);
		jest.clearAllMocks();

		globalConfig.workflowHistory.pruneTime = -1;

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

	test('should not prune current versions', async () => {
		globalConfig.workflowHistory.pruneTime = 24;

		const activeWorkflow = await createActiveWorkflow();
		const inactiveWorkflow = await createWorkflow();

		// Create old history versions for the active workflow
		const activeWorkflowVersions = await createManyWorkflowHistoryItems(
			activeWorkflow.id,
			5,
			DateTime.now().minus({ days: 2 }).toJSDate(),
		);

		// Create old history versions for the inactive workflow
		const inactiveWorkflowVersions = await createManyWorkflowHistoryItems(
			inactiveWorkflow.id,
			5,
			DateTime.now().minus({ days: 2 }).toJSDate(),
		);

		// Set the current version for each workflow
		activeWorkflow.versionId = activeWorkflowVersions[0].versionId;
		inactiveWorkflow.versionId = inactiveWorkflowVersions[0].versionId;

		const workflowRepo = Container.get(WorkflowRepository);
		await workflowRepo.save([activeWorkflow, inactiveWorkflow]);

		await manager.prune();

		// Both workflows' current versions should still exist even though they are old
		expect(await repo.count({ where: { versionId: activeWorkflow.versionId } })).toBe(1);
		expect(await repo.count({ where: { versionId: inactiveWorkflow.versionId } })).toBe(1);

		// Other old versions should be deleted
		const otherVersionIds = [
			...activeWorkflowVersions.slice(1).map((i) => i.versionId),
			...inactiveWorkflowVersions.slice(1).map((i) => i.versionId),
		];
		expect(await repo.count({ where: { versionId: In(otherVersionIds) } })).toBe(0);
	});

	test('should not prune current or active versions when they differ', async () => {
		globalConfig.workflowHistory.pruneTime = 24;

		const workflow = await createActiveWorkflow();

		// Create old history versions
		const workflowVersions = await createManyWorkflowHistoryItems(
			workflow.id,
			5,
			DateTime.now().minus({ days: 2 }).toJSDate(),
		);

		// Set current version to one version and active version to a different version
		workflow.versionId = workflowVersions[0].versionId;
		workflow.activeVersionId = workflowVersions[1].versionId;

		const workflowRepo = Container.get(WorkflowRepository);
		await workflowRepo.save(workflow);

		await manager.prune();

		// Both current and active versions should still exist even though they are old
		expect(await repo.count({ where: { versionId: workflow.versionId } })).toBe(1);
		expect(await repo.count({ where: { versionId: workflow.activeVersionId } })).toBe(1);

		// Other old versions should be deleted
		const otherVersionIds = workflowVersions.slice(2).map((i) => i.versionId);
		expect(await repo.count({ where: { versionId: In(otherVersionIds) } })).toBe(0);
	});

	const createWorkflowHistory = async (ageInDays = 2) => {
		const workflow = await createWorkflow();
		const time = DateTime.now().minus({ days: ageInDays }).toJSDate();
		return await createManyWorkflowHistoryItems(workflow.id, 10, time);
	};

	const pruneAndAssertCount = async (finalCount = 10, initialCount = 10) => {
		expect(await repo.count()).toBe(initialCount);

		const deleteSpy = jest.spyOn(repo, 'deleteEarlierThanExceptCurrentAndActive');
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
