import type { CredentialProvider } from '@n8n/agents';
import type { AgentJsonConfig } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import type { AiService } from '@/services/ai.service';

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

function makeService(aiService = makeAiService()) {
	const agentRepository = mock<AgentRepository>();
	const agentSkillsService = mock<AgentSkillsService>();

	return {
		service: new AgentValidationService(agentRepository, aiService),
		agentRepository,
		agentSkillsService,
		aiService,
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

	it('flags vector store connections with missing or inaccessible credentials', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				vectorStores: [
					{
						provider: 'qdrant',
						name: 'missing_creds',
						credential: '',
						useWhen: 'Search docs',
						embedding: { model: 'openai/text-embedding-3-small', credential: 'missing-embed' },
						collectionName: 'docs',
					},
					{
						provider: 'postgres',
						name: 'ok_store',
						credential: 'postgres-cred',
						useWhen: 'Search FAQ',
						embedding: { model: 'openai/text-embedding-3-small', credential: 'openai-main' },
						tableName: 'faq',
					},
				],
			} as AgentJsonConfig),
		);

		const result = await service.validateAgentIsRunnable(
			agentId,
			projectId,
			makeCredentialProvider([
				{ id: 'openai-main', type: 'openAiApi' },
				{ id: 'postgres-cred', type: 'postgres' },
			]),
		);

		expect(result.missing).toEqual(
			expect.arrayContaining([
				'vectorStores.missing_creds.credential',
				'vectorStores.missing_creds.embedding.credential',
			]),
		);
		expect(result.missing).not.toContain('vectorStores.ok_store.credential');
		expect(result.missing).not.toContain('vectorStores.ok_store.embedding.credential');
	});

	it('flags vector store connections whose credential type does not match the provider', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				vectorStores: [
					{
						provider: 'qdrant',
						name: 'wrong_type',
						credential: 'postgres-cred',
						useWhen: 'Search docs',
						embedding: { model: 'openai/text-embedding-3-small', credential: 'openai-main' },
						collectionName: 'docs',
					},
					{
						provider: 'qdrant',
						name: 'right_type',
						credential: 'qdrant-cred',
						useWhen: 'Search notes',
						embedding: { model: 'openai/text-embedding-3-small', credential: 'openai-main' },
						collectionName: 'notes',
					},
				],
			}),
		);

		const result = await service.validateAgentIsRunnable(
			agentId,
			projectId,
			makeCredentialProvider([
				{ id: 'openai-main', type: 'openAiApi' },
				{ id: 'postgres-cred', type: 'postgres' },
				{ id: 'qdrant-cred', type: 'qdrantApi' },
			]),
		);

		expect(result.missing).toContain('vectorStores.wrong_type.credential');
		expect(result.missing).not.toContain('vectorStores.right_type.credential');
		expect(result.missing).not.toContain('vectorStores.wrong_type.embedding.credential');
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
});
