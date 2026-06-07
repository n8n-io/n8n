import { AgentsConfig, InstanceAiConfig } from '@n8n/config';
import { OperationalError } from 'n8n-workflow';

import { AgentKnowledgeSandboxConfigService } from '../agent-knowledge-sandbox-config.service';

function createInstanceAiConfig(overrides: Partial<InstanceAiConfig> = {}): InstanceAiConfig {
	return Object.assign(new InstanceAiConfig(), overrides);
}

function createAgentsConfig(overrides: Partial<AgentsConfig> = {}): AgentsConfig {
	return Object.assign(
		new AgentsConfig(),
		{
			aiSandboxEnabled: true,
			aiSandboxProvider: 'n8n-sandbox',
			aiSandboxTimeout: 300_000,
		},
		overrides,
	);
}

describe('AgentKnowledgeSandboxConfigService', () => {
	it('returns disabled config when agent AI sandbox is disabled', () => {
		const service = new AgentKnowledgeSandboxConfigService(
			createInstanceAiConfig(),
			createAgentsConfig({ aiSandboxEnabled: false }),
		);

		expect(service.resolveConfig()).toEqual({
			enabled: false,
			provider: 'n8n-sandbox',
			timeout: 300_000,
		});
	});

	it('resolves enabled n8n sandbox config from instance AI service URL', () => {
		const service = new AgentKnowledgeSandboxConfigService(
			createInstanceAiConfig({
				n8nSandboxServiceUrl: ' https://sandbox.example.test ',
				n8nSandboxServiceApiKey: 'key',
			}),
			createAgentsConfig({
				aiSandboxProvider: 'n8n-sandbox',
				aiSandboxTimeout: 1234,
			}),
		);

		expect(service.resolveConfig()).toEqual({
			enabled: true,
			provider: 'n8n-sandbox',
			serviceUrl: 'https://sandbox.example.test',
			apiKey: 'key',
			timeout: 1234,
		});
	});

	it('throws clear error when enabled n8n sandbox service URL is missing', () => {
		const service = new AgentKnowledgeSandboxConfigService(
			createInstanceAiConfig({
				n8nSandboxServiceUrl: '',
			}),
			createAgentsConfig(),
		);

		expect(() => service.resolveConfig()).toThrow(OperationalError);
		expect(() => service.resolveConfig()).toThrow(
			'N8N_SANDBOX_SERVICE_URL is required to use the agent knowledge base sandbox.',
		);
	});

	it('resolves enabled daytona config from agents config', () => {
		const service = new AgentKnowledgeSandboxConfigService(
			createInstanceAiConfig(),
			createAgentsConfig({
				aiSandboxProvider: 'daytona',
				daytonaApiUrl: 'https://app.daytona.io/api',
				daytonaApiKey: 'dtn_',
				aiSandboxImage: 'daytonaio/sandbox:0.5.0',
				aiSandboxTimeout: 5678,
			}),
		);

		expect(service.resolveConfig()).toEqual({
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: 'https://app.daytona.io/api',
			daytonaApiKey: 'dtn_',
			image: 'daytonaio/sandbox:0.5.0',
			timeout: 5678,
			name: undefined,
		});
	});

	it('falls back to n8n-sandbox for unknown provider', () => {
		const service = new AgentKnowledgeSandboxConfigService(
			createInstanceAiConfig({
				n8nSandboxServiceUrl: 'https://sandbox.example.test',
			}),
			createAgentsConfig({
				aiSandboxProvider: 'unknown',
			}),
		);

		expect(service.resolveConfig()).toEqual({
			enabled: true,
			provider: 'n8n-sandbox',
			serviceUrl: 'https://sandbox.example.test',
			apiKey: undefined,
			timeout: 300_000,
		});
	});
});
