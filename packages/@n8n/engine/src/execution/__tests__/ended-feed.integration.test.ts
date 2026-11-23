import { writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';

import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import Redis from 'ioredis';
import { TEST_CONTAINER_IMAGES } from 'n8n-containers/test-containers';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AllowAllAdmittance } from '../../admittance';
import { mintIdentityToken, SharedSecretIdentityVerifier } from '../../auth';
import { createDataSource, WorkflowExecution, WorkflowStepExecution } from '../../database';
import { generateId } from '../../database/generate-id';
import type { IStepExecutor } from '../../dependencies';
import type { WorkflowGraph } from '../../graph';
import type { LifecycleEvent, LifecycleEventCallback } from '../../lifecycle-events';
import { createInMemoryWorkQueues } from '../../queue';
import { noopExecutionResponseSender } from '../../response-channel';
import { createEngineRuntime } from '../../runtime';
import type { ListEndedExecutionsResponse } from '../../server';
import type { EndedExecutionCursor } from '../execution-view-store';

/**
 * GOV-400 spike proof. The first suite proves that the ended feed gives every
 * ended execution to a reader that crashes and restarts. The second suite runs
 * only with `ENGINE_EVENT_LOSS_BENCH=1`: it measures how many lifecycle events a
 * control-plane subscriber loses under load, next to the feed.
 */

const secret = 'a'.repeat(32);
const token = () => mintIdentityToken(secret, { cpId: 'cp-1', tenantId: 'tenant-1' });

const graph: WorkflowGraph = {
	nodes: [
		{ id: 'trigger', name: 'Webhook', type: 'trigger' },
		{ id: 'node-a', name: 'A', type: 'v1-node' },
		{ id: 'node-b', name: 'B', type: 'v1-node' },
		{ id: 'node-c', name: 'C', type: 'v1-node' },
		{ id: 'node-d', name: 'D', type: 'v1-node' },
	],
	edges: [
		{ from: 'trigger', to: 'node-a', outputIndex: 0, inputIndex: 0 },
		{ from: 'node-a', to: 'node-b', outputIndex: 0, inputIndex: 0 },
		{ from: 'node-b', to: 'node-c', outputIndex: 0, inputIndex: 0 },
		{ from: 'node-c', to: 'node-d', outputIndex: 0, inputIndex: 0 },
	],
};

/** Every tenth run fails at node C, so the feed also carries failures. */
const executor: IStepExecutor = {
	execute: async ({ node, inputs }) => {
		await new Promise((resolve) => setTimeout(resolve, 1));
		if (node.id === 'node-c' && JSON.stringify(inputs).includes('"fail":true')) {
			throw new Error('C failed on purpose');
		}
		return { outputs: [inputs] };
	},
};

let pg: StartedPostgreSqlContainer;
let dataSource: DataSource;

beforeAll(async () => {
	pg = await new PostgreSqlContainer(postgresVersions.primary).start();
	dataSource = createDataSource(pg.getConnectionUri());
	await dataSource.initialize();
	await dataSource.runMigrations();
}, 120_000);

afterAll(async () => {
	if (dataSource?.isInitialized) await dataSource.destroy();
	if (pg) await pg.stop();
});

async function startEngine(lifecycleEventCallback?: LifecycleEventCallback) {
	const runtime = createEngineRuntime({
		dataSource,
		admittance: new AllowAllAdmittance(),
		identityVerifier: new SharedSecretIdentityVerifier(secret),
		responseSender: noopExecutionResponseSender,
		queues: createInMemoryWorkQueues({ concurrency: { step: 32, orchestration: 32 } }),
		externalDependencies: () => ({ v1StepExecutor: executor, lifecycleEventCallback }),
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

async function startExecution(url: string, index: number, subscribe: boolean) {
	const executionId = generateId();
	const { status } = await post(`${url}/api/workflow-executions`, {
		workflowId: `wf-${index % 5}`,
		graph,
		workflow: {
			id: `wf-${index % 5}`,
			name: `Feed proof ${index % 5}`,
			nodes: [],
			connections: {},
		},
		triggerOutputs: [{ index, fail: index % 10 === 9 }],
		executionId,
		callerContext: { hostMode: 'webhook', userId: 'user-1', projectId: 'project-1' },
		lifecycleEventSubscription: subscribe ? { kind: 'all' } : undefined,
	});
	if (status !== 201) throw new Error(`start answered ${status}`);
	return executionId;
}

/**
 * What a control-plane reader does: it pulls a page, hands every item on, and
 * only then stores the cursor. `crashOnce` throws after the hand-off and before
 * the store, the worst place for a crash.
 */
class FeedReader {
	private timer: NodeJS.Timeout | undefined;

	private polling: Promise<void> | undefined;

	stopped = false;

	constructor(
		private readonly url: string,
		/** Stands in for the control-plane database row that holds the cursor. */
		private readonly durable: { cursor: EndedExecutionCursor | null },
		private readonly delivered: Map<string, number>,
		private readonly options: { limit: number; settleMs: number; crashOnce?: boolean },
	) {}

	start(intervalMs: number) {
		this.timer = setInterval(() => {
			// A failed poll leaves the cursor where it was, so the next poll repeats it.
			this.polling ??= this.pollUntilEmpty()
				.catch(() => {})
				.finally(() => (this.polling = undefined));
		}, intervalMs);
	}

	async stop() {
		this.stopped = true;
		clearInterval(this.timer);
		await this.polling?.catch(() => {});
	}

	async pollUntilEmpty(): Promise<void> {
		while (!this.stopped) {
			const { body } = await post<ListEndedExecutionsResponse>(
				`${this.url}/api/workflow-executions/ended`,
				{
					after: this.durable.cursor ?? undefined,
					limit: this.options.limit,
					settleMs: this.options.settleMs,
				},
			);
			for (const item of body.items) {
				this.delivered.set(item.eventKey, (this.delivered.get(item.eventKey) ?? 0) + 1);
			}
			if (this.options.crashOnce && body.items.length > 0) {
				this.options.crashOnce = false;
				this.stopped = true;
				clearInterval(this.timer);
				return;
			}
			this.durable.cursor = body.cursor;
			if (body.items.length < this.options.limit) return;
		}
	}
}

async function endedIds(ids: string[]) {
	const rows = await dataSource
		.getRepository(WorkflowExecution)
		.createQueryBuilder('execution')
		.select('execution.id', 'id')
		.where('execution.id = ANY(:ids)', { ids })
		.andWhere('execution.finished_at IS NOT NULL')
		.getRawMany<{ id: string }>();
	return new Set(rows.map(({ id }) => id));
}

async function waitFor(check: () => Promise<boolean>, timeoutMs: number) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (await check()) return;
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	throw new Error('timed out');
}

describe('ended execution feed (integration)', () => {
	it('gives every ended execution to a reader that crashes and restarts', async () => {
		const engine = await startEngine();
		const durable: { cursor: EndedExecutionCursor | null } = { cursor: null };
		const delivered = new Map<string, number>();
		const options = { limit: 7, settleMs: 300 };

		const first = new FeedReader(engine.url, durable, delivered, { ...options, crashOnce: true });
		first.start(50);

		const ids = await Promise.all(
			Array.from(
				{ length: 60 },
				async (_, index) => await startExecution(engine.url, index, false),
			),
		);

		await waitFor(async () => first.stopped, 30_000);
		const second = new FeedReader(engine.url, durable, delivered, options);
		second.start(50);

		await waitFor(async () => (await endedIds(ids)).size === ids.length, 60_000);
		await waitFor(async () => delivered.size === ids.length, 30_000);
		await second.stop();

		expect([...delivered.keys()].sort()).toEqual(ids.map((id) => `${id}:ended`).sort());
		const repeats = [...delivered.values()].filter((count) => count > 1).length;
		// Only the page that the crash left unstored comes again.
		expect(repeats).toBeLessThanOrEqual(options.limit);

		const { body } = await post<ListEndedExecutionsResponse>(
			`${engine.url}/api/workflow-executions/ended`,
			{ limit: 100, settleMs: 0 },
		);
		const failed = body.items.find(({ status }) => status === 'failed');
		expect(failed).toMatchObject({
			workflowName: expect.stringMatching(/^Feed proof/) as string,
			userId: 'user-1',
			projectId: 'project-1',
			hostMode: 'webhook',
			failedStep: { nodeId: 'node-c', error: { message: 'C failed on purpose' } },
		});
		await engine.stop();
	}, 120_000);
});

const BENCH = process.env.ENGINE_EVENT_LOSS_BENCH === '1';

describe.runIf(BENCH)('lifecycle event loss under load (bench)', () => {
	let redis: StartedRedisContainer;

	beforeAll(async () => {
		redis = await new RedisContainer(TEST_CONTAINER_IMAGES.redis).start();
	}, 120_000);

	afterAll(async () => {
		if (redis) await redis.stop();
	});

	const durationMs = Number(process.env.ENGINE_EVENT_LOSS_DURATION_MS ?? 10_000);
	const scenarios = [
		{ name: 'low', rate: 20, restartSubscriber: false },
		{ name: 'medium', rate: 100, restartSubscriber: false },
		{ name: 'high', rate: 400, restartSubscriber: false },
		{ name: 'medium, control plane restarts', rate: 100, restartSubscriber: true },
	];
	const results: object[] = [];

	afterAll(() => {
		console.table(results);
		if (process.env.ENGINE_EVENT_LOSS_RESULT) {
			writeFileSync(process.env.ENGINE_EVENT_LOSS_RESULT, JSON.stringify(results, null, 2));
		}
	});

	it.each(scenarios)(
		'$name',
		async ({ name, rate, restartSubscriber }) => {
			const runId = generateId();
			const publisher = new Redis(redis.getConnectionUrl());
			let subscriber = new Redis(redis.getConnectionUrl());
			const received = new Map<string, number>();
			const subscribe = async (client: Redis) => {
				client.on('pmessage', (_pattern, _channel, message: string) => {
					const { executionId } = JSON.parse(message) as LifecycleEvent;
					received.set(executionId, (received.get(executionId) ?? 0) + 1);
				});
				await client.psubscribe(`bench:${runId}:*`);
			};
			await subscribe(subscriber);

			const capDrops = { count: 0 };
			const warn = vi.spyOn(console, 'warn').mockImplementation((message: unknown) => {
				const match = /dropped (\d+)/.exec(String(message));
				if (match) capDrops.count += Number(match[1]);
			});

			// The same shape as the control-plane sender: one frame for each event, not awaited.
			const engine = await startEngine(async (batch) => {
				for (const event of batch) {
					void publisher.publish(`bench:${runId}:${event.executionId}`, JSON.stringify(event));
				}
			});

			const durable: { cursor: EndedExecutionCursor | null } = { cursor: null };
			const delivered = new Map<string, number>();
			const options = { limit: 200, settleMs: 1_000 };
			let reader = new FeedReader(engine.url, durable, delivered, options);
			reader.start(250);

			const ids: string[] = [];
			const starts: Array<Promise<void>> = [];
			const startedAt = Date.now();
			let sent = 0;
			let restarted = false;
			let restart: Promise<void> = Promise.resolve();
			while (Date.now() - startedAt < durationMs) {
				const due = Math.floor(((Date.now() - startedAt) / 1000) * rate);
				for (; sent < due; sent++) {
					const index = sent;
					starts.push(
						startExecution(engine.url, index, true).then((id) => {
							ids.push(id);
						}),
					);
				}
				if (restartSubscriber && !restarted && Date.now() - startedAt > durationMs / 2) {
					// The control plane main goes down for two seconds, then comes back.
					// The load does not stop: webhooks keep arriving at other mains.
					restarted = true;
					subscriber.disconnect();
					restart = (async () => {
						await reader.stop();
						await new Promise((resolve) => setTimeout(resolve, 2_000));
						subscriber = new Redis(redis.getConnectionUrl());
						await subscribe(subscriber);
						reader = new FeedReader(engine.url, durable, delivered, options);
						reader.start(250);
					})();
				}
				await new Promise((resolve) => setTimeout(resolve, 10));
			}
			await Promise.all(starts);
			await restart;
			const startSeconds = (Date.now() - startedAt) / 1000;

			await waitFor(async () => (await endedIds(ids)).size === ids.length, 300_000);
			const drainSeconds = (Date.now() - startedAt) / 1000;
			const deliveredOfRun = () => ids.filter((id) => delivered.has(`${id}:ended`));
			await waitFor(async () => deliveredOfRun().length === ids.length, 30_000).catch(() => {});
			await reader.stop();
			await engine.stop();
			await new Promise((resolve) => setTimeout(resolve, 1_000));

			// Two events for each execution, two for each node step.
			const steps = await dataSource
				.getRepository(WorkflowStepExecution)
				.createQueryBuilder('step')
				.select('count(*)', 'count')
				.where('step.execution_id = ANY(:ids)', { ids })
				.andWhere("step.node_id <> 'trigger'")
				.getRawOne<{ count: string }>();
			const expected = ids.length * 2 + Number(steps?.count ?? 0) * 2;
			const got = [...received.values()].reduce((sum, count) => sum + count, 0);

			warn.mockRestore();
			publisher.disconnect();
			subscriber.disconnect();

			const lost = expected - got;
			results.push({
				scenario: name,
				'runs / s asked': rate,
				'runs / s done': Math.round(ids.length / drainSeconds),
				runs: ids.length,
				'start s': Number(startSeconds.toFixed(1)),
				'events expected': expected,
				'events received': got,
				'events lost': lost,
				'lost %': Number(((lost / expected) * 100).toFixed(2)),
				'dropped at the 10,000 cap': capDrops.count,
				'feed ended runs missing': ids.length - deliveredOfRun().length,
				'feed repeats': ids.filter((id) => (delivered.get(`${id}:ended`) ?? 0) > 1).length,
			});

			expect(deliveredOfRun()).toHaveLength(ids.length);
		},
		600_000,
	);
});
