import { AgentsConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { AgentKnowledgeSandboxConfigService } from '../agent-knowledge-sandbox-config.service';
import { AgentsModule } from '../agents.module';

describe('AgentsModule', () => {
	beforeEach(() => {
		Container.reset();
	});

	afterEach(() => {
		Container.reset();
	});

	function setAgentsConfig(overrides: Partial<AgentsConfig> = {}) {
		Container.set(AgentsConfig, {
			modules: [],
			aiSandboxEnabled: true,
			...overrides,
		} as AgentsConfig);
	}

	it('reports sandboxEnabled when sandbox config resolves', async () => {
		const isAvailable = jest.fn(() => true);
		setAgentsConfig({ modules: ['node-tools-searcher'] as AgentsConfig['modules'] });
		Container.set(AgentKnowledgeSandboxConfigService, {
			isAvailable,
		} as unknown as AgentKnowledgeSandboxConfigService);

		await expect(new AgentsModule().settings()).resolves.toEqual({
			enabled: true,
			modules: ['node-tools-searcher'],
			sandboxEnabled: true,
		});
		expect(isAvailable).toHaveBeenCalledTimes(1);
	});

	it('hides sandbox features when sandbox config cannot be resolved', async () => {
		setAgentsConfig();
		Container.set(AgentKnowledgeSandboxConfigService, {
			isAvailable: jest.fn(() => false),
		} as unknown as AgentKnowledgeSandboxConfigService);

		await expect(new AgentsModule().settings()).resolves.toEqual({
			enabled: true,
			modules: [],
			sandboxEnabled: false,
		});
	});

	it('hides sandbox features without resolving provider config when disabled', async () => {
		const resolveConfig = jest.fn();
		setAgentsConfig({ aiSandboxEnabled: false });
		Container.set(AgentKnowledgeSandboxConfigService, {
			resolveConfig,
		} as unknown as AgentKnowledgeSandboxConfigService);

		await expect(new AgentsModule().settings()).resolves.toMatchObject({
			sandboxEnabled: false,
		});
		expect(resolveConfig).not.toHaveBeenCalled();
	});
});

describe('AgentKnowledgeSandboxConfigService', () => {
	it('rejects Daytona config without an API key', () => {
		const service = new AgentKnowledgeSandboxConfigService({
			aiSandboxEnabled: true,
			aiSandboxProvider: 'daytona',
			daytonaApiKey: '',
			aiSandboxTimeout: 300_000,
		} as AgentsConfig);

		expect(() => service.resolveConfig()).toThrow('DAYTONA_API_KEY is required');
	});
});
