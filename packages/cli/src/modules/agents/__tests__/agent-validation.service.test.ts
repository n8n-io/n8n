import type { CredentialProvider } from '@n8n/agents';
import { AI_GATEWAY_MANAGED_TAG, type AgentJsonConfig } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import type { AiService } from '@/services/ai.service';
import type { AiGatewayService } from '@/services/ai-gateway.service';

import type { AgentSkillsService } from '../agent-skills.service';
import { AgentValidationService } from '../agent-validation.service';
import type { Agent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';

const agentId = 'agent-1';
const projectId = 'project-1';

const runnableConfig: AgentJsonConfig = {
	name: 'Support Agent',
	model: 'openai/gpt-4o',
	credential: 'openai-main',
	instructions: 'Help users',
	tools: [],
	skills: [],
};

function makeAgent(config: AgentJsonConfig | null = runnableConfig, skills = {}): Agent {
	return {
		id: agentId,
		projectId,
		schema: config,
		skills,
	} as unknown as Agent;
}

function makeCredentialProvider(credentials: Array<{ id: string; type: string }> = []) {
	return {
		list: vi.fn().mockResolvedValue(credentials),
	} as unknown as CredentialProvider;
}

function makeAiService(proxyEnabled = false) {
	return { isProxyEnabled: vi.fn().mockReturnValue(proxyEnabled) } as unknown as AiService;
}

function makeAiGatewayService(supportedProviders: string[] = []) {
	return {
		getCredentialTypeForProvider: vi.fn(async (provider: string) =>
			supportedProviders.includes(provider) ? `${provider}Api` : undefined,
		),
	} as unknown as AiGatewayService;
}

function makeService(aiService = makeAiService(), aiGatewayService = makeAiGatewayService()) {
	const agentRepository = mock<AgentRepository>();
	const agentSkillsService = mock<AgentSkillsService>();

	return {
		service: new AgentValidationService(agentRepository, aiService, aiGatewayService),
		agentRepository,
		agentSkillsService,
		aiService,
		aiGatewayService,
	};
}

describe('AgentValidationService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('reports missing essentials when the agent or runnable config is absent', async () => {
		const { service, agentRepository } = makeService();
		const credentials = makeCredentialProvider();

		agentRepository.findByIdAndProjectId.mockResolvedValue(null);
		await expect(service.validateAgentIsRunnable(agentId, projectId, credentials)).resolves.toEqual(
			{
				missing: ['agent'],
			},
		);

		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent(null));
		await expect(service.validateAgentIsRunnable(agentId, projectId, credentials)).resolves.toEqual(
			{
				missing: ['instructions', 'model', 'credential'],
			},
		);
	});

	it('accepts a complete runnable draft with an accessible credential', async () => {
		const { service, agentRepository } = makeService();

		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());

		await expect(
			service.validateAgentIsRunnable(
				agentId,
				projectId,
				makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
			),
		).resolves.toEqual({ missing: [] });
	});

	it('consolidates missing optional credential-backed features', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				memory: {
					enabled: true,
					storage: 'n8n',
					observationalMemory: {
						observerModel: { model: 'openai/gpt-4o', credential: 'missing-observer' },
					},
					episodicMemory: {
						enabled: true,
						credential: 'missing-episodic',
						extractorModel: { model: 'openai/gpt-4o', credential: 'missing-extractor' },
						reflectorModel: { model: 'openai/gpt-4o', credential: 'missing-reflector' },
					},
				},
				config: {
					webSearch: { enabled: true, provider: 'brave', credential: 'missing-web-search' },
				},
				subAgents: {
					enabled: true,
					modelsByDifficulty: {
						easy: { model: 'openai/gpt-4o', credential: 'missing-easy' },
						medium: { model: 'openai/gpt-4o', credential: 'missing-medium' },
						hard: { model: 'openai/gpt-4o', credential: 'missing-hard' },
					},
				},
				skills: [{ type: 'skill', id: 'skill-1' }],
			} as AgentJsonConfig),
		);

		const result = await service.validateAgentIsRunnable(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result.missing).toEqual(
			expect.arrayContaining([
				'memory.observationalMemory.observerModel.credential',
				'episodicMemory.credential',
				'memory.episodicMemory.extractorModel.credential',
				'memory.episodicMemory.reflectorModel.credential',
				'webSearch.credential',
				'subAgents.modelsByDifficulty.medium.credential',
				'skill:skill-1',
			]),
		);
	});

	it('flags worker model credentials that do not match the configured provider', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				memory: {
					enabled: true,
					storage: 'n8n',
					observationalMemory: {
						observerModel: { model: 'anthropic/claude-sonnet-4-6', credential: 'openai-main' },
					},
				},
			}),
		);

		await expect(
			service.validateAgentIsRunnable(
				agentId,
				projectId,
				makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
			),
		).resolves.toEqual({
			missing: ['memory.observationalMemory.observerModel.credential'],
		});
	});

	it('reports missing episodic memory credentials without skipping worker model checks', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				memory: {
					enabled: true,
					storage: 'n8n',
					episodicMemory: {
						enabled: true,
						credential: null as unknown as string,
						extractorModel: { model: 'openai/gpt-4o', credential: 'missing-extractor' },
					},
				},
			}),
		);

		const result = await service.validateAgentIsRunnable(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result.missing).toEqual(
			expect.arrayContaining([
				'episodicMemory.credential',
				'memory.episodicMemory.extractorModel.credential',
			]),
		);
	});

	it('accepts managed episodic memory credential when the assistant proxy is enabled', async () => {
		const { service, agentRepository } = makeService(makeAiService(true));
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				memory: {
					enabled: true,
					storage: 'n8n',
					episodicMemory: {
						enabled: true,
						credential: 'managed',
					},
				},
			} as AgentJsonConfig),
		);

		const result = await service.validateAgentIsRunnable(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result.missing).not.toContain('credential');
		expect(result.missing).not.toContain('episodicMemory.credential');
	});

	it('rejects managed episodic memory credential when the assistant proxy is disabled', async () => {
		const { service, agentRepository } = makeService(makeAiService(false));
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				memory: {
					enabled: true,
					storage: 'n8n',
					episodicMemory: {
						enabled: true,
						credential: 'managed',
					},
				},
			} as AgentJsonConfig),
		);

		const result = await service.validateAgentIsRunnable(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result.missing).toContain('episodicMemory.credential');
	});

	it('accepts the n8n Connect tag on the main model when the gateway serves the provider', async () => {
		const { service, agentRepository } = makeService(
			makeAiService(),
			makeAiGatewayService(['openai']),
		);
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ ...runnableConfig, model: 'openai/gpt-5', credential: AI_GATEWAY_MANAGED_TAG }),
		);

		const result = await service.validateAgentIsRunnable(
			agentId,
			projectId,
			makeCredentialProvider(),
		);

		expect(result.missing).not.toContain('credential');
	});

	it('reports missing credential for the n8n Connect tag when the gateway does not serve the provider', async () => {
		const { service, agentRepository } = makeService(makeAiService(), makeAiGatewayService([]));
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ ...runnableConfig, model: 'xai/grok-4', credential: AI_GATEWAY_MANAGED_TAG }),
		);

		const result = await service.validateAgentIsRunnable(
			agentId,
			projectId,
			makeCredentialProvider(),
		);

		expect(result.missing).toContain('credential');
	});

	it('accepts the n8n Connect tag on difficulty models when the gateway serves the provider', async () => {
		const { service, agentRepository } = makeService(
			makeAiService(),
			makeAiGatewayService(['openai']),
		);
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				subAgents: {
					modelsByDifficulty: {
						low: { model: 'openai/gpt-5-mini', credential: AI_GATEWAY_MANAGED_TAG },
					},
				},
			} as AgentJsonConfig),
		);

		const result = await service.validateAgentIsRunnable(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result.missing).not.toContain('subAgents.modelsByDifficulty.low.credential');
	});

	it('still reports missing for the n8n Connect tag on memory worker models (out of scope)', async () => {
		const { service, agentRepository } = makeService(
			makeAiService(),
			makeAiGatewayService(['openai']),
		);
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				memory: {
					enabled: true,
					observationalMemory: {
						observerModel: { model: 'openai/gpt-4o-mini', credential: AI_GATEWAY_MANAGED_TAG },
					},
				},
			} as AgentJsonConfig),
		);

		const result = await service.validateAgentIsRunnable(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result.missing).toContain('memory.observationalMemory.observerModel.credential');
	});
});
