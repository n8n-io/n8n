import type { Logger } from '@n8n/backend-common';
import type { AgentsConfig, InstanceAiConfig } from '@n8n/config';
import type { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import { mock } from 'vitest-mock-extended';

import type { InstanceCredentialBroker } from '@/credentials/instance-credential-broker';

import { SandboxSettingsService } from '../sandbox-settings.service';
import type { AiService } from '../ai.service';

describe('SandboxSettingsService', () => {
	const globalConfig = mock<{
		agents: AgentsConfig;
		instanceAi: InstanceAiConfig;
		deployment: { type: string };
	}>({
		agents: {
			sandboxEnabled: false,
		} as AgentsConfig,
		instanceAi: {
			sandboxEnabled: false,
			sandboxProvider: 'n8n-sandbox',
			n8nSandboxServiceUrl: 'http://sandbox-api:8080',
			n8nSandboxServiceApiKey: '',
			daytonaApiUrl: '',
			daytonaApiKey: '',
		} as unknown as InstanceAiConfig,
		deployment: { type: 'default' },
	});
	const instanceCredentialBroker = mock<InstanceCredentialBroker>();
	const logger = mock<Logger>();
	const aiService = mock<AiService>();
	const client = mock<AiAssistantClient>();

	let service: SandboxSettingsService;

	beforeEach(() => {
		vi.resetAllMocks();
		globalConfig.agents.sandboxEnabled = false;
		Object.assign(globalConfig.instanceAi, {
			sandboxEnabled: false,
			sandboxProvider: 'n8n-sandbox',
			n8nSandboxServiceUrl: 'http://sandbox-api:8080',
			n8nSandboxServiceApiKey: '',
			daytonaApiUrl: '',
			daytonaApiKey: '',
		});
		globalConfig.deployment.type = 'default';
		logger.scoped.mockReturnValue(logger);
		aiService.isProxyEnabled.mockReturnValue(false);
		aiService.getClient.mockResolvedValue(client);
		service = new SandboxSettingsService(
			globalConfig as never,
			instanceCredentialBroker,
			logger,
			aiService,
		);
	});

	it.each([
		{ agentsEnabled: true, instanceAiEnabled: false, expected: true },
		{ agentsEnabled: false, instanceAiEnabled: true, expected: true },
		{ agentsEnabled: false, instanceAiEnabled: false, expected: false },
	])(
		'enables Agent sandboxes=$expected for Agents=$agentsEnabled and Instance AI=$instanceAiEnabled',
		({ agentsEnabled, instanceAiEnabled, expected }) => {
			globalConfig.agents.sandboxEnabled = agentsEnabled;
			globalConfig.instanceAi.sandboxEnabled = instanceAiEnabled;

			expect(service.isAgentSandboxEnabled()).toBe(expected);
		},
	);

	it('uses environment config when no credentials are assigned', async () => {
		Object.assign(globalConfig.instanceAi, {
			daytonaApiUrl: 'https://env.daytona.example.com',
			daytonaApiKey: 'daytona-env-key',
			n8nSandboxServiceApiKey: 'sandbox-env-key',
		});
		instanceCredentialBroker.resolveForUse.mockResolvedValue(null);

		await expect(service.resolveDaytonaConfig()).resolves.toEqual({
			apiUrl: 'https://env.daytona.example.com',
			apiKey: 'daytona-env-key',
		});
		await expect(service.resolveN8nSandboxConfig()).resolves.toEqual({
			serviceUrl: 'http://sandbox-api:8080',
			apiKey: 'sandbox-env-key',
		});
	});

	it('resolves a direct Daytona connection with the supplied image and snapshot', async () => {
		globalConfig.instanceAi.daytonaApiKey = 'daytona-key';
		instanceCredentialBroker.resolveForUse.mockResolvedValue(null);

		await expect(
			service.resolveDaytonaSandboxConfig('project', {
				image: 'test-image',
				snapshot: ' test-snapshot ',
				fallbackSnapshot: 'fallback-snapshot',
			}),
		).resolves.toEqual({
			daytonaApiUrl: undefined,
			daytonaApiKey: 'daytona-key',
			image: 'test-image',
			snapshot: 'test-snapshot',
		});
		expect(aiService.getClient).not.toHaveBeenCalled();
	});

	it.each([false, true])(
		'uses the fallback snapshot only when the Daytona proxy is enabled (%s)',
		async (proxyEnabled) => {
			aiService.isProxyEnabled.mockReturnValue(proxyEnabled);
			instanceCredentialBroker.resolveForUse.mockResolvedValue(null);

			const config = await service.resolveDaytonaSandboxConfig('project', {
				image: 'test-image',
				snapshot: ' ',
				fallbackSnapshot: ' fallback-snapshot ',
			});
			expect(config.snapshot).toBe(proxyEnabled ? 'fallback-snapshot' : undefined);
			expect(config.image).toBe(proxyEnabled ? undefined : 'test-image');
		},
	);

	it('resolves the proxy connection and mints refreshable tokens with project scope', async () => {
		aiService.isProxyEnabled.mockReturnValue(true);
		client.getSandboxProxyBaseUrl.mockReturnValue('https://sandbox-proxy.example');
		client.getBuilderApiProxyToken
			.mockResolvedValueOnce({ accessToken: 'proxy-token-1', tokenType: 'Bearer' })
			.mockResolvedValueOnce({ accessToken: 'proxy-token-2', tokenType: 'Bearer' });

		const config = await service.resolveDaytonaSandboxConfig('project', {
			image: 'direct-image',
			snapshot: 'test-snapshot',
			fallbackSnapshot: 'fallback-snapshot',
		});

		expect(config).toEqual({
			daytonaApiUrl: 'https://sandbox-proxy.example',
			snapshot: 'test-snapshot',
			getAuthToken: expect.any(Function),
		});
		expect(instanceCredentialBroker.resolveForUse).not.toHaveBeenCalled();
		expect(client.getBuilderApiProxyToken).not.toHaveBeenCalled();
		await expect(config.getAuthToken?.()).resolves.toBe('proxy-token-1');
		await expect(config.getAuthToken?.()).resolves.toBe('proxy-token-2');
		expect(client.getBuilderApiProxyToken).toHaveBeenCalledTimes(2);
		for (const [scope, options] of client.getBuilderApiProxyToken.mock.calls) {
			expect(scope).toEqual({ id: 'project' });
			expect(options).toEqual({ userMessageId: expect.any(String) });
		}
	});

	it('requires a snapshot for the Daytona proxy', async () => {
		aiService.isProxyEnabled.mockReturnValue(true);

		await expect(
			service.resolveDaytonaSandboxConfig('project', { image: 'direct-image', snapshot: ' ' }),
		).rejects.toThrow(
			'The Daytona proxy requires a sandbox snapshot. For Agent sandboxes, set N8N_AGENTS_AI_SANDBOX_SNAPSHOT. For app builds, set N8N_INSTANCE_AI_SANDBOX_SNAPSHOT.',
		);
		expect(instanceCredentialBroker.resolveForUse).not.toHaveBeenCalled();
	});

	it('uses assigned Daytona credentials', async () => {
		Object.assign(globalConfig.instanceAi, {
			daytonaApiUrl: 'https://env.daytona.example.com',
			daytonaApiKey: 'env-key',
		});
		instanceCredentialBroker.resolveForUse.mockResolvedValue({
			id: 'daytona-credential',
			name: 'Daytona',
			type: 'daytonaApi',
			data: { apiUrl: 'https://daytona.example.com', apiKey: 'credential-key' },
		});

		await expect(service.resolveDaytonaConfig()).resolves.toEqual({
			apiUrl: 'https://daytona.example.com',
			apiKey: 'credential-key',
		});
	});

	it('falls back to environment config for a malformed Daytona credential', async () => {
		Object.assign(globalConfig.instanceAi, {
			daytonaApiUrl: 'https://env.daytona.example.com',
			daytonaApiKey: 'env-key',
		});
		instanceCredentialBroker.resolveForUse.mockResolvedValue({
			id: 'daytona-credential',
			name: 'Daytona',
			type: 'daytonaApi',
			data: { apiUrl: 'not-a-url', apiKey: 'credential-key' },
		});

		await expect(service.resolveDaytonaConfig()).resolves.toEqual({
			apiUrl: 'https://env.daytona.example.com',
			apiKey: 'env-key',
		});
		expect(logger.warn).toHaveBeenCalledWith(
			'Could not resolve the configured Daytona sandbox credential; using environment fallback',
			{
				credentialUseId: 'instance-ai:sandbox:daytona',
				error:
					'The field "apiUrl" must be a valid HTTP URL for provider connection type "daytonaApi"',
			},
		);
	});

	it('uses the assigned n8n Sandbox API key without replacing the environment URL', async () => {
		globalConfig.instanceAi.n8nSandboxServiceApiKey = 'env-key';
		instanceCredentialBroker.resolveForUse.mockResolvedValue({
			id: 'sandbox-credential',
			name: 'Sandbox',
			type: 'httpHeaderAuth',
			data: { name: 'X-Api-Key', value: 'credential-key' },
		});

		await expect(service.resolveN8nSandboxConfig()).resolves.toEqual({
			serviceUrl: 'http://sandbox-api:8080',
			apiKey: 'credential-key',
		});
	});

	it('falls back to environment config for a malformed n8n Sandbox credential', async () => {
		globalConfig.instanceAi.n8nSandboxServiceApiKey = 'env-key';
		instanceCredentialBroker.resolveForUse.mockResolvedValue({
			id: 'sandbox-credential',
			name: 'Sandbox',
			type: 'httpHeaderAuth',
			data: { name: 'Authorization', value: 'credential-key' },
		});

		await expect(service.resolveN8nSandboxConfig()).resolves.toEqual({
			serviceUrl: 'http://sandbox-api:8080',
			apiKey: 'env-key',
		});
		expect(logger.warn).toHaveBeenCalledWith(
			'Could not resolve the configured n8n Sandbox credential; using environment fallback',
			{
				credentialUseId: 'instance-ai:sandbox:n8n',
				error: 'The credential\'s header name must be "x-api-key" but is "authorization"',
			},
		);
	});

	it('ignores assigned sandbox credentials on cloud deployments', async () => {
		globalConfig.deployment.type = 'cloud';
		Object.assign(globalConfig.instanceAi, {
			daytonaApiUrl: 'https://env.daytona.example.com',
			daytonaApiKey: 'daytona-env-key',
			n8nSandboxServiceApiKey: 'sandbox-env-key',
		});

		await expect(service.resolveDaytonaConfig()).resolves.toEqual({
			apiUrl: 'https://env.daytona.example.com',
			apiKey: 'daytona-env-key',
		});
		await expect(service.resolveN8nSandboxConfig()).resolves.toEqual({
			serviceUrl: 'http://sandbox-api:8080',
			apiKey: 'sandbox-env-key',
		});
		expect(instanceCredentialBroker.resolveForUse).not.toHaveBeenCalled();
	});
});
