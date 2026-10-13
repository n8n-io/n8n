import type { EventService } from '@n8n/backend-services';
import { createWorkflow, createWorkflowHistory, mockLogger, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { DbConnection, WorkflowHistoryRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import repeat from 'lodash/repeat';
import type { InstanceSettings } from 'n8n-core';
import type { INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { mock } from 'vitest-mock-extended';

import { WorkflowHistoryCompactionOptimizeTask } from '@/services/pruning/workflow-history-compaction-optimize.task';
import { WorkflowHistoryCompactionService } from '@/services/pruning/workflow-history-compaction.service';

const OVERLAPPING_RUNS = 4;
const WORKFLOWS = 12;
const VERSIONS_PER_WORKFLOW = 8;
const PROTECTED_INDEX = 3;

type VersionSeed = {
	versionId: string;
	offsetMs: number;
	named: boolean;
	published: boolean;
	authors: string;
};

// Keep all versions inside the optimization window. Include names, publications,
// session gaps, and author changes that must retain intermediate versions.
const seeds: VersionSeed[][] = Array.from({ length: WORKFLOWS }, (_, workflowIndex) =>
	Array.from({ length: VERSIONS_PER_WORKFLOW }, (_, k) => {
		const variant = workflowIndex % 4;
		const sessionGapMs = variant === 3 && k >= 4 ? 30 * Time.minutes.toMilliseconds : 0;
		return {
			versionId: uuid(),
			offsetMs: k * Time.minutes.toMilliseconds + sessionGapMs,
			named: variant === 1 && k === PROTECTED_INDEX,
			published: variant === 2 && k === PROTECTED_INDEX,
			authors: variant === 3 && k >= 6 ? 'Other User' : 'Test User',
		};
	}),
);

const expectedVersionIds = seeds
	.flatMap((versions, workflowIndex) => {
		const retainedIndexes = [[7], [3, 7], [3, 7], [3, 5, 7]][workflowIndex % 4];
		return retainedIndexes.map((index) => versions[index].versionId);
	})
	.sort();

describe('WorkflowHistoryCompactionOptimizeTask', () => {
	const signal = new AbortController().signal;
	let repository: WorkflowHistoryRepository;
	const cleanups: Array<() => Promise<unknown>> = [];
	const releases: Array<() => void> = [];

	const node = {
		id: uuid(),
		name: 'node',
		parameters: {},
		type: 'aNodeType',
		typeVersion: 1,
		position: [0, 0],
	} satisfies INode;

	beforeAll(async () => {
		// Allow concurrent queries even when the test runner defaults to one connection.
		Container.get(GlobalConfig).database.postgresdb.poolSize = OVERLAPPING_RUNS;
		await testDb.init();
		repository = Container.get(WorkflowHistoryRepository);
	});

	afterEach(async () => {
		for (const release of releases.splice(0)) {
			release();
		}
		await Promise.all(cleanups.splice(0).map(async (cleanup) => await cleanup()));
		vi.restoreAllMocks();
		await testDb.truncate(['WorkflowEntity', 'WorkflowHistory', 'WorkflowPublishHistory']);
	});

	afterAll(async () => await testDb.terminate());

	// Each main has its own service, so the local guard cannot serialize these passes.
	function createTask() {
		const globalConfig = Container.get(GlobalConfig);
		const config = { ...globalConfig.workflowHistoryCompaction, batchDelayMs: 0 };
		const logger = mockLogger();
		const eventService = mock<EventService>();
		const service = new WorkflowHistoryCompactionService(
			config,
			globalConfig,
			logger,
			mock<InstanceSettings>({ instanceType: 'main', isLeader: false }),
			Container.get(DbConnection),
			repository,
			eventService,
		);
		return {
			task: new WorkflowHistoryCompactionOptimizeTask(config, service),
			logger,
			eventService,
		};
	}

	async function seedHistories(): Promise<void> {
		const base = Date.now() - Time.hours.toMilliseconds;
		for (const versions of seeds) {
			const workflow = await createWorkflow({ versionId: versions[versions.length - 1].versionId });
			for (const [k, version] of versions.entries()) {
				await createWorkflowHistory(
					{
						...workflow,
						versionId: version.versionId,
						nodes: [{ ...node, parameters: { a: repeat('1', k + 1) } }],
					},
					undefined,
					version.published ? {} : undefined,
					{
						createdAt: new Date(base + version.offsetMs),
						authors: version.authors,
						name: version.named ? 'Named version' : null,
					},
				);
			}
		}
	}

	async function remainingVersionIds(): Promise<string[]> {
		const rows = await repository.find({ select: { versionId: true } });
		return rows.map(({ versionId }) => versionId).sort();
	}

	it('leaves the same versions as one pass when passes on several mains overlap', async () => {
		await seedHistories();
		await createTask().task.run(signal);
		const afterOnePass = await remainingVersionIds();
		expect(afterOnePass).toEqual(expectedVersionIds);
		await testDb.truncate(['WorkflowEntity', 'WorkflowHistory', 'WorkflowPublishHistory']);

		await seedHistories();
		const ready = createDeferredPromise();
		releases.push(() => ready.resolve());
		const deleteVersions = repository.delete.bind(repository);
		let waiting = 0;
		vi.spyOn(repository, 'delete').mockImplementation(async (criteria) => {
			// All mains must read their first snapshot before any of them deletes it.
			if (++waiting === OVERLAPPING_RUNS) {
				ready.resolve();
			}
			await ready.promise;
			return await deleteVersions(criteria);
		});
		const tasks = Array.from({ length: OVERLAPPING_RUNS }, createTask);
		const passes = tasks.map(async ({ task }) => await task.run(signal));
		cleanups.push(async () => await Promise.allSettled(passes));
		await Promise.all(passes);

		expect(await remainingVersionIds()).toEqual(afterOnePass);
		const reportedDeletes = tasks
			.flatMap(({ eventService }) => eventService.emit.mock.calls)
			.reduce(
				(sum, [, payload]) =>
					sum + (payload as { totalVersionsDeleted: number }).totalVersionsDeleted,
				0,
			);
		expect(reportedDeletes).toBe(WORKFLOWS * VERSIONS_PER_WORKFLOW - afterOnePass.length);
		for (const { logger, eventService } of tasks) {
			expect(logger.error).not.toHaveBeenCalled();
			expect(eventService.emit).toHaveBeenCalledWith(
				'history-compacted',
				expect.objectContaining({ workflowsProcessed: WORKFLOWS, errorCount: 0 }),
			);
		}
	});
});
