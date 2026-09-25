import { Logger } from '@n8n/backend-common';
import { mockLogger, testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import {
	DbConnectionOptions,
	DbLock,
	DbLockService,
	SecretsProviderConnectionRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { sleep } from '@n8n/utils/sleep';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';
import { ExternalSecretsModule } from '@/modules/external-secrets.ee/external-secrets.module';

describe('ExternalSecretsModule boot with a config file', () => {
	let dir: string;
	// CI runs Postgres with a pool size of 1. The lock holder uses its own connection so
	// that the code under test can still query the database while the lock is held.
	let holdLockDs: DataSource | undefined;

	beforeAll(async () => {
		await testModules.loadModules(['external-secrets']);
		await testDb.init();

		Container.set(Logger, mockLogger());

		const globalConfig = Container.get(GlobalConfig);
		if (globalConfig.database.type === 'postgresdb') {
			holdLockDs = new DataSource({
				type: 'postgres',
				...Container.get(DbConnectionOptions).getPostgresOverrides(),
				schema: globalConfig.database.postgresdb.schema,
			});
			await holdLockDs.initialize();
		}
	});

	afterAll(async () => {
		if (holdLockDs?.isInitialized) await holdLockDs.destroy();
		await testDb.terminate();
	});

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'n8n-config-boot-test-'));
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
		Container.get(ExternalSecretsConfig).configFilePath = '';
	});

	test('reconciles under the config-file advisory lock', async () => {
		const filePath = join(dir, 'config.json');
		writeFileSync(
			filePath,
			JSON.stringify({
				connections: [
					{ key: 'lockHeldTest', type: 'vault', settings: { url: 'https://vault.example.com' } },
				],
			}),
		);
		Container.get(ExternalSecretsConfig).configFilePath = filePath;
		const repository = Container.get(SecretsProviderConnectionRepository);

		// Another instance holds the lock while this instance boots.
		let releaseLock!: () => void;
		const lockHeld = new Promise<void>((resolve) => {
			releaseLock = resolve;
		});
		let lockAcquired!: () => void;
		const lockAcquiredPromise = new Promise<void>((resolve) => {
			lockAcquired = resolve;
		});
		const holdLock = async () => {
			lockAcquired();
			await lockHeld;
		};
		const holder = holdLockDs
			? holdLockDs.manager.transaction(async (tx) => {
					await tx.query('SELECT pg_advisory_xact_lock($1)', [
						DbLock.EXTERNAL_SECRETS_CONFIG_RECONCILE,
					]);
					await holdLock();
				})
			: Container.get(DbLockService).withLock(DbLock.EXTERNAL_SECRETS_CONFIG_RECONCILE, holdLock);
		await lockAcquiredPromise;

		const withLockContext = vi.spyOn(Container.get(DbLockService), 'withLockContext');
		const findByManagedBy = vi.spyOn(repository, 'findByManagedBy');
		let initSettled = false;
		const init = Container.get(ExternalSecretsModule)
			.init()
			.finally(() => {
				initSettled = true;
			});

		try {
			// Blocked on the lock. The database is not read here: on Postgres the waiting
			// lock call holds the only pooled connection.
			await vi.waitFor(
				() =>
					expect(withLockContext).toHaveBeenCalledWith(
						DbLock.EXTERNAL_SECRETS_CONFIG_RECONCILE,
						expect.any(Function),
					),
				{ timeout: 10_000 },
			);
			await sleep(300);
			expect(initSettled).toBe(false);
			// Only the pre-lock read ran. The read inside the lock has not started.
			expect(findByManagedBy).toHaveBeenCalledTimes(1);
			releaseLock();
			await holder;
			await init;
			expect(findByManagedBy).toHaveBeenCalledTimes(2);
		} finally {
			releaseLock();
			withLockContext.mockRestore();
			findByManagedBy.mockRestore();
		}

		const saved = await repository.findOne({ where: { providerKey: 'lockHeldTest' } });
		expect(saved?.managedBy).toBe('config-file');
	});

	test('provisions connections declared in the config file on init', async () => {
		const filePath = join(dir, 'config.json');
		writeFileSync(
			filePath,
			JSON.stringify({
				connections: [
					{
						key: 'bootTestConnection',
						type: 'vault',
						settings: { url: 'https://vault.example.com' },
					},
				],
			}),
		);
		Container.get(ExternalSecretsConfig).configFilePath = filePath;

		await Container.get(ExternalSecretsModule).init();

		const repository = Container.get(SecretsProviderConnectionRepository);
		const saved = await repository.findOne({ where: { providerKey: 'bootTestConnection' } });
		expect(saved?.managedBy).toBe('config-file');
	});

	test('rejects boot when the file is invalid', async () => {
		const filePath = join(dir, 'invalid-config.json');
		writeFileSync(
			filePath,
			JSON.stringify({ connections: [{ key: 'bad', type: 'notReal', settings: {} }] }),
		);
		Container.get(ExternalSecretsConfig).configFilePath = filePath;

		await expect(Container.get(ExternalSecretsModule).init()).rejects.toThrow(/notReal/);
	});
});
