import { testDb } from '@n8n/backend-test-utils';
import type { HostedClaimedRef } from '@n8n/db';
import {
	DbConnectionOptions,
	HeldTaskFenceRepository,
	ScheduledJobRepository,
	ScheduledTask,
	ScheduledTaskRepository,
	TransactionRunner,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { sleep } from '@n8n/utils/sleep';

import { createDueJobFactory, seedDueTask } from './shared/job-factory';

const isPostgres = process.env.DB_TYPE === 'postgresdb';
const TASK_TYPE = 'lease:fence-test';
const HOST = 'main-a';

describe('HeldTaskFenceRepository', () => {
	let fence: HeldTaskFenceRepository;
	let tasks: ScheduledTaskRepository;
	let transactions: TransactionRunner;
	let createJob: ReturnType<typeof createDueJobFactory>;
	let secondaryDataSource: DataSource | undefined;

	beforeAll(async () => {
		await testDb.init();
		fence = Container.get(HeldTaskFenceRepository);
		tasks = Container.get(ScheduledTaskRepository);
		transactions = Container.get(TransactionRunner);
		createJob = createDueJobFactory(Container.get(ScheduledJobRepository), TASK_TYPE, 'fence');

		if (isPostgres) {
			secondaryDataSource = new DataSource(Container.get(DbConnectionOptions).getOptions());
			await secondaryDataSource.initialize();
		}
	});

	beforeEach(async () => {
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
	});

	afterAll(async () => {
		if (secondaryDataSource?.isInitialized) await secondaryDataSource.destroy();
		await testDb.terminate();
	});

	const claimHeldTask = async (): Promise<HostedClaimedRef> => {
		const job = await createJob();
		await seedDueTask(tasks, TASK_TYPE, job.id);
		const [claimed] = await tasks.claimDueTasks({
			host: HOST,
			taskTypes: [TASK_TYPE],
			lookaheadMs: 0,
			leaseMs: 60_000,
			batchSize: 1,
		});
		return { id: claimed.id, claimedEpoch: claimed.leaseEpoch, host: HOST };
	};

	const isHeld = async (claim: HostedClaimedRef) =>
		await transactions.run({}, async (ctx) => await fence.isHeld(claim, ctx));

	it('passes for the live holder', async () => {
		const claim = await claimHeldTask();

		await expect(isHeld(claim)).resolves.toBe(true);
	});

	it('rejects a holder whose lease epoch changed', async () => {
		const claim = await claimHeldTask();
		await tasks.update({ id: claim.id }, { leaseEpoch: claim.claimedEpoch + 1 });

		await expect(isHeld(claim)).resolves.toBe(false);
	});

	it('rejects a holder whose task left running', async () => {
		const claim = await claimHeldTask();
		await tasks.completeTask(claim);

		await expect(isHeld(claim)).resolves.toBe(false);
	});

	it('rejects a claim of another host', async () => {
		const claim = await claimHeldTask();

		await expect(isHeld({ ...claim, host: 'main-b' })).resolves.toBe(false);
	});

	it('rejects a holder whose lease expired', async () => {
		const claim = await claimHeldTask();
		await tasks.renewLease(claim, -60_000);

		await expect(isHeld(claim)).resolves.toBe(false);
	});

	it('refuses a check outside a transaction', async () => {
		const claim = await claimHeldTask();

		await expect(fence.isHeld(claim, {})).rejects.toThrow(
			'A held task fence must be checked inside a transaction',
		);
	});

	it.skipIf(!isPostgres)(
		'keeps a new claim of the task waiting until the checking transaction ends',
		async () => {
			const claim = await claimHeldTask();
			let handedOver = false;
			let handOver: Promise<void> | undefined;

			await transactions.run({}, async (ctx) => {
				expect(await fence.isHeld(claim, ctx)).toBe(true);
				handOver = secondaryDataSource!.manager
					.update(ScheduledTask, { id: claim.id }, { leaseEpoch: claim.claimedEpoch + 1 })
					.then(() => {
						handedOver = true;
					});
				await sleep(300);
				expect(handedOver).toBe(false);
			});

			await handOver;
			expect(handedOver).toBe(true);
		},
	);
});
