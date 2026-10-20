import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import type { IWorkflowDb, WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	createEmptyRunExecutionData,
	type ExecutionStatus,
	type IRun,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

import {
	collectInsights,
	compactInsights,
	flushInsights,
	getCompactedInsightsByWorkflow,
	initializeInsightsCollection,
	registerInsightsLedgerParticipant,
} from '@n8n/backend-module-insights/testing';
import { ExecutionLedgerFoldService } from '@/execution-ledger/execution-ledger-fold.service';
import { packagedModules } from '@/modules/modules.manifest';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';

type Run = {
	mode: WorkflowExecuteMode;
	status: ExecutionStatus;
	runtimeMs: number;
	savedMin?: number;
};

const runs: Run[] = [
	{ mode: 'webhook', status: 'success', runtimeMs: 120 },
	{ mode: 'webhook', status: 'success', runtimeMs: 80, savedMin: 3 },
	{ mode: 'trigger', status: 'error', runtimeMs: 45 },
	{ mode: 'webhook', status: 'crashed', runtimeMs: 10 },
	{ mode: 'error', status: 'success', runtimeMs: 30 },
	{ mode: 'manual', status: 'success', runtimeMs: 60 },
	{ mode: 'integrated', status: 'success', runtimeMs: 15 },
	{ mode: 'webhook', status: 'canceled', runtimeMs: 5 },
];

/** A dynamic-mode workflow reads time saved from SavedTime node metadata. */
function runData(run: Run): IRun {
	const data = createEmptyRunExecutionData();
	if (run.savedMin !== undefined) {
		data.resultData.runData = {
			SavedTime: [
				{
					startTime: 0,
					executionIndex: 0,
					executionTime: 1,
					source: [],
					metadata: { timeSaved: { minutes: run.savedMin } },
				},
			],
		};
	}
	const startedAt = new Date(Date.now() - run.runtimeMs);
	return {
		data,
		mode: run.mode,
		status: run.status,
		startedAt,
		stoppedAt: new Date(startedAt.getTime() + run.runtimeMs),
		storedAt: 'db',
	};
}

describe('Insights from the execution ledger', () => {
	beforeAll(async () => {
		await testModules.loadModules(['insights'], packagedModules);
		await testDb.init();
		initializeInsightsCollection();
		await registerInsightsLedgerParticipant();
		await import('@/services/workflow-statistics-ledger.participant.js');
	});

	afterAll(async () => {
		delete process.env.N8N_INSIGHTS_SOURCE;
		await testDb.terminate();
	});

	const drainLedger = async () => {
		const fold = Container.get(ExecutionLedgerFoldService);
		while ((await fold.foldBatch()) > 0) {}
	};

	const complete = async (workflow: WorkflowEntity & IWorkflowDb) => {
		for (const run of runs) {
			const data = runData(run);
			await collectInsights({
				type: 'workflowExecuteAfter',
				workflow,
				mode: run.mode,
				runData: data,
				newStaticData: {},
				executionId: '1',
				executedInThisProcess: true,
			});
			await Container.get(WorkflowStatisticsService).workflowExecutionCompleted(workflow, data);
		}
	};

	const totalsByType = async (workflowId: string) => {
		const rows = await getCompactedInsightsByWorkflow(workflowId);
		const totals: Record<string, number> = {};
		for (const row of rows) totals[row.type] = (totals[row.type] ?? 0) + row.value;
		return totals;
	};

	it('writes the same hourly buckets as the raw collector', async () => {
		const project = await createTeamProject();
		const settings = { timeSavedMode: 'dynamic' as const };
		const viaRaw = await createWorkflow({ name: 'raw', settings }, project);
		const viaLedger = await createWorkflow({ name: 'ledger', settings }, project);

		delete process.env.N8N_INSIGHTS_SOURCE;
		await complete(viaRaw);
		await flushInsights();
		await compactInsights(new AbortController().signal);
		await drainLedger();

		process.env.N8N_INSIGHTS_SOURCE = 'ledger';
		await complete(viaLedger);
		await drainLedger();

		const raw = await totalsByType(viaRaw.id);
		expect(raw).toEqual({
			success: 3,
			failure: 2,
			billable: 4,
			runtime_ms: 285,
			time_saved_min: 3,
		});
		expect(await totalsByType(viaLedger.id)).toEqual(raw);
	});
});
