import { mockLogger, createWorkflow, testDb, createWorkflowHistory } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { DbConnection, WorkflowHistoryRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import repeat from 'lodash/repeat';
import { InstanceSettings } from 'n8n-core';
import { sleep, type INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { WorkflowHistoryCompactionService } from '@/services/pruning/workflow-history-compaction.service';

describe('compacting cycle', () => {
	let compactionService: WorkflowHistoryCompactionService;
	const instanceSettings = Container.get(InstanceSettings);
	instanceSettings.markAsLeader();

	const now = Date.now();
	// before minimum compacting age
	const todayA = new Date(now - 0.3 * Time.days.toMilliseconds);
	const todayB = new Date(now - 0.5 * Time.days.toMilliseconds);
	// within first hour
	const yesterdayA = new Date(now - 1.005 * Time.days.toMilliseconds);
	const yesterdayB = new Date(now - 1.004 * Time.days.toMilliseconds);
	const yesterdayC = new Date(now - 1.003 * Time.days.toMilliseconds);
	const yesterdayD = new Date(now - 1.002 * Time.days.toMilliseconds);
	const yesterdayE = new Date(now - 1.001 * Time.days.toMilliseconds);
	const lastWeekA = new Date(now - 7.5 * Time.days.toMilliseconds);
	const lastWeekB = new Date(now - 7.3 * Time.days.toMilliseconds);

	const wf1_versions = Array<string>(10)
		.fill('')
		.map(() => uuid());
	const wf2_versions = Array<string>(10)
		.fill('')
		.map(() => uuid());
	const wf3_versions = Array<string>(10)
		.fill('')
		.map(() => uuid());

	const testNode1 = {
		id: uuid(),
		name: 'testNode1',
		parameters: {},
		type: 'aNodeType',
		typeVersion: 1,
		position: [0, 0],
	} satisfies INode;

	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowEntity', 'WorkflowHistory', 'WorkflowPublishHistory']);

		compactionService = new WorkflowHistoryCompactionService(
			Container.get(GlobalConfig).workflowHistoryCompaction,
			mockLogger(),
			instanceSettings,
			Container.get(DbConnection),
			Container.get(WorkflowHistoryRepository),
		);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('compacts select workflow versions', async () => {
		// ARRANGE
		const wf1 = await createWorkflow({ versionId: wf1_versions[0] });

		const wf1_history: Array<[Date, string]> = [
			lastWeekA,
			lastWeekB,
			yesterdayA,
			yesterdayB,
			yesterdayC,
			yesterdayD,
			yesterdayE,
			todayA,
			todayB,
		].map((x) => [x, uuid()]);

		for (const [i, [createdAt, versionId]] of wf1_history.entries()) {
			await createWorkflowHistory(
				{ ...wf1, versionId, nodes: [{ ...testNode1, parameters: { a: repeat('1', i + 1) } }] },
				undefined,
				undefined,
				{
					createdAt,
				},
			);
		}

		const wf2_history: Array<[Date, string]> = [
			yesterdayA,
			yesterdayB,
			yesterdayC,
			yesterdayD,
			yesterdayE,
		].map((x) => [x, uuid()]);
		const wf2 = await createWorkflow({ versionId: wf2_versions[0] });

		for (const [i, [createdAt, versionId]] of wf2_history.entries()) {
			await createWorkflowHistory(
				{ ...wf2, versionId, nodes: [{ ...testNode1, parameters: { a: repeat('1', i + 1) } }] },
				undefined,
				undefined,
				{
					createdAt,
				},
			);
		}

		// ACT
		await compactionService['compactHistories']();

		// ASSERT
		const allHistories = await Container.get(WorkflowHistoryRepository).find({});
		const expectedVersions = [
			wf1_history[0],
			wf1_history[1],
			wf1_history[2],
			wf1_history[6],
			wf1_history[7],
			wf1_history[8],
			wf2_history[0],
			wf2_history[4],
		].map((x) => x[1]);
		expect(allHistories.map((x) => x.versionId)).toEqual(expect.arrayContaining(expectedVersions));
	});

	it('should honor batching', async () => {
		// ARRANGE
		const wf1 = await createWorkflow({ versionId: wf1_versions[0] });
		const wf1_history: Array<[Date, string]> = [lastWeekB, yesterdayA, yesterdayB, yesterdayC].map(
			(x) => [x, uuid()],
		);
		for (const [i, [createdAt, versionId]] of wf1_history.entries()) {
			await createWorkflowHistory(
				{ ...wf1, versionId, nodes: [{ ...testNode1, parameters: { a: repeat('1', i + 1) } }] },
				undefined,
				undefined,
				{
					createdAt,
				},
			);
		}

		const wf2_history: Array<[Date, string]> = [yesterdayA, yesterdayB, yesterdayC].map((x) => [
			x,
			uuid(),
		]);
		const wf2 = await createWorkflow({ versionId: wf2_versions[0] });
		for (const [i, [createdAt, versionId]] of wf2_history.entries()) {
			await createWorkflowHistory(
				{ ...wf2, versionId, nodes: [{ ...testNode1, parameters: { a: repeat('1', i + 1) } }] },
				undefined,
				undefined,
				{
					createdAt,
				},
			);
		}

		const wf3_history: Array<[Date, string]> = [yesterdayA, yesterdayB, yesterdayC].map((x) => [
			x,
			uuid(),
		]);
		const wf3 = await createWorkflow({ versionId: wf3_versions[0] });
		for (const [i, [createdAt, versionId]] of wf3_history.entries()) {
			await createWorkflowHistory(
				{ ...wf3, versionId, nodes: [{ ...testNode1, parameters: { a: repeat('1', i + 1) } }] },
				undefined,
				undefined,
				{
					createdAt,
				},
			);
		}

		// ACT
		compactionService = new WorkflowHistoryCompactionService(
			{
				...Container.get(GlobalConfig).workflowHistoryCompaction,
				batchDelayMs: 10_000,
				batchSize: 5,
				compactingMinimumAgeHours: 24,
			},
			mockLogger(),
			instanceSettings,
			Container.get(DbConnection),
			Container.get(WorkflowHistoryRepository),
		);

		// Expect wf1 and wf2 to be handled in the first batch, with wf3 untouched due to the long delay after batching
		void compactionService['compactHistories']();
		await sleep(500);

		// ASSERT
		const allHistories = await Container.get(WorkflowHistoryRepository).find({});
		const allVersions = allHistories.map((x) => x.versionId);

		const expectedVersions = [
			wf1_history[0],
			wf1_history[1],
			wf1_history[3],
			wf2_history[0],
			wf2_history[2],
			wf3_history[0],
			wf3_history[2],
		].map((x) => x[1]);
		expect(allVersions).toEqual(expect.arrayContaining(expectedVersions));

		const includesWf1 = allVersions.includes(wf1_history[2][1]);
		const includesWf2 = allVersions.includes(wf2_history[1][1]);
		const includesWf3 = allVersions.includes(wf3_history[1][1]);

		// Batching should cause the compaction to stop before one of the three workflows
		// Is handled.
		expect(0 + +includesWf1 + +includesWf2 + +includesWf3).toBe(1);
	});
});
