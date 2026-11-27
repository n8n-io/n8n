/**
 * GOV-401 spike proof. The same workflows run on engine v1 and on engine v2, with fixed
 * and dynamic time saved and with failures. v1 runs count in Insights through the
 * in-memory collector today. The new Insights fold step reads the `ended` rows of the
 * execution ledger instead. The proof compares the `insights_raw` rows and the Insights
 * summary of three paths: v1 through the collector, v1 through the fold step, and v2
 * through the ledger feed and the fold step.
 */

import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { CodeExecutionBackend } from '@n8n/backend-services';
import { EngineConfig, GlobalConfig } from '@n8n/config';
import type { Project, User, WorkflowEntity } from '@n8n/db';
import { ExecutionRepository, SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createDataSource } from '@n8n/engine';
import { DataSource } from '@n8n/typeorm';
import { InstanceSettings } from 'n8n-core';
import type { INode, IWorkflowSettings } from 'n8n-workflow';
import { createRunExecutionData, Expression, NodeConnectionTypes } from 'n8n-workflow';
import { writeFileSync } from 'node:fs';
import { mock } from 'vitest-mock-extended';
import { randomUUID } from 'node:crypto';

import { ExecutionLedgerModule } from '@n8n/backend-module-execution-ledger/module';
import { foldAllLedgerRows } from '@n8n/backend-module-execution-ledger/testing';
import {
	compactInsights,
	flushInsightsCollection,
	getInsightsSummary,
	initializeInsightsCollection,
	readRawInsights,
	registerInsightsLedgerFoldStep,
} from '@n8n/backend-module-insights/testing';
import { EngineV2Module } from '@/modules/engine-v2/engine-v2.module';
import { EngineV2LedgerFeed } from '@/modules/engine-v2/ledger-feed/engine-v2-ledger-feed';
import { packagedModules } from '@/modules/modules.manifest';
import { WorkflowRunner } from '@/workflow-runner';

import { createOwner } from './shared/db/users';
import * as utils from './shared/utils';
import { loadNodesFromDist } from './shared/utils/node-types-data';

const TRIGGER = 'Trigger';

const node = (name: string, type: string, parameters: INode['parameters'] = {}): INode => ({
	id: randomUUID(),
	name,
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters,
});

/** A chain of nodes after a manual trigger. */
function chain(nodes: INode[]) {
	const all = [node(TRIGGER, 'n8n-nodes-base.manualTrigger'), ...nodes];
	const connections = Object.fromEntries(
		all
			.slice(0, -1)
			.map((from, index) => [
				from.name,
				{ main: [[{ node: all[index + 1].name, type: NodeConnectionTypes.Main, index: 0 }]] },
			]),
	);
	return { nodes: all, connections };
}

const KINDS = {
	fixed: {
		runs: 4,
		settings: { timeSavedPerExecution: 5 },
		graph: () => chain([node('Done', 'n8n-nodes-base.noOp')]),
	},
	dynamic: {
		runs: 3,
		settings: { timeSavedMode: 'dynamic' },
		graph: () =>
			chain([
				node('Saved', 'n8n-nodes-base.timeSaved', { mode: 'once', minutesSaved: 3 }),
				node('Saved again', 'n8n-nodes-base.timeSaved', { mode: 'once', minutesSaved: 2 }),
				node('Done', 'n8n-nodes-base.noOp'),
			]),
	},
	failing: {
		runs: 2,
		settings: { timeSavedPerExecution: 5 },
		graph: () =>
			chain([
				node('Fail', 'n8n-nodes-base.stopAndError', {
					errorType: 'errorMessage',
					errorMessage: 'failed on purpose',
				}),
			]),
	},
} satisfies Record<
	string,
	{ runs: number; settings: IWorkflowSettings; graph: () => ReturnType<typeof chain> }
>;
type Kind = keyof typeof KINDS;

let engineDb: ReturnType<typeof createDataSource>;
let owner: User;
const projects: Record<'v1' | 'v2', Project> = {} as Record<'v1' | 'v2', Project>;
const workflows: Record<'v1' | 'v2', Record<Kind, WorkflowEntity>> = {
	v1: {} as Record<Kind, WorkflowEntity>,
	v2: {} as Record<Kind, WorkflowEntity>,
};

async function createEngineDatabase() {
	const { host, port, user, password, database } = Container.get(GlobalConfig).database.postgresdb;
	const connection = new DataSource({
		type: 'postgres',
		host,
		port,
		username: user,
		password,
		database,
	});
	await connection.initialize();
	const name = `engine_${Date.now()}`;
	await connection.query(`CREATE DATABASE ${name}`);
	await connection.destroy();
	return `postgres://${user}:${password}@${host}:${port}/${name}`;
}

beforeAll(async () => {
	await testModules.loadModules(['execution-ledger', 'insights', 'engine-v2'], packagedModules);
	await testDb.init();
	await new ExecutionLedgerModule().init();

	const nodeTypes = loadNodesFromDist([
		'n8n-nodes-base.manualTrigger',
		'n8n-nodes-base.noOp',
		'n8n-nodes-base.timeSaved',
		'n8n-nodes-base.stopAndError',
	]);
	await utils.initNodeTypes(nodeTypes);
	await utils.initBinaryDataService();
	Container.get(InstanceSettings).markAsLeader();

	// Both paths are on, so the same v1 runs reach the collector and the ledger.
	initializeInsightsCollection();
	registerInsightsLedgerFoldStep();

	// Engine v2 runs v1 nodes only with an isolated expression engine.
	await Expression.initExpressionEngine({
		engine: 'vm',
		poolSize: 1,
		maxCodeCacheSize: 1024,
		bridgeTimeout: 5000,
		bridgeMemoryLimit: 128,
	});
	// The workflows run no Code node, so no task runner is needed.
	Container.set(CodeExecutionBackend, mock<CodeExecutionBackend>());
	const databaseUrl = await createEngineDatabase();
	const engineConfig = Container.get(EngineConfig);
	engineConfig.mode = 'in-process';
	engineConfig.databaseUrl = databaseUrl;
	engineConfig.port = 40_000 + Math.floor(Math.random() * 5_000);
	engineConfig.controlPlanePort = engineConfig.port + 1;
	engineConfig.stepConcurrency = 8;
	engineConfig.orchestrationConcurrency = 8;
	await Container.get(EngineV2Module).init();
	Container.get(EngineV2LedgerFeed).settleMs = 500;

	engineDb = createDataSource(databaseUrl);
	await engineDb.initialize();

	owner = await createOwner();
	for (const engine of ['v1', 'v2'] as const) {
		projects[engine] = await createTeamProject(`Insights ${engine}`, owner);
		for (const [kind, { settings, graph }] of Object.entries(KINDS) as Array<
			[Kind, (typeof KINDS)[Kind]]
		>) {
			workflows[engine][kind] = await createWorkflow(
				{
					name: `${kind} ${engine}`,
					...graph(),
					settings: { ...settings, ...(engine === 'v2' ? { engineType: 'v2' } : {}) },
				},
				projects[engine],
			);
		}
	}
}, 180_000);

afterAll(async () => {
	await Container.get(EngineV2Module).shutdown();
	await Expression.disposeExpressionEngine();
	if (engineDb?.isInitialized) await engineDb.destroy();
	await testDb.terminate();
});

async function waitFor(check: () => Promise<boolean>, timeoutMs = 30_000) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (await check()) return;
		await new Promise((resolve) => setTimeout(resolve, 200));
	}
	throw new Error('timed out');
}

/** As a webhook run: the trigger and its output come first on the stack. */
function seededTrigger(workflow: WorkflowEntity) {
	const trigger = workflow.nodes.find((n) => n.name === TRIGGER)!;
	return createRunExecutionData({
		executionData: {
			nodeExecutionStack: [{ node: trigger, data: { main: [[{ json: {} }]] }, source: null }],
		},
	});
}

async function runAll(engine: 'v1' | 'v2') {
	const ids: string[] = [];
	for (const [kind, { runs }] of Object.entries(KINDS) as Array<[Kind, (typeof KINDS)[Kind]]>) {
		for (let run = 0; run < runs; run++) {
			ids.push(
				await Container.get(WorkflowRunner).run(
					{
						workflowData: workflows[engine][kind],
						executionMode: 'webhook',
						executionData: seededTrigger(workflows[engine][kind]),
						projectId: projects[engine].id,
					},
					true,
				),
			);
		}
	}
	return ids;
}

type Totals = Record<string, number>;

/** Sums of `insights_raw` for each workflow kind and type, for one engine. */
function totalsOf(rows: Awaited<ReturnType<typeof readRawInsights>>, engine: 'v1' | 'v2') {
	const totals: Record<Kind, Totals> = { fixed: {}, dynamic: {}, failing: {} };
	for (const row of rows) {
		const kind = (Object.keys(KINDS) as Kind[]).find(
			(k) => workflows[engine][k].id === row.workflowId,
		);
		if (!kind) continue;
		totals[kind][`${row.type} rows`] = (totals[kind][`${row.type} rows`] ?? 0) + 1;
		totals[kind][`${row.type} sum`] = (totals[kind][`${row.type} sum`] ?? 0) + row.value;
	}
	return totals;
}

async function summaryOf(engine: 'v1' | 'v2') {
	const summary = await getInsightsSummary({
		user: owner,
		projectId: projects[engine].id,
		startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
		endDate: new Date(Date.now() + 60 * 60 * 1000),
	});
	return {
		total: summary.total.value,
		failed: summary.failed.value,
		failureRate: summary.failureRate.value,
		timeSaved: summary.timeSaved.value,
		averageRunTime: summary.averageRunTime.value,
	};
}

describe('Insights on engine v2 (GOV-401 spike)', () => {
	it('gives the same Insights numbers for v1 and v2 runs of the same workflows', async () => {
		const v1Ids = await runAll('v1');
		const v2Ids = await runAll('v2');

		await waitFor(async () => {
			for (const id of v1Ids) {
				const row = await Container.get(ExecutionRepository).findOneBy({ id });
				if (!row?.stoppedAt) return false;
			}
			return true;
		});
		await waitFor(async () => {
			const rows = await engineDb.query<Array<{ id: string }>>(
				'SELECT id FROM workflow_execution WHERE id = ANY($1) AND finished_at IS NOT NULL',
				[v2Ids],
			);
			return rows.length === v2Ids.length;
		});
		// The ledger feed passes the last ended v2 run, and the v1 inserts, which nothing awaits, land.
		const [last] = await engineDb.query<Array<{ id: string }>>(
			'SELECT id FROM workflow_execution WHERE id = ANY($1) ORDER BY finished_at DESC, id DESC LIMIT 1',
			[v2Ids],
		);
		await waitFor(async () => {
			const cursor = await Container.get(SettingsRepository).findByKey(
				'engineV2.ledgerFeed.endedCursor',
			);
			return cursor?.value.includes(last.id) ?? false;
		});
		await new Promise((resolve) => setTimeout(resolve, 1_000));

		const engineRows = await engineDb.query<Array<Record<string, unknown>>>(
			`SELECT e.id, e.status, e.created_at, e.finished_at,
				(SELECT min(s.created_at) FROM workflow_step_execution s WHERE s.execution_id = e.id) AS first_step,
				(SELECT json_agg(json_build_object('node', s.node_id, 'status', s.status, 'error', s.error, 'metadata', s.metadata))
					FROM workflow_step_execution s WHERE s.execution_id = e.id) AS steps
			 FROM workflow_execution e WHERE e.id = ANY($1)`,
			[v2Ids],
		);

		// Path 1: v1 through the in-memory collector.
		await flushInsightsCollection();
		const collectorRows = await readRawInsights();
		const signal = new AbortController().signal;
		await compactInsights(signal);
		const collector = { v1: totalsOf(collectorRows, 'v1'), v2: totalsOf(collectorRows, 'v2') };
		const collectorSummary = { v1: await summaryOf('v1'), v2: await summaryOf('v2') };

		await testDb.truncate(['InsightsRaw', 'InsightsByPeriod']);

		// Paths 2 and 3: v1 and v2 through the ledger and the fold step.
		const folded = await foldAllLedgerRows();
		const foldRows = await readRawInsights();
		await compactInsights(signal);
		const fold = { v1: totalsOf(foldRows, 'v1'), v2: totalsOf(foldRows, 'v2') };
		const foldSummary = { v1: await summaryOf('v1'), v2: await summaryOf('v2') };

		const result = {
			ledgerRowsFolded: folded,
			insightsRaw: {
				'v1, collector': collector.v1,
				'v2, collector': collector.v2,
				'v1, fold step': fold.v1,
				'v2, fold step': fold.v2,
			},
			summary: {
				'v1, collector': collectorSummary.v1,
				'v2, collector': collectorSummary.v2,
				'v1, fold step': foldSummary.v1,
				'v2, fold step': foldSummary.v2,
			},
			v2Executions: engineRows,
		};
		console.log(JSON.stringify(result, null, 2));
		if (process.env.GOV401_RESULT) {
			writeFileSync(process.env.GOV401_RESULT, JSON.stringify(result, null, 2));
		}

		const counts = (totals: Record<Kind, Totals>) =>
			Object.fromEntries(
				Object.entries(totals).map(([kind, t]) => [
					kind,
					Object.fromEntries(Object.entries(t).filter(([key]) => !key.startsWith('runtime_ms s'))),
				]),
			);
		// A started and an ended row for each run, v1 and v2.
		expect(folded).toBe(4 * 9);
		// The collector never sees a v2 run.
		expect(collector.v2).toEqual({ fixed: {}, dynamic: {}, failing: {} });
		expect(counts(fold.v1)).toEqual(counts(collector.v1));
		expect(counts(fold.v2)).toEqual(counts(collector.v1));
		expect(fold.v2.dynamic['time_saved_min sum']).toBe(15);
		expect(fold.v2.fixed['time_saved_min sum']).toBe(20);
		expect(foldSummary.v2.total).toBe(collectorSummary.v1.total);
		expect(foldSummary.v2.failed).toBe(collectorSummary.v1.failed);
		expect(foldSummary.v2.timeSaved).toBe(collectorSummary.v1.timeSaved);
	}, 180_000);
});
