import { createRequire } from 'node:module';
import { testDb } from '@n8n/backend-test-utils';
import { UserRepository, SettingsRepository, TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { mockLogger } from '@n8n/backend-test-utils';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import { AgentUserDeletionRepository } from '@/modules/agents/repositories/agent-user-deletion.repository';

import { createMember } from '../../shared/db/users';

const { TypeOrmTransactionRunner } = createRequire(__filename)(
	'@n8n/db/dist/services/typeorm-transaction',
) as typeof import('@n8n/db/dist/services/typeorm-transaction');

describe('AgentUserDeletionRepository', () => {
	let repository: AgentUserDeletionRepository;
	let userId: string;
	let peer: DataSource;
	let otherMain: AgentUserDeletionRepository;
	beforeAll(async () => {
		await testDb.init();
		const dataSource = Container.get(DataSource);
		repository = new AgentUserDeletionRepository(dataSource, Container.get(TransactionRunner));
		peer = await new DataSource({
			...dataSource.options,
			synchronize: false,
			migrationsRun: false,
			dropSchema: false,
		}).initialize();
		otherMain = new AgentUserDeletionRepository(
			peer,
			new TypeOrmTransactionRunner(peer, mockLogger()),
		);
	});
	beforeEach(async () => {
		userId = (await createMember()).id;
	});
	afterEach(async () => {
		await Container.get(SettingsRepository).delete({ key: `agents.userDeletion.${userId}` });
		await Container.get(UserRepository).delete(userId);
	});
	afterAll(async () => {
		if (peer?.isInitialized) await peer.destroy();
		await testDb.terminate();
	});

	it('blocks later writes on another main and keeps deletion retryable', async () => {
		await repository.beginDeletion(userId);
		const write = vi.fn(async () => 'saved');
		await expect(otherMain.withActiveUser(userId, write)).rejects.toThrow('being deleted');
		expect(write).not.toHaveBeenCalled();
		await expect(otherMain.beginDeletion(userId)).resolves.toBeUndefined();
	});

	it('waits for an admitted write before it marks deletion', async () => {
		const entered = createDeferredPromise<undefined>();
		const release = createDeferredPromise<undefined>();
		const events: string[] = [];
		const write = repository.withActiveUser(userId, async () => {
			entered.resolve(undefined);
			await release.promise;
			events.push('write finished');
		});
		await entered.promise;
		const deletion = otherMain.beginDeletion(userId).then(() => {
			events.push('deletion marked');
		});
		try {
			await new Promise((resolve) => setTimeout(resolve, 25));
			expect(events).toEqual([]);
		} finally {
			release.resolve(undefined);
		}
		await Promise.all([write, deletion]);
		expect(events).toEqual(['write finished', 'deletion marked']);
	});

	it('rejects writes after the account deletion', async () => {
		await Container.get(UserRepository).delete(userId);
		const write = vi.fn(async () => undefined);
		await expect(repository.withActiveUser(userId, write)).rejects.toThrow('Session not found');
		expect(write).not.toHaveBeenCalled();
	});
});
