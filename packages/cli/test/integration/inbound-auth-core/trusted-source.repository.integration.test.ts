import { testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';

import { TrustedSourceRepository } from '@/modules/inbound-auth-core/database/repositories/trusted-source.repository';

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

			const holder = transactionRunner.run({}, async (ctx) => {
				expect(await repository.claimForDiscovery(id, 'token-a', LEASE_SECONDS, ctx)).toBe(true);
				await sleep(PAST_LEASE_MS);
				order.push('holder committed');
			});

			await sleep(200);
			const claimed = await repository.claimForDiscovery(id, 'token-b', LEASE_SECONDS, {});
			order.push('claimer finished');
			await holder;

			expect(order).toEqual(['holder committed', 'claimer finished']);
			expect(claimed).toBe(true);
			expect((await repository.findById(id, {}))?.discoveryClaimToken).toBe('token-b');
		});
	});
});
