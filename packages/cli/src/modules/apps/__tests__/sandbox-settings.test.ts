import { GlobalConfig, type AgentsConfig, type InstanceAiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock, mockReset } from 'vitest-mock-extended';

import { N8N_VERSION } from '@/constants';
import { SandboxSettingsService } from '@/services/sandbox-settings.service';

import { resolveAppSandboxConfig } from '../sandbox-settings';

describe('resolveAppSandboxConfig', () => {
	const settings = mock<SandboxSettingsService>();
	const config = mock<InstanceAiConfig>();
	const agentsConfig = mock<AgentsConfig>({
		sandboxImage: 'agent-image',
		sandboxSnapshot: 'agent-snapshot',
		sandboxTimeout: 60_000,
	});
	const globalConfig = mock<GlobalConfig>({ instanceAi: config, agents: agentsConfig });

	beforeEach(() => {
		mockReset(settings);
		agentsConfig.sandboxEnabled = false;
		config.sandboxEnabled = true;
		config.sandboxImage = 'test-image';
		config.sandboxSnapshot = 'test-snapshot';
		config.sandboxTimeout = 120_000;
		settings.isAgentSandboxEnabled.mockReturnValue(true);
		settings.getProvider.mockReturnValue('daytona');
		settings.resolveDaytonaSandboxConfig.mockResolvedValue({
			daytonaApiUrl: 'https://daytona.example.com/api',
			daytonaApiKey: 'daytona-key',
			image: 'test-image',
			snapshot: 'test-snapshot',
		});
		settings.resolveN8nSandboxConfig.mockResolvedValue({
			serviceUrl: 'https://sandbox.example.com',
			apiKey: 'sandbox-key',
		});
		Container.set(GlobalConfig, globalConfig);
		Container.set(SandboxSettingsService, settings);
	});

	afterEach(() => Container.reset());

	it.each(['daytona', 'n8n-sandbox'] as const)(
		'disables %s when only Agent sandboxes are enabled',
		async (provider) => {
			settings.getProvider.mockReturnValue(provider);
			agentsConfig.sandboxEnabled = true;
			config.sandboxEnabled = false;

			await expect(resolveAppSandboxConfig('project')).resolves.toEqual({
				enabled: false,
				provider,
			});
			expect(settings.registerCredentialUses).not.toHaveBeenCalled();
			expect(settings.resolveDaytonaSandboxConfig).not.toHaveBeenCalled();
			expect(settings.resolveN8nSandboxConfig).not.toHaveBeenCalled();
		},
	);

	it.each(['daytona', 'n8n-sandbox'] as const)(
		'resolves %s connections for cleanup when sandboxes are disabled',
		async (provider) => {
			settings.getProvider.mockReturnValue(provider);
			const connection = await resolveAppSandboxConfig('project');
			config.sandboxEnabled = false;

			await expect(resolveAppSandboxConfig('project', { checkEnabled: false })).resolves.toEqual(
				connection,
			);
		},
	);

	it.each(['daytona', 'n8n-sandbox'] as const)(
		'keeps %s disabled for cleanup when its connection is missing',
		async (provider) => {
			settings.getProvider.mockReturnValue(provider);
			config.sandboxEnabled = false;
			settings.resolveDaytonaSandboxConfig.mockResolvedValue({});
			settings.resolveN8nSandboxConfig.mockResolvedValue({});

			await expect(resolveAppSandboxConfig('project', { checkEnabled: false })).resolves.toEqual({
				enabled: false,
				provider,
			});
		},
	);

	it('uses Instance AI settings when Agent sandboxes are disabled', async () => {
		await expect(resolveAppSandboxConfig('project')).resolves.toEqual({
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: 'https://daytona.example.com/api',
			daytonaApiKey: 'daytona-key',
			image: 'test-image',
			snapshot: 'test-snapshot',
			timeout: 120_000,
		});
		expect(settings.registerCredentialUses).toHaveBeenCalledOnce();
		expect(settings.resolveDaytonaSandboxConfig).toHaveBeenCalledExactlyOnceWith('project', {
			image: 'test-image',
			snapshot: 'test-snapshot',
			fallbackSnapshot: `n8n/instance-ai:${N8N_VERSION}`,
		});
		expect(settings.resolveN8nSandboxConfig).not.toHaveBeenCalled();
	});

	it.each([undefined, ''])('disables Daytona when its API key is %s', async (apiKey) => {
		settings.resolveDaytonaSandboxConfig.mockResolvedValue({
			daytonaApiUrl: 'https://daytona.example.com/api',
			daytonaApiKey: apiKey,
		});

		await expect(resolveAppSandboxConfig('project')).resolves.toEqual({
			enabled: false,
			provider: 'daytona',
		});
		expect(settings.resolveN8nSandboxConfig).not.toHaveBeenCalled();
	});

	it('enables the Daytona proxy without a local API key', async () => {
		const getAuthToken = vi.fn(async () => 'proxy-token');
		settings.resolveDaytonaSandboxConfig.mockResolvedValue({
			daytonaApiUrl: 'https://proxy.example.com',
			snapshot: 'test-snapshot',
			getAuthToken,
		});

		await expect(resolveAppSandboxConfig('project')).resolves.toEqual({
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: 'https://proxy.example.com',
			snapshot: 'test-snapshot',
			getAuthToken,
			timeout: 120_000,
		});
	});

	it('resolves the n8n sandbox credentials and timeout', async () => {
		settings.getProvider.mockReturnValue('n8n-sandbox');

		await expect(resolveAppSandboxConfig('project')).resolves.toEqual({
			enabled: true,
			provider: 'n8n-sandbox',
			serviceUrl: 'https://sandbox.example.com',
			apiKey: 'sandbox-key',
			timeout: 120_000,
		});
		expect(settings.registerCredentialUses).toHaveBeenCalledOnce();
		expect(settings.resolveN8nSandboxConfig).toHaveBeenCalledOnce();
		expect(settings.resolveDaytonaSandboxConfig).not.toHaveBeenCalled();
	});

	it.each([undefined, ''])('disables the n8n sandbox when its URL is %s', async (serviceUrl) => {
		settings.getProvider.mockReturnValue('n8n-sandbox');
		settings.resolveN8nSandboxConfig.mockResolvedValue({ serviceUrl, apiKey: 'sandbox-key' });

		await expect(resolveAppSandboxConfig('project')).resolves.toEqual({
			enabled: false,
			provider: 'n8n-sandbox',
		});
		expect(settings.resolveDaytonaSandboxConfig).not.toHaveBeenCalled();
	});

	it('allows an n8n sandbox service without an API key', async () => {
		settings.getProvider.mockReturnValue('n8n-sandbox');
		settings.resolveN8nSandboxConfig.mockResolvedValue({
			serviceUrl: 'https://sandbox.example.com',
		});

		await expect(resolveAppSandboxConfig('project')).resolves.toEqual({
			enabled: true,
			provider: 'n8n-sandbox',
			serviceUrl: 'https://sandbox.example.com',
			apiKey: undefined,
			timeout: 120_000,
		});
	});
});
