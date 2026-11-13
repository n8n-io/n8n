import { randomUUID } from 'node:crypto';

import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import Redis from 'ioredis';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import { TEST_CONTAINER_IMAGES } from 'n8n-containers/test-containers';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AllowAllAdmittance } from '../../admittance';
import { mintIdentityToken, SharedSecretIdentityVerifier } from '../../auth';
import { createDataSource, WorkflowExecution } from '../../database';
import { generateId } from '../../database/generate-id';
import type { IStepExecutor } from '../../dependencies';
import type { WorkflowGraph } from '../../graph';
import type { EngineLogger } from '../../logging';
import { orchestrationMessageSchema, RedisWorkQueue, stepMessageSchema } from '../../queue';
import { noopExecutionResponseSender } from '../../response-channel';
import { createEngineRuntime } from '../create-engine-runtime';

const silentLogger: EngineLogger = {
	debug: () => {},
	info: () => {},
	warn: () => {},
	error: () => {},
};

const secret = 'a'.repeat(32);

const diamondGraph: WorkflowGraph = {
	nodes: [
		{ id: 'trigger', name: 'Webhook', type: 'trigger' },
		{ id: 'node-a', name: 'A', type: 'v1-node' },
		{ id: 'node-b', name: 'B', type: 'v1-node' },
		{ id: 'node-m', name: 'M', type: 'v1-node' },
	],
	edges: [
		{ from: 'trigger', to: 'node-a', outputIndex: 0, inputIndex: 0 },
		{ from: 'trigger', to: 'node-b', outputIndex: 0, inputIndex: 0 },
		{ from: 'node-a', to: 'node-m', outputIndex: 0, inputIndex: 0 },
		{ from: 'node-b', to: 'node-m', outputIndex: 0, inputIndex: 1 },
	],
};

describe('engine runtimes on shared Redis work queues (integration)', () => {
	let postgres: StartedPostgreSqlContainer;
	let redis: StartedRedisContainer;
	let dataSource: DataSource;

	beforeAll(async () => {
		[postgres, redis] = await Promise.all([
			new PostgreSqlContainer(postgresVersions.primary).start(),
			new RedisContainer(TEST_CONTAINER_IMAGES.redis).start(),
		]);
		dataSource = createDataSource(postgres.getConnectionUri());
		await dataSource.initialize();
		await dataSource.runMigrations();
	}, 120_000);

	afterAll(async () => {
		if (dataSource?.isInitialized) await dataSource.destroy();
		await Promise.all([postgres?.stop(), redis?.stop()]);
	});

	/** One engine process: its own connections, on the shared database and lists. */
	function startEngine(keyPrefix: string, executor: IStepExecutor, onFinish: () => void) {
		const publisher = new Redis(redis.getConnectionUrl());
		const consumers = [new Redis(redis.getConnectionUrl()), new Redis(redis.getConnectionUrl())];
		const queueOptions = { publisher, logger: silentLogger, blockTimeoutSeconds: 0.05 };
		const runtime = createEngineRuntime({
			dataSource,
			admittance: new AllowAllAdmittance(),
			identityVerifier: new SharedSecretIdentityVerifier(secret),
			responseSender: noopExecutionResponseSender,
			logger: silentLogger,
			queues: {
				orchestration: new RedisWorkQueue({
					...queueOptions,
					consumer: consumers[0],
					key: `${keyPrefix}:orchestration`,
					parse: (value) => orchestrationMessageSchema.parse(value),
				}),
				step: new RedisWorkQueue({
					...queueOptions,
					consumer: consumers[1],
					key: `${keyPrefix}:step`,
					parse: (value) => stepMessageSchema.parse(value),
				}),
			},
			externalDependencies: ({ executionStore }) => {
				const finishExecution = executionStore.finishExecution.bind(executionStore);
				vi.spyOn(executionStore, 'finishExecution').mockImplementation(async (id, status) => {
					const recorded = await finishExecution(id, status);
					if (recorded) onFinish();
					return recorded;
				});
				return { v1StepExecutor: executor };
			},
		});
		runtime.start();

		const stop = async () => {
			await runtime.stop();
			await Promise.all([publisher, ...consumers].map(async (client) => await client.quit()));
		};
		return { app: runtime.app, stop };
	}

	it('runs the parallel branches of one execution on two engines and finishes it once', async () => {
		const keyPrefix = `engine-test:${randomUUID()}`;
		const ranOn = new Map<string, string[]>();
		let branchesRunning = 0;
		let releaseBranches = () => {};
		const bothBranchesRunning = new Promise<void>((resolve) => (releaseBranches = resolve));
		const otherBranchMissing = new Promise<never>((_, reject) => {
			setTimeout(() => reject(new Error('the other branch did not start')), 5_000).unref();
		});
		let finishCount = 0;

		// Each engine handles one step at a time, so A and B run at the same time
		// only when each engine takes one of them.
		const executorOf = (engine: string): IStepExecutor => ({
			execute: async ({ node }) => {
				ranOn.set(node.id, [...(ranOn.get(node.id) ?? []), engine]);
				if (node.id !== 'node-m') {
					if (++branchesRunning === 2) releaseBranches();
					await Promise.race([bothBranchesRunning, otherBranchMissing]);
				}
				return { outputs: [[{ json: { ran: node.id } }]] };
			},
		});
		const engines = ['engine-1', 'engine-2'].map((name) =>
			startEngine(keyPrefix, executorOf(name), () => finishCount++),
		);
		const executionId = generateId();
		const loadExecution = async () =>
			await dataSource
				.getRepository(WorkflowExecution)
				.findOneOrFail({ where: { id: executionId } });

		try {
			await request(engines[0].app)
				.post('/api/workflow-executions')
				.set(
					'Authorization',
					`Bearer ${mintIdentityToken(secret, { cpId: 'cp-1', tenantId: 'tenant-1' })}`,
				)
				.send({
					workflowId: 'wf-scale-out',
					graph: diamondGraph,
					workflow: {},
					triggerOutputs: [{}],
					executionId,
					callerContext: { hostMode: 'trigger' },
				})
				.expect(201);
			await vi.waitFor(
				async () => {
					expect((await loadExecution()).finishedAt).not.toBeNull();
				},
				{ timeout: 15_000 },
			);
		} finally {
			await Promise.all(engines.map(async (engine) => await engine.stop()));
		}

		expect((await loadExecution()).status).toBe('completed');
		expect(finishCount).toBe(1);
		expect(new Set([...(ranOn.get('node-a') ?? []), ...(ranOn.get('node-b') ?? [])])).toEqual(
			new Set(['engine-1', 'engine-2']),
		);
		expect(ranOn.get('node-m')).toHaveLength(1);
	}, 30_000);
});
