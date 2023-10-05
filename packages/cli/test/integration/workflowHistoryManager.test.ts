import { WorkflowHistoryRepository } from '@/databases/repositories';
import * as testDb from './shared/testDb';
import { License } from '@/License';
import { mockInstance } from './shared/utils';
import { WorkflowHistoryManager } from '@/workflows/workflowHistory/workflowHistoryManager.ee';
import Container from 'typedi';
import config from '@/config';
import { DateTime } from 'luxon';
import { In } from 'typeorm';

let licenseMock: License;
let licensePruneTime = -1;
let licenseEnabled = true;
let manager: WorkflowHistoryManager;

beforeAll(async () => {
	await testDb.init();

	licenseMock = mockInstance(License, {
		isWorkflowHistoryLicensed() {
			return licenseEnabled;
		},
		getWorkflowHistoryPruneLimit() {
			return licensePruneTime;
		},
	});
});

beforeEach(async () => {
	await testDb.truncate([WorkflowHistoryRepository]);
	jest.useRealTimers();
	jest.clearAllMocks();
	config.set('workflowHistory.enabled', true);
	config.set('workflowHistory.pruneTime', -1);
	licensePruneTime = -1;
	licenseEnabled = true;
});

afterEach(() => {
	manager?.shutdown();
});

describe('Workflow History Manager', () => {
	test('should prune on interval', () => {
		jest.useFakeTimers();

		manager = new WorkflowHistoryManager(Container.get(WorkflowHistoryRepository));
		manager.init();
		const pruneSpy = jest.spyOn(manager, 'prune');
		const currentCount = pruneSpy.mock.calls.length;

		jest.runOnlyPendingTimers();

		expect(pruneSpy).toBeCalledTimes(currentCount + 1);

		jest.runOnlyPendingTimers();
		expect(pruneSpy).toBeCalledTimes(currentCount + 2);
	});

	test('should not prune when not licensed', async () => {
		// Set a prune time just to make sure it gets to the delete
		config.set('workflowHistory.pruneTime', 24);

		licenseEnabled = false;

		const repo = Container.get(WorkflowHistoryRepository);
		manager = new WorkflowHistoryManager(repo);
		manager.init();

		const workflow = await testDb.createWorkflow();
		await testDb.createManyWorkflowHistoryItems(
			workflow.id,
			10,
			DateTime.now().minus({ days: 2 }).toJSDate(),
		);

		expect(await repo.count()).toBe(10);

		const deleteSpy = jest.spyOn(repo, 'delete');
		await manager.prune();
		expect(deleteSpy).not.toBeCalled();
		expect(await repo.count()).toBe(10);
	});

	test('should not prune when licensed but disabled', async () => {
		// Set a prune time just to make sure it gets to the delete
		config.set('workflowHistory.pruneTime', 24);

		config.set('workflowHistory.enabled', false);

		const repo = Container.get(WorkflowHistoryRepository);
		manager = new WorkflowHistoryManager(repo);
		manager.init();

		const workflow = await testDb.createWorkflow();
		await testDb.createManyWorkflowHistoryItems(
			workflow.id,
			10,
			DateTime.now().minus({ days: 2 }).toJSDate(),
		);

		expect(await repo.count()).toBe(10);

		const deleteSpy = jest.spyOn(repo, 'delete');
		await manager.prune();
		expect(deleteSpy).not.toBeCalled();
		expect(await repo.count()).toBe(10);
	});

	test('should not prune when both prune times are -1 (infinite)', async () => {
		config.set('workflowHistory.pruneTime', -1);
		licensePruneTime = -1;

		const repo = Container.get(WorkflowHistoryRepository);
		manager = new WorkflowHistoryManager(repo);
		manager.init();

		const workflow = await testDb.createWorkflow();
		await testDb.createManyWorkflowHistoryItems(
			workflow.id,
			10,
			DateTime.now().minus({ days: 2 }).toJSDate(),
		);

		expect(await repo.count()).toBe(10);

		const deleteSpy = jest.spyOn(repo, 'delete');
		await manager.prune();
		expect(deleteSpy).not.toBeCalled();
		expect(await repo.count()).toBe(10);
	});

	test('should prune when config prune time is not -1 (infinite)', async () => {
		config.set('workflowHistory.pruneTime', 24);
		licensePruneTime = -1;

		const repo = Container.get(WorkflowHistoryRepository);
		manager = new WorkflowHistoryManager(repo);
		manager.init();

		const workflow = await testDb.createWorkflow();
		await testDb.createManyWorkflowHistoryItems(
			workflow.id,
			10,
			DateTime.now().minus({ days: 2 }).toJSDate(),
		);

		expect(await repo.count()).toBe(10);

		const deleteSpy = jest.spyOn(repo, 'delete');
		await manager.prune();
		expect(deleteSpy).toBeCalled();
		expect(await repo.count()).toBe(0);
	});

	test('should prune when license prune time is not -1 (infinite)', async () => {
		config.set('workflowHistory.pruneTime', -1);
		licensePruneTime = 24;

		const repo = Container.get(WorkflowHistoryRepository);
		manager = new WorkflowHistoryManager(repo);
		manager.init();

		const workflow = await testDb.createWorkflow();
		await testDb.createManyWorkflowHistoryItems(
			workflow.id,
			10,
			DateTime.now().minus({ days: 2 }).toJSDate(),
		);

		expect(await repo.count()).toBe(10);

		const deleteSpy = jest.spyOn(repo, 'delete');
		await manager.prune();
		expect(deleteSpy).toBeCalled();
		expect(await repo.count()).toBe(0);
	});

	test('should only prune versions older than prune time', async () => {
		config.set('workflowHistory.pruneTime', 24);
		licensePruneTime = -1;

		const repo = Container.get(WorkflowHistoryRepository);
		manager = new WorkflowHistoryManager(repo);
		manager.init();

		const workflow = await testDb.createWorkflow();
		const recentVersions = await testDb.createManyWorkflowHistoryItems(workflow.id, 10);
		const oldVersions = await testDb.createManyWorkflowHistoryItems(
			workflow.id,
			10,
			DateTime.now().minus({ days: 2 }).toJSDate(),
		);

		expect(await repo.count()).toBe(20);

		const deleteSpy = jest.spyOn(repo, 'delete');
		await manager.prune();
		expect(deleteSpy).toBeCalled();
		expect(await repo.count()).toBe(10);
		expect(
			await repo.count({ where: { versionId: In(recentVersions.map((i) => i.versionId)) } }),
		).toBe(10);
		expect(
			await repo.count({ where: { versionId: In(oldVersions.map((i) => i.versionId)) } }),
		).toBe(0);
	});
});
