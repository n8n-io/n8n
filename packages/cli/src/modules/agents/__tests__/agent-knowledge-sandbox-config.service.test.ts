import { InstanceAiConfig } from '@n8n/config';
import { OperationalError } from 'n8n-workflow';

import { AgentKnowledgeSandboxConfigService } from '../agent-knowledge-sandbox-config.service';

function createInstanceAiConfig(overrides: Partial<InstanceAiConfig> = {}): InstanceAiConfig {
	return Object.assign(new InstanceAiConfig(), overrides);
}

describe('AgentKnowledgeSandboxConfigService', () => {
	it('resolves n8n sandbox config without requiring N8N_INSTANCE_AI_SANDBOX_ENABLED', () => {
		const config = createInstanceAiConfig({
			sandboxProvider: 'n8n-sandbox',
			sandboxEnabled: false,
			n8nSandboxServiceUrl: ' https://sandbox.example.test ',
			n8nSandboxServiceApiKey: 'key',
			sandboxTimeout: 1234,
		});
		const service = new AgentKnowledgeSandboxConfigService(config);

		expect(service.resolveConfig()).toEqual({
			enabled: true,
			provider: 'n8n-sandbox',
			serviceUrl: 'https://sandbox.example.test',
			apiKey: 'key',
			timeout: 1234,
		});
	});

	it('throws clear error when n8n sandbox service URL is missing', () => {
		const config = createInstanceAiConfig({
			sandboxProvider: 'n8n-sandbox',
			n8nSandboxServiceUrl: '',
		});
		const service = new AgentKnowledgeSandboxConfigService(config);

		expect(() => service.resolveConfig()).toThrow(OperationalError);
		expect(() => service.resolveConfig()).toThrow(
			'N8N_SANDBOX_SERVICE_URL is required to use the agent knowledge base sandbox.',
		);
	});

	it('resolves daytona config', () => {
		const config = createInstanceAiConfig({
			sandboxProvider: 'daytona',
			daytonaApiUrl: 'https://daytona.example.test',
			daytonaApiKey: 'daytona-key',
			sandboxImage: 'daytona-image',
			sandboxTimeout: 5678,
		});
		const service = new AgentKnowledgeSandboxConfigService(config);

		expect(service.resolveConfig()).toEqual({
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: 'https://daytona.example.test',
			daytonaApiKey: 'daytona-key',
			image: 'daytona-image',
			timeout: 5678,
			name: undefined,
		});
	});

	it('falls back to n8n-sandbox for unknown provider', () => {
		const config = createInstanceAiConfig({
			sandboxProvider: 'unknown',
			n8nSandboxServiceUrl: 'https://sandbox.example.test',
		});
		const service = new AgentKnowledgeSandboxConfigService(config);

		expect(service.resolveConfig()).toEqual({
			enabled: true,
			provider: 'n8n-sandbox',
			serviceUrl: 'https://sandbox.example.test',
			apiKey: undefined,
			timeout: 300_000,
		});
	});
});
