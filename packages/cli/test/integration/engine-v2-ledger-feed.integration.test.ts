import { Logger } from '@n8n/backend-common';
import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { ExecutionLedger } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import type { ExecutionLedgerRow, Project, WorkflowEntity } from '@n8n/db';
import { SettingsRepository, TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import type { IStepExecutor, WorkflowGraph } from '@n8n/engine';
import {
	AllowAllAdmittance,
	createDataSource,
	createEngineRuntime,
	createInMemoryWorkQueues,
	mintIdentityToken,
	noopExecutionResponseSender,
	SharedSecretIdentityVerifier,
} from '@n8n/engine';
import { DataSource } from '@n8n/typeorm';
import { InstanceSettings } from 'n8n-core';
import { writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { v7 as uuidv7 } from 'uuid';

import { ExecutionLedgerModule } from '@n8n/backend-module-execution-ledger/module';
import { claimAllLedgerRows } from '@n8n/backend-module-execution-ledger/testing';
import type { EngineDataPlaneClient } from '@/modules/engine-v2/engine-data-plane-client';
import { EngineV2LedgerFeed } from '@/modules/engine-v2/ledger-feed/engine-v2-ledger-feed';
import { packagedModules } from '@/modules/modules.manifest';

/**
 * GOV-400 spike proof, part 2. Each run of the parent workflow calls one sub-workflow,
 * so the data plane starts one run by itself. The control-plane ledger feed must write
 * one `started` row for each sub-workflow run and one `ended` row for each run, under
 * load and across a two-second outage of the control plane.
 */

const secret = 'a'.repeat(32);
const token = () => mintIdentityToken(secret, { cpId: 'cp-1', tenantId: 'tenant-1' });

const parentGraph: WorkflowGraph = {
	nodes: [
		{ id: 'trigger', name: 'Webhook', type: 'trigger' },
		{ id: 'node-a', name: 'A', type: 'v1-node' },
		{ id: 'call', name: 'Call sub-workflow', type: 'v1-node' },
		{ id: 'node-b', name: 'B', type: 'v1-node' },
	],
	edges: [
		{ from: 'trigger', to: 'node-a', outputIndex: 0, inputIndex: 0 },
		{ from: 'node-a', to: 'call', outputIndex: 0, inputIndex: 0 },
		{ from: 'call', to: 'node-b', outputIndex: 0, inputIndex: 0 },
	],
};

const subGraph: WorkflowGraph = {
	nodes: [
		{ id: 'sub-trigger', name: 'When called', type: 'trigger' },
		{ id: 'sub-a', name: 'Sub A', type: 'v1-node' },
	],
	edges: [{ from: 'sub-trigger', to: 'sub-a', outputIndex: 0, inputIndex: 0 }],
};

let subWorkflow: WorkflowEntity;

/** Every tenth parent run fails at B, after its sub-workflow run ended. */
const executor: IStepExecutor = {
	execute: async ({ node, inputs, resume }) => {
		await new Promise((resolve) => setTimeout(resolve, 1));
		if (node.id === 'call' && !resume) {
			return {
				subExecution: {
					executionId: uuidv7(),
					workflowId: subWorkflow.id,
					graph: subGraph,
					workflow: { id: subWorkflow.id, name: subWorkflow.name, nodes: [], connections: {} },
					triggerOutputs: [{ called: true }],
					awaited: true,
				},
			};
		}
		if (node.id === 'node-b' && JSON.stringify(inputs).includes('"fail":true')) {
			throw new Error('B failed on purpose');
		}
		return { outputs: [inputs[0] ?? null] };
	},
};

let engineDataSource: ReturnType<typeof createDataSource>;
let engineDatabase: string;
let project: Project;
let parents: WorkflowEntity[];

async function bootstrap() {
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
	return { connection, uri: `postgres://${user}:${password}@${host}:${port}` };
}

beforeAll(async () => {
	await testModules.loadModules(['execution-ledger'], packagedModules);
	await testDb.init();
	await new ExecutionLedgerModule().init();
	Container.get(InstanceSettings).markAsLeader();

	engineDatabase = `engine_${Date.now()}`;
	const { connection, uri } = await bootstrap();
	await connection.query(`CREATE DATABASE ${engineDatabase}`);
	await connection.destroy();
	engineDataSource = createDataSource(`${uri}/${engineDatabase}`);
	await engineDataSource.initialize();
	await engineDataSource.runMigrations();

	project = await createTeamProject('Ledger feed project');
	const subProject = await createTeamProject('Sub-workflow project');
	subWorkflow = await createWorkflow({ name: 'Sub-workflow' }, subProject);
	parents = await Promise.all(
		Array.from(
			{ length: 5 },
			async (_, index) => await createWorkflow({ name: `Parent ${index}` }, project),
		),
	);
}, 120_000);

afterAll(async () => {
	if (engineDataSource?.isInitialized) await engineDataSource.destroy();
	await testDb.terminate();
});

async function startEngine() {
	const runtime = createEngineRuntime({
		dataSource: engineDataSource,
		admittance: new AllowAllAdmittance(),
		identityVerifier: new SharedSecretIdentityVerifier(secret),
		responseSender: noopExecutionResponseSender,
		queues: createInMemoryWorkQueues({ concurrency: { step: 32, orchestration: 32 } }),
		externalDependencies: () => ({ v1StepExecutor: executor }),
	});
	runtime.start();
	const server = runtime.app.listen(0);
	await new Promise<void>((resolve) => server.once('listening', resolve));
	const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	return {
		url,
		stop: async () => {
			await runtime.stop();
			await new Promise<void>((resolve) => server.close(() => resolve()));
		},
	};
}

async function post<T>(url: string, body: object): Promise<{ status: number; body: T }> {
	const response = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json', authorization: `Bearer ${token()}` },
		body: JSON.stringify(body),
	});
	return { status: response.status, body: (await response.json()) as T };
}

/** The same HTTP calls as `EngineDataPlaneClient`, without its config and transport. */
function feedClient(url: string) {
	return {
		listStartedExecutions: async (body: object) =>
			(await post(`${url}/api/workflow-executions/started`, body)).body,
		listEndedExecutions: async (body: object) =>
			(await post(`${url}/api/workflow-executions/ended`, body)).body,
	} as unknown as EngineDataPlaneClient;
}

function newFeed(url: string) {
	const feed = new EngineV2LedgerFeed(
		Container.get(Logger),
		feedClient(url),
		Container.get(SettingsRepository),
		Container.get(ExecutionLedger),
		Container.get(TransactionRunner),
		Container.get(InstanceSettings),
	);
	feed.settleMs = 1_000;
	feed.start(250);
	return feed;
}

async function startRun(url: string, index: number) {
	const executionId = uuidv7();
	const workflow = parents[index % parents.length];
	const { status } = await post(`${url}/api/workflow-executions`, {
		workflowId: workflow.id,
		graph: parentGraph,
		workflow: { id: workflow.id, name: workflow.name, nodes: [], connections: {} },
		triggerOutputs: [{ index, fail: index % 10 === 9 }],
		executionId,
		callerContext: { hostMode: 'webhook', userId: 'user-1', projectId: project.id },
	});
	if (status !== 201) throw new Error(`start answered ${status}`);
	return executionId;
}

async function engineRows(parentIds: string[]) {
	return await engineDataSource.query<
		Array<{ id: string; parent: string | null; finished: boolean }>
	>(
		`SELECT id, parent_execution_id AS parent, finished_at IS NOT NULL AS finished
		 FROM workflow_execution WHERE id = ANY($1) OR parent_execution_id = ANY($1)`,
		[parentIds],
	);
}

async function waitFor(check: () => Promise<boolean>, timeoutMs: number) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (await check()) return;
		await new Promise((resolve) => setTimeout(resolve, 200));
	}
	throw new Error('timed out');
}

/** A uuid v7 starts with its creation time in milliseconds. */
const createdAtOf = (uuid: string) => parseInt(uuid.replaceAll('-', '').slice(0, 12), 16);

function percentile(values: number[], p: number) {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

function countBy(rows: ExecutionLedgerRow[]) {
	const counts = new Map<string, number>();
	for (const row of rows) counts.set(row.executionId, (counts.get(row.executionId) ?? 0) + 1);
	return counts;
}

const durationMs = Number(process.env.ENGINE_LEDGER_FEED_DURATION_MS ?? 10_000);
const scenarios = [
	{ name: 'low', rate: 20, restart: false },
	{ name: 'medium', rate: 100, restart: false },
	{ name: 'high', rate: 400, restart: false },
	{ name: 'medium, control plane down 2 s', rate: 100, restart: true },
];
const results: object[] = [];

describe('engine v2 ledger feed (load)', () => {
	afterAll(() => {
		console.table(results);
		if (process.env.ENGINE_LEDGER_FEED_RESULT) {
			writeFileSync(process.env.ENGINE_LEDGER_FEED_RESULT, JSON.stringify(results, null, 2));
		}
	});

	it.each(scenarios)(
		'$name',
		async ({ name, rate, restart }) => {
			await claimAllLedgerRows();
			const engine = await startEngine();
			let feed = newFeed(engine.url);

			const ids: string[] = [];
			const starts: Array<Promise<void>> = [];
			const startedAt = Date.now();
			let sent = 0;
			let restarted = false;
			let restartDone: Promise<void> = Promise.resolve();
			while (Date.now() - startedAt < durationMs) {
				const due = Math.floor(((Date.now() - startedAt) / 1000) * rate);
				for (; sent < due; sent++) {
					const index = sent;
					starts.push(
						startRun(engine.url, index).then((id) => {
							ids.push(id);
						}),
					);
				}
				if (restart && !restarted && Date.now() - startedAt > durationMs / 2) {
					restarted = true;
					restartDone = (async () => {
						await feed.stop();
						await new Promise((resolve) => setTimeout(resolve, 2_000));
						// The first page after the restart fails half way, as a crash in the write would.
						const ledger = Container.get(ExecutionLedger);
						const original = ledger.recordEndedInTransaction.bind(ledger);
						let calls = 0;
						const spy = vi
							.spyOn(ledger, 'recordEndedInTransaction')
							.mockImplementation(async (facts, ctx) => {
								if (++calls === 20) {
									spy.mockRestore();
									throw new Error('write failed on purpose');
								}
								await original(facts, ctx);
							});
						feed = newFeed(engine.url);
					})();
				}
				await new Promise((resolve) => setTimeout(resolve, 10));
			}
			await Promise.all(starts);
			await restartDone;

			await waitFor(async () => {
				const rows = await engineRows(ids);
				return rows.length === ids.length * 2 && rows.every((row) => row.finished);
			}, 600_000);
			const drainSeconds = (Date.now() - startedAt) / 1000;
			const executions = await engineRows(ids);
			const subIds = executions.filter((row) => row.parent).map((row) => row.id);
			const allIds = executions.map((row) => row.id);

			const rows: ExecutionLedgerRow[] = [];
			const ended = () => rows.filter((row) => row.event === 'ended');
			await waitFor(async () => {
				rows.push(...(await claimAllLedgerRows()));
				return new Set(ended().map((row) => row.executionId)).size >= allIds.length;
			}, 60_000).catch(() => {});
			// A repeated row would come late, so read once more after the next polls.
			await new Promise((resolve) => setTimeout(resolve, 2_000));
			rows.push(...(await claimAllLedgerRows()));
			await feed.stop();
			await engine.stop();

			const started = rows.filter((row) => row.event === 'started');
			const startedCounts = countBy(started);
			const endedCounts = countBy(ended());
			const subProjects = new Set(started.map((row) => row.projectId));
			const delay = (list: ExecutionLedgerRow[]) =>
				list.map((row) => createdAtOf(row.eventId) - row.occurredAt.getTime());

			results.push({
				scenario: name,
				'runs / s asked': rate,
				'runs / s done': Math.round(ids.length / drainSeconds),
				'parent runs': ids.length,
				'sub-workflow runs': subIds.length,
				'started rows missed': subIds.filter((id) => !startedCounts.has(id)).length,
				'started rows repeated': [...startedCounts.values()].filter((count) => count > 1).length,
				'ended rows missed': allIds.filter((id) => !endedCounts.has(id)).length,
				'ended rows repeated': [...endedCounts.values()].filter((count) => count > 1).length,
				'ended delay p50 ms': percentile(delay(ended()), 50),
				'ended delay p95 ms': percentile(delay(ended()), 95),
				'started delay p50 ms': percentile(delay(started), 50),
				'started delay p95 ms': percentile(delay(started), 95),
			});

			expect(started.every((row) => row.origin === 'v2' && row.mode === 'integrated')).toBe(true);
			expect(subProjects).toEqual(new Set([(await subWorkflowProject()).id]));
			expect(subIds.filter((id) => startedCounts.get(id) !== 1)).toEqual([]);
			expect(allIds.filter((id) => endedCounts.get(id) !== 1)).toEqual([]);
		},
		900_000,
	);
});

async function subWorkflowProject() {
	const { SharedWorkflowRepository } = await import('@n8n/db');
	const shared = await Container.get(SharedWorkflowRepository).findOneOrFail({
		where: { workflowId: subWorkflow.id, role: 'workflow:owner' },
	});
	return { id: shared.projectId };
}
