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
		const resolveConfig = jest.fn(() => ({ enabled: true, provider: 'n8n-sandbox' }));
		setAgentsConfig({ modules: ['node-tools-searcher'] as AgentsConfig['modules'] });
		Container.set(AgentKnowledgeSandboxConfigService, {
			resolveConfig,
		} as unknown as AgentKnowledgeSandboxConfigService);

		await expect(new AgentsModule().settings()).resolves.toEqual({
			enabled: true,
			modules: ['node-tools-searcher'],
			sandboxEnabled: true,
		});
		expect(resolveConfig).toHaveBeenCalledTimes(1);
	});

	it('hides sandbox features when sandbox config cannot be resolved', async () => {
		setAgentsConfig();
		Container.set(AgentKnowledgeSandboxConfigService, {
			resolveConfig: jest.fn(() => {
				throw new Error('N8N_SANDBOX_SERVICE_URL is required');
			}),
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
