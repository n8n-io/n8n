import { testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { McpSettingsLoader } from '@/instance-settings-loader/loaders/mcp-settings.loader';
import { McpSettingsService } from '@/modules/mcp/mcp.settings.service';

const SETTINGS_KEY = 'mcp.access.enabled';

beforeAll(async () => {
	await testModules.loadModules(['mcp']);
	await testDb.init();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('McpSettingsLoader', () => {
	let originalConfig: Pick<InstanceSettingsLoaderConfig, 'mcpManagedByEnv' | 'mcpAccessEnabled'>;
	let settingsRepository: SettingsRepository;
	let loader: McpSettingsLoader;

	const setConfig = (overrides: Partial<InstanceSettingsLoaderConfig>) => {
		Object.assign(Container.get(GlobalConfig).instanceSettingsLoader, {
			mcpManagedByEnv: true,
			mcpAccessEnabled: false,
			...overrides,
		});
	};

	beforeEach(async () => {
		settingsRepository = Container.get(SettingsRepository);
		loader = Container.get(McpSettingsLoader);

		const config = Container.get(GlobalConfig).instanceSettingsLoader;
		originalConfig = {
			mcpManagedByEnv: config.mcpManagedByEnv,
			mcpAccessEnabled: config.mcpAccessEnabled,
		};

		await settingsRepository.delete({ key: SETTINGS_KEY });
	});

	afterEach(async () => {
		Object.assign(Container.get(GlobalConfig).instanceSettingsLoader, originalConfig);
		await settingsRepository.delete({ key: SETTINGS_KEY });
	});

	it('returns "skipped" and does not touch the DB when the flag is off', async () => {
		setConfig({ mcpManagedByEnv: false, mcpAccessEnabled: true });

		await expect(loader.run()).resolves.toBe('skipped');

		const row = await settingsRepository.findByKey(SETTINGS_KEY);
		expect(row).toBeNull();
	});

	it('persists mcp.access.enabled=true when the flag is on and access is enabled', async () => {
		setConfig({ mcpAccessEnabled: true });

		await expect(loader.run()).resolves.toBe('created');

		const row = await settingsRepository.findByKey(SETTINGS_KEY);
		expect(row?.value).toBe('true');
		expect(row?.loadOnStartup).toBe(true);

		await expect(Container.get(McpSettingsService).getEnabled()).resolves.toBe(true);
	});

	it('persists mcp.access.enabled=false when the flag is on and access is disabled', async () => {
		setConfig({ mcpAccessEnabled: false });

		await expect(loader.run()).resolves.toBe('created');

		const row = await settingsRepository.findByKey(SETTINGS_KEY);
		expect(row?.value).toBe('false');

		await expect(Container.get(McpSettingsService).getEnabled()).resolves.toBe(false);
	});

	it('overwrites a pre-existing setting on subsequent runs', async () => {
		setConfig({ mcpAccessEnabled: true });
		await loader.run();
		await expect(settingsRepository.findByKey(SETTINGS_KEY).then((r) => r?.value)).resolves.toBe(
			'true',
		);

		setConfig({ mcpAccessEnabled: false });
		await loader.run();
		await expect(settingsRepository.findByKey(SETTINGS_KEY).then((r) => r?.value)).resolves.toBe(
			'false',
		);
	});
});
