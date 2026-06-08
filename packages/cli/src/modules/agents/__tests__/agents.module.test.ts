import { AgentsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import type { AiService } from '@/services/ai.service';

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
	const aiService = mock<AiService>();

	beforeEach(() => {
		jest.clearAllMocks();
		aiService.isProxyEnabled.mockReturnValue(false);
	});

	function createService(overrides: Partial<AgentsConfig> = {}) {
		return new AgentKnowledgeSandboxConfigService(
			{
				aiSandboxEnabled: true,
				aiSandboxProvider: 'daytona',
				daytonaApiKey: '',
				aiSandboxTimeout: 300_000,
				...overrides,
			} as AgentsConfig,
			aiService,
		);
	}

	it('rejects Daytona config without an API key when proxy is disabled', () => {
		const service = createService();

		expect(() => service.resolveConfig()).toThrow('DAYTONA_API_KEY is required');
	});

	it('isAvailable returns true for Daytona when proxy is enabled without DAYTONA_API_KEY', () => {
		aiService.isProxyEnabled.mockReturnValue(true);
		const service = createService();

		expect(service.isAvailable()).toBe(true);
	});

	it('resolveConfigForUser returns proxy Daytona config when proxy is enabled', async () => {
		aiService.isProxyEnabled.mockReturnValue(true);
		aiService.getClient.mockResolvedValue({
			getSandboxProxyBaseUrl: () => 'https://proxy.example/sandbox',
			getSandboxProxyConfig: async () => ({ image: 'daytonaio/sandbox:proxy' }),
			getBuilderApiProxyToken: jest
				.fn()
				.mockResolvedValue({ accessToken: 'proxy-token', tokenType: 'Bearer' }),
		} as never);

		const service = createService();
		const config = await service.resolveConfigForUser('user-1');

		expect(config).toMatchObject({
			enabled: true,
			provider: 'daytona',
			daytonaApiUrl: 'https://proxy.example/sandbox',
			image: 'daytonaio/sandbox:proxy',
			timeout: 300_000,
		});
		expect(config).not.toHaveProperty('daytonaApiKey');
		expect(config.getAuthToken).toEqual(expect.any(Function));

		await expect(config.getAuthToken?.()).resolves.toBe('proxy-token');
		expect(aiService.getClient).toHaveBeenCalled();
		const client = await aiService.getClient.mock.results[0]?.value;
		expect(client.getBuilderApiProxyToken).toHaveBeenCalledWith(
			{ id: 'user-1' },
			{ userMessageId: expect.any(String) },
		);
	});
});
