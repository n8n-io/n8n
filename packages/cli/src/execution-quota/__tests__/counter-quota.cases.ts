import { createTeamProject, createWorkflow, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { TransactionRunner, type Project } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { Redis } from 'ioredis';
import { createEmptyRunExecutionData } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';

import { ExecutionLedgerFoldService } from '@/execution-ledger/execution-ledger-fold.service';
import { ExecutionPersistence } from '@/executions/execution-persistence';

import { ExecutionQuotaExceededError } from '../execution-quota-exceeded.error';
import { ExecutionQuotaService } from '../execution-quota.service';
import { MemoryQuotaCounterStore } from '../quota-counter.store';

/** Shared cases for the counter mode. The caller sets the env that picks the store. */
export function counterQuotaCases(store: 'memory' | 'redis') {
	const redisHost = process.env.N8N_TEST_REDIS_HOST;
	const redisPort = Number(process.env.N8N_TEST_REDIS_PORT);
	const canRun = () => store === 'memory' || Boolean(redisHost);

	let quotaService: ExecutionQuotaService;
	let foldService: ExecutionLedgerFoldService;
	let project: Project;
	let redis: Redis | undefined;

	beforeAll(async () => {
		await testDb.init();
		if (store === 'redis' && redisHost) {
			const { redis: redisConfig } = Container.get(GlobalConfig).queue.bull;
			redisConfig.host = redisHost;
			redisConfig.port = redisPort;
			redis = new Redis(redisPort, redisHost);
		}
		await import('../execution-quota.participant.js');
		quotaService = Container.get(ExecutionQuotaService);
		foldService = Container.get(ExecutionLedgerFoldService);
	});

	beforeEach(async () => {
		project = await createTeamProject();
	});

	afterAll(async () => {
		redis?.disconnect();
		await testDb.terminate();
	});

	/** Writes the started row the way `ActiveExecutions.add` does, inside a transaction. */
	const admit = async (workflowId: string) => {
		const charge = await quotaService.admit({ workflowId, projectId: project.id, mode: 'webhook' });
		await Container.get(TransactionRunner).run({}, async (ctx) => await charge?.recordStarted(ctx));
		return charge;
	};

	const drainLedger = async () => {
		while ((await foldService.foldBatch()) > 0) {}
	};

	const table = (name: string) => `${Container.get(GlobalConfig).database.tablePrefix}${name}`;

	const usedThisMonth = async (scopeType: 'workflow' | 'project', scopeId: string) => {
		const row = await Container.get(DataSource)
			.createQueryBuilder()
			.select('SUM(u."used")', 'used')
			.from(table('execution_quota_usage'), 'u')
			.where('u."scopeType" = :scopeType AND u."scopeId" = :scopeId', { scopeType, scopeId })
			.getRawOne<{ used: string | number | null }>();
		return Number(row?.used ?? 0);
	};

	const forgetCounters = async () => {
		if (redis) {
			const keys = await redis.keys(`${quotaService.counterStore().keyPrefix()}:*`);
			expect(keys.length).toBeGreaterThan(0);
			await redis.del(...keys);
		} else {
			const memory = Container.get(MemoryQuotaCounterStore) as unknown as {
				counters: Map<string, unknown>;
			};
			expect(memory.counters.size).toBeGreaterThan(0);
			memory.counters.clear();
		}
	};

	it('admits exactly the limit from a concurrent burst while the fold runs', async (ctx) => {
		if (!canRun()) ctx.skip();
		const workflow = await createWorkflow({}, project);
		await quotaService.setLimit({ scopeType: 'workflow', scopeId: workflow.id }, 'month', 10);
		// Seeds the counter, so the burst races on the counter itself, not on seeding.
		await admit(workflow.id);

		let folding = true;
		const foldLoop = (async () => {
			while (folding) await foldService.foldBatch();
		})();
		const burst = await Promise.allSettled(
			Array.from({ length: 60 }, async () => await admit(workflow.id)),
		);
		folding = false;
		await foldLoop;

		expect(burst.filter((r) => r.status === 'fulfilled')).toHaveLength(9);
		for (const refusal of burst.filter((r) => r.status === 'rejected')) {
			expect(refusal.status === 'rejected' && refusal.reason).toBeInstanceOf(
				ExecutionQuotaExceededError,
			);
		}
		await expect(admit(workflow.id)).rejects.toThrow(ExecutionQuotaExceededError);

		await drainLedger();
		expect(await usedThisMonth('workflow', workflow.id)).toBe(10);
	});

	it('stays exact across folds', async (ctx) => {
		if (!canRun()) ctx.skip();
		const workflow = await createWorkflow({}, project);
		await quotaService.setLimit({ scopeType: 'workflow', scopeId: workflow.id }, 'month', 5);

		for (let i = 0; i < 3; i++) await admit(workflow.id);
		await drainLedger();
		for (let i = 0; i < 2; i++) await admit(workflow.id);

		await expect(admit(workflow.id)).rejects.toThrow(ExecutionQuotaExceededError);
		await drainLedger();
		await expect(admit(workflow.id)).rejects.toThrow(ExecutionQuotaExceededError);
	});

	it('shares a project quota across the workflows of the project', async (ctx) => {
		if (!canRun()) ctx.skip();
		const first = await createWorkflow({}, project);
		const second = await createWorkflow({}, project);
		await quotaService.setLimit({ scopeType: 'project', scopeId: project.id }, 'month', 3);

		await admit(first.id);
		await admit(second.id);
		await drainLedger();
		await admit(first.id);

		await expect(admit(second.id)).rejects.toThrow(ExecutionQuotaExceededError);
	});

	it('gives back a run whose execution was never created', async (ctx) => {
		if (!canRun()) ctx.skip();
		const workflow = await createWorkflow({}, project);
		await quotaService.setLimit({ scopeType: 'workflow', scopeId: workflow.id }, 'month', 1);

		const charge = await quotaService.admit({
			workflowId: workflow.id,
			projectId: project.id,
			mode: 'webhook',
		});
		await charge?.refund();
		await drainLedger();

		await expect(admit(workflow.id)).resolves.toBeDefined();
		await expect(admit(workflow.id)).rejects.toThrow(ExecutionQuotaExceededError);
	});

	it('rebuilds a lost counter from the database', async (ctx) => {
		if (!canRun()) ctx.skip();
		const workflow = await createWorkflow({}, project);
		await quotaService.setLimit({ scopeType: 'workflow', scopeId: workflow.id }, 'month', 4);

		await admit(workflow.id);
		await admit(workflow.id);
		await drainLedger();
		await admit(workflow.id);
		await forgetCounters();

		await expect(admit(workflow.id)).resolves.toBeDefined();
		await expect(admit(workflow.id)).rejects.toThrow(ExecutionQuotaExceededError);
		await drainLedger();
		expect(await usedThisMonth('workflow', workflow.id)).toBe(4);
	});

	it('rolls the started row back with an execution that fails to save', async (ctx) => {
		if (!canRun()) ctx.skip();
		const workflow = await createWorkflow({}, project);
		await quotaService.setLimit({ scopeType: 'workflow', scopeId: workflow.id }, 'month', 1);
		// The started row is already written in the transaction when the execution insert fails.
		const create = vi
			.spyOn(Container.get(ExecutionPersistence), 'create')
			.mockRejectedValueOnce(new Error('save failed'));

		await expect(
			Container.get(ActiveExecutions).add({
				executionMode: 'webhook',
				workflowData: workflow,
				projectId: project.id,
				executionData: createEmptyRunExecutionData(),
			}),
		).rejects.toThrow('save failed');
		create.mockRestore();

		await expect(admit(workflow.id)).resolves.toBeDefined();
		const started = await Container.get(DataSource)
			.createQueryBuilder()
			.select('COUNT(*)', 'n')
			.from(table('execution_ledger'), 'l')
			.where('l."event" = \'started\' AND l."workflowId" = :id', { id: workflow.id })
			.getRawOne<{ n: string | number }>();
		expect(Number(started?.n)).toBe(1);
		await drainLedger();
		expect(await usedThisMonth('workflow', workflow.id)).toBe(1);
	});
}
