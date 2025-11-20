import { createWorkflow, testDb, mockInstance } from '@n8n/backend-test-utils';
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
		await testDb.truncate(['WorkflowEntity']);
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

		const activeWorkflow = await createWorkflow({ active: true });
		const inactiveWorkflow = await createWorkflow({ active: false });

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

	describe('Race condition prevention and error handling', () => {
		test('should prevent overlapping prune operations', async () => {
			globalConfig.workflowHistory.pruneTime = 24;
			await createWorkflowHistory();

			const logger = Container.get(WorkflowHistoryManager)['logger'];
			const debugSpy = jest.spyOn(logger, 'debug');

			// Mock the repository method to delay completion
			const deleteSpy = jest.spyOn(repo, 'deleteEarlierThanExceptCurrent').mockImplementation(
				() =>
					new Promise((resolve) => {
						setTimeout(resolve, 100);
					}),
			);

			// Start first prune operation
			const firstPrunePromise = manager.prune();

			// Immediately try to start second prune operation while first is running
			const secondPrunePromise = manager.prune();

			// Wait for both to complete
			await Promise.all([firstPrunePromise, secondPrunePromise]);

			// Second prune should have been skipped
			expect(debugSpy).toHaveBeenCalledWith(
				'Prune operation already in progress, skipping this cycle.',
			);

			// Only one actual delete should have been called
			expect(deleteSpy).toHaveBeenCalledTimes(1);

			deleteSpy.mockRestore();
			debugSpy.mockRestore();
		});

		test('should log warning when init() is called multiple times', () => {
			const logger = Container.get(WorkflowHistoryManager)['logger'];
			const warnSpy = jest.spyOn(logger, 'warn');

			jest.useFakeTimers();
			manager.init();

			// Call init() again
			manager.init();

			expect(warnSpy).toHaveBeenCalledWith(
				'WorkflowHistoryManager.init() called multiple times. Restarting prune timer.',
			);

			manager.shutdown();
			jest.clearAllTimers();
			jest.useRealTimers();
			warnSpy.mockRestore();
		});

		test('should handle errors during prune and reset isPruning flag', async () => {
			globalConfig.workflowHistory.pruneTime = 24;
			await createWorkflowHistory();

			const logger = Container.get(WorkflowHistoryManager)['logger'];
			const errorSpy = jest.spyOn(logger, 'error');
			const debugSpy = jest.spyOn(logger, 'debug');

			// Mock repository to throw an error
			const deleteSpy = jest
				.spyOn(repo, 'deleteEarlierThanExceptCurrent')
				.mockRejectedValueOnce(new Error('Database error'));

			await manager.prune();

			// Error should be logged
			expect(errorSpy).toHaveBeenCalledWith('Failed to prune workflow history', {
				error: expect.objectContaining({
					message: 'Database error',
					name: 'Error',
				}),
			});

			// Reset mock to allow successful second prune
			deleteSpy.mockRestore();

			// isPruning flag should be reset, allowing another prune
			await manager.prune();

			// Should not log "already in progress" message
			expect(debugSpy).not.toHaveBeenCalledWith(
				'Prune operation already in progress, skipping this cycle.',
			);

			errorSpy.mockRestore();
			debugSpy.mockRestore();
		});

		test('should reset isPruning flag even when pruneHours is -1 (early return)', async () => {
			globalConfig.workflowHistory.pruneTime = -1;
			license.getWorkflowHistoryPruneLimit.mockReturnValue(-1);

			const logger = Container.get(WorkflowHistoryManager)['logger'];

			// First call with -1 should return early
			await manager.prune();

			// Second call should not be blocked (isPruning should be reset)
			const debugSpy = jest.spyOn(logger, 'debug');
			await manager.prune();

			// Should not log "already in progress" message
			expect(debugSpy).not.toHaveBeenCalledWith(
				'Prune operation already in progress, skipping this cycle.',
			);

			debugSpy.mockRestore();
		});

		test('should allow prune after previous prune completes', async () => {
			globalConfig.workflowHistory.pruneTime = 24;
			await createWorkflowHistory();

			const logger = Container.get(WorkflowHistoryManager)['logger'];
			const debugSpy = jest.spyOn(logger, 'debug');

			// First prune
			await manager.prune();

			// Second prune after first completes
			await manager.prune();

			// Should not log "already in progress" message
			expect(debugSpy).not.toHaveBeenCalledWith(
				'Prune operation already in progress, skipping this cycle.',
			);

			debugSpy.mockRestore();
		});

		test('should properly cleanup interval on shutdown', () => {
			jest.useFakeTimers();
			manager.init();

			// Verify timer exists
			expect(manager['pruneTimer']).toBeDefined();

			manager.shutdown();

			// Timer should be cleared
			expect(manager['pruneTimer']).toBeUndefined();

			jest.clearAllTimers();
			jest.useRealTimers();
		});
	});

	const createWorkflowHistory = async (ageInDays = 2) => {
		const workflow = await createWorkflow();
		const time = DateTime.now().minus({ days: ageInDays }).toJSDate();
		return await createManyWorkflowHistoryItems(workflow.id, 10, time);
	};

	const pruneAndAssertCount = async (finalCount = 10, initialCount = 10) => {
		expect(await repo.count()).toBe(initialCount);

		const deleteSpy = jest.spyOn(repo, 'deleteEarlierThanExceptCurrent');
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
