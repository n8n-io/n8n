import { createRequire } from 'node:module';

import { testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { TransactionRunner, type OperationContext } from '@n8n/db';
import { Container } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { sleep } from '@n8n/utils/sleep';

import { TrustedSourceRepository } from '@/modules/inbound-auth-core/database/repositories/trusted-source.repository';

const { TypeOrmTransaction } = createRequire(__filename)(
	'@n8n/db/dist/services/typeorm-transaction',
) as typeof import('@n8n/db/dist/services/typeorm-transaction');

const LEASE_SECONDS = 1;
const PAST_LEASE_MS = 1500;

let repository: TrustedSourceRepository;
let transactionRunner: TransactionRunner;

async function seedSource() {
	return await repository.insertRow(
		{
			name: 'Acme',
			type: 'oauth2',
			issuer: 'https://acme.example.com',
			managedBy: 'admin',
			status: 'unchecked',
			lastError: null,
			lastCheckedAt: null,
			configVersion: 1,
			config: 'config',
			metadata: null,
		},
		{},
	);
}

async function waitForPeerLock(ctx: OperationContext) {
	if (Container.get(GlobalConfig).database.type !== 'postgresdb') return;
	const transaction = ctx.trx;
	if (!(transaction instanceof TypeOrmTransaction)) throw new Error('Expected a transaction');
	await vi.waitFor(async () => {
		const rows = await transaction.getEntityManager().query<Array<{ blocked: boolean }>>(
			`SELECT EXISTS (
				SELECT 1 FROM pg_stat_activity
				WHERE pg_backend_pid() = ANY(pg_blocking_pids(pid))
			) AS blocked`,
		);
		expect(rows).toEqual([{ blocked: true }]);
	});
}

beforeAll(async () => {
	await testModules.loadModules(['inbound-auth-core']);
	Container.get(GlobalConfig).database.postgresdb.poolSize = 2;
	await testDb.init();

	repository = Container.get(TrustedSourceRepository);
	transactionRunner = Container.get(TransactionRunner);
});

beforeEach(async () => {
	await testDb.truncate(['TrustedSourceEntity']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('TrustedSourceRepository (integration)', () => {
	describe('claimForDiscovery', () => {
		it('treats a lease as expired once it has run out within a long transaction', async () => {
			const { id } = await seedSource();

			const claimed = await transactionRunner.run({}, async (ctx) => {
				expect(await repository.claimForDiscovery(id, 'token-a', LEASE_SECONDS, ctx)).toBe(true);
				await sleep(PAST_LEASE_MS);
				return await repository.claimForDiscovery(id, 'token-b', LEASE_SECONDS, ctx);
			});

			expect(claimed).toBe(true);
			expect((await repository.findById(id, {}))?.discoveryClaimToken).toBe('token-b');
		});

		it('treats a lease as expired after waiting on a row lock held past its expiry', async () => {
			const { id } = await seedSource();
			const order: string[] = [];
			const holderClaimed = createDeferredPromise();

			const holder = transactionRunner.run({}, async (ctx) => {
				expect(await repository.claimForDiscovery(id, 'token-a', LEASE_SECONDS, ctx)).toBe(true);
				holderClaimed.resolve();
				await sleep(PAST_LEASE_MS);
				await waitForPeerLock(ctx);
				order.push('holder committed');
			});
			holder.catch(holderClaimed.reject);

			await holderClaimed.promise;
			const claimed = await repository.claimForDiscovery(id, 'token-b', LEASE_SECONDS, {});
			order.push('claimer finished');
			await holder;

			expect(order).toEqual(['holder committed', 'claimer finished']);
			expect(claimed).toBe(true);
			expect((await repository.findById(id, {}))?.discoveryClaimToken).toBe('token-b');
		});
	});
});
