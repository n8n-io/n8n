import { randomUUID } from 'node:crypto';

import type { DataSource } from '@n8n/typeorm';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import type { Application } from 'express';
import Redis from 'ioredis';
import postgresVersions from 'n8n-containers/postgres-versions.json';
import { TEST_CONTAINER_IMAGES } from 'n8n-containers/test-containers';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AllowAllAdmittance } from '../../admittance';
import { mintIdentityToken, mintResumeToken, SharedSecretIdentityVerifier } from '../../auth';
import { createDataSource, createStores, WorkflowExecution } from '../../database';
import { generateId } from '../../database/generate-id';
import type { IStepExecutor } from '../../dependencies';
import type { WorkflowGraph } from '../../graph';
import type { EngineLogger } from '../../logging';
import { createRedisWorkQueues } from '../../queue';
import { noopExecutionResponseSender } from '../../response-channel';
import { createEngineRuntime, ENGINE_ROLES, type EngineRole } from '../create-engine-runtime';

const silentLogger: EngineLogger = {
	debug: () => {},
	info: () => {},
	warn: () => {},
	error: () => {},
};

const secret = 'a'.repeat(32);
const resumeSecret = 'r'.repeat(32);
// Minted for each request: the token expires after a minute, and the containers can take longer to start.
const authorization = () =>
	`Bearer ${mintIdentityToken(secret, { cpId: 'cp-1', tenantId: 'tenant-1' })}`;

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
	function startEngine(
		keyPrefix: string,
		executor: IStepExecutor,
		onFinish: () => void,
		roles?: readonly EngineRole[],
	) {
		const publisher = new Redis(redis.getConnectionUrl());
		let consumersOpened = 0;
		const workQueues = createRedisWorkQueues({
			publisher,
			createConsumer: () => {
				consumersOpened++;
				return new Redis(redis.getConnectionUrl());
			},
			keyPrefix,
			concurrency: { orchestration: 1, step: 1 },
			logger: silentLogger,
		});
		const runtime = createEngineRuntime({
			roles,
			dataSource,
			admittance: new AllowAllAdmittance(),
			identityVerifier: new SharedSecretIdentityVerifier(secret),
			responseSender: noopExecutionResponseSender,
			logger: silentLogger,
			queues: workQueues.queues,
			resumeSecret,
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
			workQueues.close();
			await publisher.quit();
		};
		return { app: runtime.app, stop, consumersOpened: () => consumersOpened };
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
				.set('Authorization', authorization())
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

	/** Runs a trigger and one step on three engines that each run one role, until it finishes. */
	async function runOnOneEnginePerRole(
		executorOf: (role: EngineRole) => IStepExecutor,
		whileRunning?: (api: Application, executionId: string) => Promise<void>,
	) {
		const keyPrefix = `engine-test:${randomUUID()}`;
		const finishedOn: EngineRole[] = [];
		const engines = Object.fromEntries(
			ENGINE_ROLES.map((role) => [
				role,
				startEngine(keyPrefix, executorOf(role), () => finishedOn.push(role), [role]),
			]),
		);
		const executionId = generateId();
		const loadExecution = async () =>
			await dataSource
				.getRepository(WorkflowExecution)
				.findOneOrFail({ where: { id: executionId } });

		try {
			await request(engines.api.app)
				.post('/api/workflow-executions')
				.set('Authorization', authorization())
				.send({
					workflowId: 'wf-roles',
					graph: {
						nodes: [
							{ id: 'trigger', name: 'Webhook', type: 'trigger' },
							{ id: 'node-a', name: 'A', type: 'v1-node' },
						],
						edges: [{ from: 'trigger', to: 'node-a', outputIndex: 0, inputIndex: 0 }],
					},
					workflow: {},
					triggerOutputs: [{}],
					executionId,
					callerContext: { hostMode: 'trigger' },
				})
				.expect(201);
			await whileRunning?.(engines.api.app, executionId);
			await vi.waitFor(
				async () => {
					expect((await loadExecution()).finishedAt).not.toBeNull();
				},
				{ timeout: 15_000 },
			);
		} finally {
			await Promise.all(Object.values(engines).map(async (engine) => await engine.stop()));
		}

		const consumersOpened = Object.fromEntries(
			ENGINE_ROLES.map((role) => [role, engines[role].consumersOpened()]),
		);
		return { execution: await loadExecution(), finishedOn, consumersOpened };
	}

	it('runs an execution on three engines that each run one role, each with a consumer connection only for the queue it consumes', async () => {
		const ranOn: string[] = [];

		const { execution, finishedOn, consumersOpened } = await runOnOneEnginePerRole((role) => ({
			execute: async ({ node }) => {
				ranOn.push(`${node.id} on ${role}`);
				return { outputs: [[{ json: { ran: node.id } }]] };
			},
		}));

		expect(execution.status).toBe('completed');
		expect(finishedOn).toEqual(['orchestrator']);
		expect(ranOn).toEqual(['node-a on step-worker']);
		expect(consumersOpened).toEqual({ api: 0, orchestrator: 1, 'step-worker': 1 });
	}, 30_000);

	it('ends a short time wait on time when each engine runs one role', async () => {
		// The sweep interval stays at its one-minute default, so the wait ends in
		// time only if the process that suspends the step also runs the wait sweeper.
		const { execution } = await runOnOneEnginePerRole(() => ({
			execute: async () => ({
				wait: {
					resumeAt: new Date(Date.now() + 1_000).toISOString(),
					outputsAtDeadline: [[{ json: { waited: true } }]],
				},
			}),
		}));

		expect(execution.status).toBe('completed');
	}, 30_000);

	it('resumes a waiting step through the api engine when each engine runs one role', async () => {
		const { stepStore } = createStores(dataSource);

		const { execution } = await runOnOneEnginePerRole(
			() => ({ execute: async () => ({ wait: { resumeBinding: 'execution' } }) }),
			async (api, executionId) => {
				const [waiting] = await vi.waitFor(
					async () => {
						const steps = await stepStore.loadWaitingSteps(executionId);
						expect(steps).toHaveLength(1);
						return steps;
					},
					{ timeout: 15_000 },
				);
				await request(api)
					.post(`/api/step-executions/${waiting.id}/resolve`)
					.set('Authorization', authorization())
					.send({
						token: mintResumeToken(resumeSecret, executionId),
						outputs: [[{ json: { approved: true } }]],
					})
					.expect(200);
			},
		);

		expect(execution.status).toBe('completed');
	}, 30_000);
});
