import { Logger } from '@n8n/backend-common';
import { mockLogger, testDb, testModules } from '@n8n/backend-test-utils';
import { SecretsProviderConnectionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { InstanceSettings } from 'n8n-core';
import { tmpdir } from 'os';
import { join } from 'path';

import { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';
import { ExternalSecretsModule } from '@/modules/external-secrets.ee/external-secrets.module';

describe('ExternalSecretsModule boot with a config file', () => {
	let dir: string;

	beforeAll(async () => {
		await testModules.loadModules(['external-secrets']);
		await testDb.init();

		Container.set(Logger, mockLogger());

		// Defaults to 'unset' (not leader) on a fresh instance. The "skips
		// reconciliation" test below overrides `isLeader` back to `false` itself.
		Container.get(InstanceSettings).markAsLeader();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'n8n-config-boot-test-'));
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
		Container.get(ExternalSecretsConfig).configFilePath = '';
	});

	test('skips reconciliation on a non-leader instance', async () => {
		const filePath = join(dir, 'config.json');
		writeFileSync(
			filePath,
			JSON.stringify({
				connections: [
					{ key: 'nonLeaderTest', type: 'vault', settings: { url: 'https://vault.example.com' } },
				],
			}),
		);
		Container.get(ExternalSecretsConfig).configFilePath = filePath;
		const instanceSettings = Container.get(InstanceSettings);
		const originalIsLeader = instanceSettings.isLeader;
		Object.defineProperty(instanceSettings, 'isLeader', { value: false, configurable: true });

		await Container.get(ExternalSecretsModule).init();

		const repository = Container.get(SecretsProviderConnectionRepository);
		const saved = await repository.findOne({ where: { providerKey: 'nonLeaderTest' } });
		expect(saved).toBeNull();

		Object.defineProperty(instanceSettings, 'isLeader', {
			value: originalIsLeader,
			configurable: true,
		});
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
