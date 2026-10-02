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

const OVERLAPPING_RUNS = 4;
const WORKFLOWS = 4;
const VERSIONS_PER_WORKFLOW = 14;
const VERSION_SPACING_MS = 10 * Time.seconds.toMilliseconds;
// Inside the trim window, which is 6 to 8 days ago with the default config.
const VERSION_AGE_MS = 7 * Time.days.toMilliseconds;
// A small workflow keeps one version per minute: the newest anchors a bucket,
// and the first version a full minute older anchors the next.
const RETAINED_INDEXES = [1, 7, 13];

const versionIds = Array.from({ length: WORKFLOWS }, () =>
	Array.from({ length: VERSIONS_PER_WORKFLOW }, () => uuid()),
);
const expectedVersionIds = versionIds
	.flatMap((ids) => RETAINED_INDEXES.map((index) => ids[index]))
	.sort();

const node = {
	id: uuid(),
	name: 'node',
	parameters: { a: 'x' },
	type: 'aNodeType',
	typeVersion: 1,
	position: [0, 0],
} satisfies INode;

// One workflow whose versions are not evenly spaced and not the same size. A
// small workflow keeps one version per minute, measured to the kept neighbour.
const MIXED_OFFSETS_S = [0, 100, 200, 280, 300, 380, 400];
const MIXED_LARGE_INDEX = 2;
const MIXED_RETAINED_INDEXES = [0, 1, 2, 4, 6];
const mixedVersionIds = MIXED_OFFSETS_S.map(() => uuid());
const expectedMixedVersionIds = MIXED_RETAINED_INDEXES.map(
	(index) => mixedVersionIds[index],
).sort();

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

	function historyBaseTime(): number {
		// Keep all fixture versions inside the day-anchored trim window, even near midnight.
		const startOfDay = DateTime.now()
			.setZone(Container.get(GlobalConfig).generic.timezone)
			.startOf('day');
		return startOfDay.toMillis() - VERSION_AGE_MS;
	}

	async function seedHistories(): Promise<void> {
		const base = historyBaseTime();
		for (const ids of versionIds) {
			const workflow = await createWorkflow({ versionId: ids[ids.length - 1], nodes: [node] });
			for (const [k, versionId] of ids.entries()) {
				await createWorkflowHistory({ ...workflow, versionId }, undefined, undefined, {
					createdAt: new Date(base + k * VERSION_SPACING_MS),
				});
			}
		}
	}

	async function seedMixedHistories(): Promise<void> {
		const base = historyBaseTime();
		const workflow = await createWorkflow({
			versionId: mixedVersionIds[mixedVersionIds.length - 1],
			nodes: [node],
		});
		for (const [k, versionId] of mixedVersionIds.entries()) {
			const parameters = k === MIXED_LARGE_INDEX ? { a: 'x'.repeat(200) } : node.parameters;
			await createWorkflowHistory(
				{ ...workflow, versionId, nodes: [{ ...node, parameters }] },
				undefined,
				undefined,
				{ createdAt: new Date(base + MIXED_OFFSETS_S[k] * Time.seconds.toMilliseconds) },
			);
		}
	}

	async function remainingVersionIds(): Promise<string[]> {
		const rows = await repository.find({ select: { versionId: true } });
		return rows.map(({ versionId }) => versionId).sort();
	}

	it('deletes nothing twice and logs no error when passes read the same snapshot', async () => {
		await seedHistories();
		await createTask().task.run(signal);
		const afterOnePass = await remainingVersionIds();
		expect(afterOnePass).toEqual(expectedVersionIds);
		await testDb.truncate(['WorkflowEntity', 'WorkflowHistory']);

		await seedHistories();
		const ready = createDeferredPromise();
		const deleteVersions = repository.delete.bind(repository);
		let waiting = 0;
		vi.spyOn(repository, 'delete').mockImplementation(async (criteria) => {
			// All mains must read their first snapshot before any of them deletes it.
			if (++waiting === OVERLAPPING_RUNS) ready.resolve();
			await ready.promise;
			return await deleteVersions(criteria);
		});
		const tasks = Array.from({ length: OVERLAPPING_RUNS }, createTask);
		await Promise.all(tasks.map(async ({ task }) => await task.run(signal)));

		expect(await remainingVersionIds()).toEqual(afterOnePass);
		for (const { logger } of tasks) {
			expect(logger.error).not.toHaveBeenCalled();
		}
	});

	it('leaves the same versions as one pass when later passes read what an earlier one left', async () => {
		await seedMixedHistories();
		await createTask().task.run(signal);
		const afterOnePass = await remainingVersionIds();
		expect(afterOnePass).toEqual(expectedMixedVersionIds);

		// The later passes read the survivors of the first pass, and each other's snapshot.
		const ready = createDeferredPromise();
		const deleteVersions = repository.delete.bind(repository);
		let waiting = 0;
		vi.spyOn(repository, 'delete').mockImplementation(async (criteria) => {
			if (++waiting === OVERLAPPING_RUNS - 1) ready.resolve();
			await ready.promise;
			return await deleteVersions(criteria);
		});
		const tasks = Array.from({ length: OVERLAPPING_RUNS - 1 }, createTask);
		await Promise.all(tasks.map(async ({ task }) => await task.run(signal)));

		expect(await remainingVersionIds()).toEqual(afterOnePass);
		for (const { logger } of tasks) {
			expect(logger.error).not.toHaveBeenCalled();
		}
	});

	it('keeps a version that is named between the read and the delete', async () => {
		await seedHistories();
		const namedLate = versionIds[0][0];
		const deleteVersions = repository.delete.bind(repository);
		vi.spyOn(repository, 'delete').mockImplementation(async (criteria) => {
			// Name the version after its workflow was read and right before its delete.
			const { versionId } = criteria as unknown as { versionId: { value: string[] } };
			if (versionId.value.includes(namedLate)) {
				await repository.update({ versionId: namedLate }, { name: 'named late' });
			}
			return await deleteVersions(criteria);
		});

		await createTask().task.run(signal);

		expect(await remainingVersionIds()).toEqual([...expectedVersionIds, namedLate].sort());
	});
});
