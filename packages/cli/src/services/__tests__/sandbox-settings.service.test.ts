import type { Logger } from '@n8n/backend-common';
import type { AgentsConfig, InstanceAiConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { InstanceCredentialBroker } from '@/credentials/instance-credential-broker';

import { SandboxSettingsService } from '../sandbox-settings.service';

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
		service = new SandboxSettingsService(globalConfig as never, instanceCredentialBroker, logger);
	});

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
