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
		setAgentsConfig({ modules: ['knowledge-base'] as AgentsConfig['modules'] });
		Container.set(AgentKnowledgeSandboxConfigService, {
			isAvailable,
		} as unknown as AgentKnowledgeSandboxConfigService);

		await expect(new AgentsModule().settings()).resolves.toEqual({
			enabled: true,
			modules: ['knowledge-base'],
			sandboxEnabled: true,
		});
		expect(isAvailable).toHaveBeenCalledTimes(1);
	});

	it('hides sandbox features when the knowledge-base module is disabled', async () => {
		const isAvailable = jest.fn(() => true);
		setAgentsConfig({ modules: ['node-tools-searcher'] as AgentsConfig['modules'] });
		Container.set(AgentKnowledgeSandboxConfigService, {
			isAvailable,
		} as unknown as AgentKnowledgeSandboxConfigService);

		await expect(new AgentsModule().settings()).resolves.toEqual({
			enabled: true,
			modules: ['node-tools-searcher'],
			sandboxEnabled: false,
		});
		expect(isAvailable).not.toHaveBeenCalled();
	});

	it('hides sandbox features when sandbox config cannot be resolved', async () => {
		setAgentsConfig({ modules: ['knowledge-base'] as AgentsConfig['modules'] });
		Container.set(AgentKnowledgeSandboxConfigService, {
			isAvailable: jest.fn(() => false),
		} as unknown as AgentKnowledgeSandboxConfigService);

		await expect(new AgentsModule().settings()).resolves.toEqual({
			enabled: true,
			modules: ['knowledge-base'],
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
