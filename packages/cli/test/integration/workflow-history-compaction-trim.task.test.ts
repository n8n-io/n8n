import type { Logger } from '@n8n/backend-common';
import type { EventService } from '@n8n/backend-services';
import { createWorkflow, createWorkflowHistory, mockLogger, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { DbConnection, WorkflowHistoryRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { DateTime } from 'luxon';
import type { InstanceSettings } from 'n8n-core';
import type { INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { mock } from 'vitest-mock-extended';

import { WorkflowHistoryCompactionTrimTask } from '@/services/pruning/workflow-history-compaction-trim.task';
import { WorkflowHistoryCompactionService } from '@/services/pruning/workflow-history-compaction.service';

const OVERLAPPING_RUNS = 3;
// Inside the trim window, which is 6 to 8 days ago with the default config.
const VERSION_AGE_MS = 7 * Time.days.toMilliseconds;

// One workflow whose versions are not evenly spaced and not the same size. A
// small workflow keeps one version per minute, measured to the kept neighbour.
const OFFSETS_S = [0, 100, 200, 280, 300, 380, 400];
const LARGE_INDEX = 2;
const RETAINED_INDEXES = [0, 1, 2, 4, 6];
const versionIds = OFFSETS_S.map(() => uuid());
const expectedVersionIds = RETAINED_INDEXES.map((index) => versionIds[index]).sort();

const node = {
	id: uuid(),
	name: 'node',
	parameters: { a: 'x' },
	type: 'aNodeType',
	typeVersion: 1,
	position: [0, 0],
} satisfies INode;

describe('WorkflowHistoryCompactionTrimTask', () => {
	const signal = new AbortController().signal;
	let repository: WorkflowHistoryRepository;

	beforeAll(async () => {
		// Allow concurrent queries even when the test runner defaults to one connection.
		Container.get(GlobalConfig).database.postgresdb.poolSize = OVERLAPPING_RUNS;
		await testDb.init();
		repository = Container.get(WorkflowHistoryRepository);
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await testDb.truncate(['WorkflowEntity', 'WorkflowHistory']);
	});

	afterAll(async () => await testDb.terminate());

	// Each main has its own service, so the local guard cannot serialize these passes.
	function createTask() {
		const globalConfig = Container.get(GlobalConfig);
		const logger = mockLogger();
		const service = new WorkflowHistoryCompactionService(
			{ ...globalConfig.workflowHistoryCompaction, batchDelayMs: 0 },
			globalConfig,
			logger,
			mock<InstanceSettings>({ instanceType: 'main', isLeader: false }),
			Container.get(DbConnection),
			repository,
			mock<EventService>(),
		);
		return { task: new WorkflowHistoryCompactionTrimTask(service), logger };
	}

	async function seedHistory(): Promise<void> {
		// Keep all versions inside the day-anchored trim window, even near midnight.
		const startOfDay = DateTime.now()
			.setZone(Container.get(GlobalConfig).generic.timezone)
			.startOf('day');
		const base = startOfDay.toMillis() - VERSION_AGE_MS;
		const workflow = await createWorkflow({
			versionId: versionIds[versionIds.length - 1],
			nodes: [node],
		});
		for (const [k, versionId] of versionIds.entries()) {
			const parameters = k === LARGE_INDEX ? { a: 'x'.repeat(200) } : node.parameters;
			await createWorkflowHistory(
				{ ...workflow, versionId, nodes: [{ ...node, parameters }] },
				undefined,
				undefined,
				{ createdAt: new Date(base + OFFSETS_S[k] * Time.seconds.toMilliseconds) },
			);
		}
	}

	async function remainingVersionIds(): Promise<string[]> {
		const rows = await repository.find({ select: { versionId: true } });
		return rows.map(({ versionId }) => versionId).sort();
	}

	// Every pass reads its snapshot before any pass deletes from it.
	async function runOverlappingPasses(): Promise<Logger[]> {
		const ready = createDeferredPromise();
		const deleteVersions = repository.delete.bind(repository);
		let waiting = 0;
		vi.spyOn(repository, 'delete').mockImplementation(async (criteria) => {
			if (++waiting === OVERLAPPING_RUNS) ready.resolve();
			await ready.promise;
			return await deleteVersions(criteria);
		});
		const tasks = Array.from({ length: OVERLAPPING_RUNS }, createTask);
		await Promise.all(tasks.map(async ({ task }) => await task.run(signal)));
		return tasks.map(({ logger }) => logger);
	}

	it('leaves the same versions as one pass when passes read the same snapshot', async () => {
		await seedHistory();

		const loggers = await runOverlappingPasses();

		expect(await remainingVersionIds()).toEqual(expectedVersionIds);
		for (const logger of loggers) {
			expect(logger.error).not.toHaveBeenCalled();
		}
	});

	it('leaves the same versions as one pass when later passes read what an earlier one left', async () => {
		await seedHistory();
		await createTask().task.run(signal);
		expect(await remainingVersionIds()).toEqual(expectedVersionIds);

		const loggers = await runOverlappingPasses();

		expect(await remainingVersionIds()).toEqual(expectedVersionIds);
		for (const logger of loggers) {
			expect(logger.error).not.toHaveBeenCalled();
		}
	});
});
