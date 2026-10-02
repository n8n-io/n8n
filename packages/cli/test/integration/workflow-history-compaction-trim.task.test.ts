import type { EventService } from '@n8n/backend-services';
import { createWorkflow, createWorkflowHistory, mockLogger, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { DbConnection, WorkflowHistoryRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
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

	async function seedHistories(): Promise<void> {
		const base = Date.now() - VERSION_AGE_MS;
		for (const ids of versionIds) {
			const workflow = await createWorkflow({ versionId: ids[ids.length - 1], nodes: [node] });
			for (const [k, versionId] of ids.entries()) {
				await createWorkflowHistory({ ...workflow, versionId }, undefined, undefined, {
					createdAt: new Date(base + k * VERSION_SPACING_MS),
				});
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
});
