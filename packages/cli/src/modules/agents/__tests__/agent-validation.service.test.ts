import type { CredentialProvider } from '@n8n/agents';
import type { AgentJsonConfig } from '@n8n/api-types';
import type { WorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { NodeTypes } from '@/node-types';
import type { AiService } from '@/services/ai.service';

import type { AgentSkillsService } from '../agent-skills.service';
import { AgentValidationService } from '../agent-validation.service';
import type { Agent } from '../entities/agent.entity';
import type { ChatIntegrationRegistry } from '../integrations/agent-chat-integration';
import type { AgentTaskSnapshotRepository } from '../repositories/agent-task-snapshot.repository';
import type { AgentTaskRepository } from '../repositories/agent-task.repository';
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

function makeAgent(
	config: AgentJsonConfig | null = runnableConfig,
	skills = {},
	overrides: Partial<Agent> = {},
): Agent {
	return {
		id: agentId,
		projectId,
		schema: config,
		skills,
		tools: {},
		integrations: [],
		...overrides,
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
	const agentTaskRepository = mock<AgentTaskRepository>();
	agentTaskRepository.findByAgentId.mockResolvedValue([]);
	const agentTaskSnapshotRepository = mock<AgentTaskSnapshotRepository>();
	agentTaskSnapshotRepository.findByVersionId.mockResolvedValue([]);
	const nodeTypes = mock<NodeTypes>();
	const workflowRepository = mock<WorkflowRepository>();
	workflowRepository.findOne.mockResolvedValue(null);
	workflowRepository.find.mockResolvedValue([]);
	agentRepository.findByIdsAndProjectId.mockResolvedValue([]);
	const chatIntegrationRegistry = mock<ChatIntegrationRegistry>();
	chatIntegrationRegistry.get.mockReturnValue(undefined);

	return {
		service: new AgentValidationService(
			agentRepository,
			aiService,
			agentTaskRepository,
			agentTaskSnapshotRepository,
			nodeTypes,
			workflowRepository,
			chatIntegrationRegistry,
		),
		agentRepository,
		agentSkillsService,
		agentTaskRepository,
		agentTaskSnapshotRepository,
		nodeTypes,
		workflowRepository,
		chatIntegrationRegistry,
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

describe('AgentValidationService — structured issues', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('flags a main model credential whose provider does not match the configured model', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent(runnableConfig));

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'anthropicApi' }]),
		);

		expect(result.status).toBe('invalid');
		expect(result.issues).toEqual([
			expect.objectContaining({
				code: 'incompatible_credential',
				path: 'credential',
				capability: { kind: 'agent' },
			}),
		]);
	});

	it('does not flag credential incompatibility when the model itself is invalid', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ ...runnableConfig, model: 'not-a-model' }),
		);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result.issues).toEqual(
			expect.arrayContaining([expect.objectContaining({ code: 'invalid_value', path: 'model' })]),
		);
		expect(result.issues).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'incompatible_credential', path: 'credential' }),
			]),
		);
	});

	it('flags a node tool missing a required credential slot', async () => {
		const { service, agentRepository, nodeTypes } = makeService();
		nodeTypes.getByNameAndVersion.mockReturnValue({
			description: {
				credentials: [{ name: 'linearOAuth2Api', required: true }],
				properties: [],
			},
		} as never);
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				tools: [
					{
						type: 'node',
						name: 'create_issue',
						node: {
							nodeType: 'n8n-nodes-base.linear',
							nodeTypeVersion: 1,
							nodeParameters: {},
						},
					},
				],
			}),
		);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result.status).toBe('invalid');
		expect(result.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'missing_credential',
					path: 'tools.0.node.credentials.linearOAuth2Api',
					capability: { kind: 'tool', id: 'create_issue', index: 0, toolType: 'node' },
				}),
			]),
		);
	});

	it('accepts a node tool whose required credential slot is configured and accessible', async () => {
		const { service, agentRepository, nodeTypes } = makeService();
		nodeTypes.getByNameAndVersion.mockReturnValue({
			description: {
				credentials: [{ name: 'linearOAuth2Api', required: true }],
				properties: [],
			},
		} as never);
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				tools: [
					{
						type: 'node',
						name: 'create_issue',
						node: {
							nodeType: 'n8n-nodes-base.linear',
							nodeTypeVersion: 1,
							nodeParameters: {},
							credentials: { linearOAuth2Api: { id: 'linear-1', name: 'Linear' } },
						},
					},
				],
			}),
		);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([
				{ id: 'openai-main', type: 'openAiApi' },
				{ id: 'linear-1', type: 'linearOAuth2Api' },
			]),
		);

		expect(result).toEqual({ status: 'valid', issues: [] });
	});

	it('ignores a conditionally required node-tool credential when its display options are inactive', async () => {
		const { service, agentRepository, nodeTypes } = makeService();
		nodeTypes.getByNameAndVersion.mockReturnValue({
			description: {
				credentials: [
					{
						name: 'httpSslAuth',
						required: true,
						displayOptions: { show: { provideSslCertificates: [true] } },
					},
				],
				properties: [],
			},
		} as never);
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				tools: [
					{
						type: 'node',
						name: 'make_request',
						node: {
							nodeType: 'n8n-nodes-base.httpRequest',
							nodeTypeVersion: 1,
							nodeParameters: { provideSslCertificates: false },
						},
					},
				],
			}),
		);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result).toEqual({ status: 'valid', issues: [] });
	});

	it('uses the credential authentication fallback when the node selector is absent', async () => {
		const { service, agentRepository, nodeTypes } = makeService();
		nodeTypes.getByNameAndVersion.mockReturnValue({
			description: {
				properties: [
					{
						displayName: 'Authentication',
						name: 'authentication',
						type: 'options',
						options: [{ name: 'Service Account', value: 'serviceAccount' }],
						default: 'serviceAccount',
					},
				],
				credentials: [
					{
						name: 'googleApi',
						required: true,
						displayOptions: { show: { authentication: ['serviceAccount'] } },
					},
				],
			},
		} as never);
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				tools: [
					{
						type: 'node',
						name: 'read_sheet',
						node: {
							nodeType: 'n8n-nodes-base.googleSheets',
							nodeTypeVersion: 1,
							nodeParameters: {},
						},
					},
				],
			}),
		);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result.status).toBe('invalid');
		expect(result.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'missing_credential',
					path: 'tools.0.node.credentials.googleApi',
					capability: { kind: 'tool', id: 'read_sheet', index: 0, toolType: 'node' },
				}),
			]),
		);
	});

	it('flags an MCP server with incomplete authentication as invalid', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				mcpServers: [
					{
						name: 'github',
						url: 'https://example.com/mcp',
						transport: 'streamableHttp',
						authentication: 'bearerAuth',
					},
				],
			}),
		);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result.status).toBe('invalid');
		expect(result.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'missing_credential',
					path: 'mcpServers.0.credential',
					capability: { kind: 'mcpServer', id: 'github', index: 0 },
				}),
			]),
		);
	});

	it('flags an MCP server whose credential type does not match the configured authentication', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				mcpServers: [
					{
						name: 'github',
						url: 'https://example.com/mcp',
						transport: 'streamableHttp',
						authentication: 'bearerAuth',
						credential: 'wrong-type-cred',
					},
				],
			}),
		);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([
				{ id: 'openai-main', type: 'openAiApi' },
				{ id: 'wrong-type-cred', type: 'httpHeaderAuth' },
			]),
		);

		expect(result.status).toBe('invalid');
		expect(result.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'incompatible_credential',
					path: 'mcpServers.0.credential',
					capability: { kind: 'mcpServer', id: 'github', index: 0 },
				}),
			]),
		);
	});

	it('accepts an MCP server whose credential type matches the configured authentication', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				mcpServers: [
					{
						name: 'github',
						url: 'https://example.com/mcp',
						transport: 'streamableHttp',
						authentication: 'bearerAuth',
						credential: 'right-type-cred',
					},
				],
			}),
		);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([
				{ id: 'openai-main', type: 'openAiApi' },
				{ id: 'right-type-cred', type: 'httpBearerAuth' },
			]),
		);

		expect(result).toEqual({ status: 'valid', issues: [] });
	});

	it('accepts an MCP server whose credential type exactly matches a registry-specific OAuth2 authentication', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				mcpServers: [
					{
						name: 'notion',
						url: 'https://example.com/mcp',
						transport: 'streamableHttp',
						authentication: 'notionMcpOAuth2Api',
						credential: 'notion-oauth-cred',
					},
				],
			}),
		);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([
				{ id: 'openai-main', type: 'openAiApi' },
				{ id: 'notion-oauth-cred', type: 'notionMcpOAuth2Api' },
			]),
		);

		expect(result).toEqual({ status: 'valid', issues: [] });
	});

	it('flags an MCP server whose credential is the generic OAuth2 type instead of the required registry-specific variant', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				mcpServers: [
					{
						name: 'notion',
						url: 'https://example.com/mcp',
						transport: 'streamableHttp',
						authentication: 'notionMcpOAuth2Api',
						credential: 'generic-oauth-cred',
					},
				],
			}),
		);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([
				{ id: 'openai-main', type: 'openAiApi' },
				{ id: 'generic-oauth-cred', type: 'mcpOAuth2Api' },
			]),
		);

		expect(result.status).toBe('invalid');
		expect(result.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'incompatible_credential',
					path: 'mcpServers.0.credential',
					capability: { kind: 'mcpServer', id: 'notion', index: 0 },
				}),
			]),
		);
	});

	it('flags a channel with a missing credential', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent(runnableConfig, {}, { integrations: [{ type: 'slack', credentialId: '' }] }),
		);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result.status).toBe('invalid');
		expect(result.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'missing_credential',
					path: 'integrations.0.credentialId',
					capability: { kind: 'channel', id: 'slack', index: 0 },
				}),
			]),
		);
	});

	it('flags a channel whose credential type the integration does not support', async () => {
		const { service, agentRepository, chatIntegrationRegistry } = makeService();
		chatIntegrationRegistry.get.mockReturnValue({
			type: 'slack',
			credentialTypes: ['slackOAuth2Api'],
		} as never);
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent(
				runnableConfig,
				{},
				{ integrations: [{ type: 'slack', credentialId: 'wrong-cred' }] },
			),
		);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([
				{ id: 'openai-main', type: 'openAiApi' },
				{ id: 'wrong-cred', type: 'httpHeaderAuth' },
			]),
		);

		expect(result.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'incompatible_credential',
					path: 'integrations.0.credentialId',
				}),
			]),
		);
	});

	it('flags a workflow tool whose target workflow no longer exists', async () => {
		const { service, agentRepository, workflowRepository } = makeService();
		workflowRepository.find.mockResolvedValue([]);
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				tools: [{ type: 'workflow', workflow: 'Deleted workflow' }],
			}),
		);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'missing_reference',
					path: 'tools.0.workflow',
					capability: { kind: 'tool', id: 'Deleted workflow', index: 0, toolType: 'workflow' },
				}),
			]),
		);
	});

	it('flags a custom tool without a saved body', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				tools: [{ type: 'custom', id: 'missing_tool' }],
			}),
		);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'missing_reference',
					path: 'tools.0.id',
					capability: { kind: 'tool', id: 'missing_tool', index: 0, toolType: 'custom' },
				}),
			]),
		);
	});

	it('flags task references without a saved body regardless of enabled state', async () => {
		const { service, agentRepository, agentTaskRepository } = makeService();
		agentTaskRepository.findByAgentId.mockResolvedValue([]);
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				tasks: [
					{ type: 'task', id: 'missing_enabled', enabled: true },
					{ type: 'task', id: 'missing_disabled', enabled: false },
				],
			}),
		);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result.issues).toEqual([
			expect.objectContaining({
				code: 'missing_reference',
				path: 'tasks.0.id',
				capability: { kind: 'task', id: 'missing_enabled', index: 0 },
			}),
			expect.objectContaining({
				code: 'missing_reference',
				path: 'tasks.1.id',
				capability: { kind: 'task', id: 'missing_disabled', index: 1 },
			}),
		]);
	});

	it('flags an enabled task with an invalid schedule while keeping its body available', async () => {
		const { service, agentRepository, agentTaskRepository } = makeService();
		agentTaskRepository.findByAgentId.mockResolvedValue([
			{
				id: 'broken_schedule',
				name: 'Broken schedule',
				objective: 'Demonstrate task validation',
				cronExpression: 'not a cron',
			},
		] as never);
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				tasks: [{ type: 'task', id: 'broken_schedule', enabled: true }],
			}),
		);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result.issues).toEqual([
			expect.objectContaining({
				code: 'invalid_value',
				path: 'tasks.0',
				capability: { kind: 'task', id: 'broken_schedule', index: 0 },
			}),
		]);
	});

	it('flags a sub-agent reference to a non-existent agent', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ ...runnableConfig, subAgents: { agents: [{ agentId: 'ghost' }] } }),
		);
		agentRepository.findByIdsAndProjectId.mockResolvedValue([]);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'missing_reference',
					path: 'subAgents.agents.0.agentId',
					capability: { kind: 'subAgent', id: 'ghost', index: 0 },
				}),
			]),
		);
	});

	it('flags a sub-agent reference to an unpublished agent', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ ...runnableConfig, subAgents: { agents: [{ agentId: 'sub-1' }] } }),
		);
		agentRepository.findByIdsAndProjectId.mockResolvedValue([
			{ id: 'sub-1', activeVersionId: null },
		] as never);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'incompatible_reference',
					path: 'subAgents.agents.0.agentId',
					capability: { kind: 'subAgent', id: 'sub-1', index: 0 },
				}),
			]),
		);
	});

	it('flags a self-referencing sub-agent', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ ...runnableConfig, subAgents: { agents: [{ agentId }] } }),
		);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'incompatible_reference',
					path: 'subAgents.agents.0.agentId',
					capability: { kind: 'subAgent', id: agentId, index: 0 },
				}),
			]),
		);
	});

	it('ignores absent and disabled optional capabilities entirely', async () => {
		const { service, agentRepository, agentTaskRepository } = makeService();
		agentTaskRepository.findByAgentId.mockResolvedValue([
			{
				id: 'disabled_task',
				name: 'Disabled task',
				objective: 'Not scheduled',
				cronExpression: '0 9 * * *',
			},
		] as never);
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				memory: { enabled: false, storage: 'n8n' },
				config: { webSearch: { enabled: false } },
				tasks: [{ type: 'task', id: 'disabled_task', enabled: false }],
			}),
		);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result).toEqual({ status: 'valid', issues: [] });
	});

	it('treats a credential-listing failure as invalid rather than silently valid', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent(runnableConfig));
		const failingCredentialProvider = {
			list: vi.fn().mockRejectedValue(new Error('credentials unavailable')),
		} as unknown as CredentialProvider;

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			failingCredentialProvider,
		);

		expect(result.status).toBe('invalid');
		expect(result.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'invalid_credential', path: 'credential' }),
			]),
		);
	});

	it('reports invalid_credential for every configured credential path when lookups fail, without skipping later checks', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				memory: {
					enabled: true,
					storage: 'n8n',
					observationalMemory: {
						observerModel: { model: 'openai/gpt-4o', credential: 'observer-cred' },
						reflectorModel: { model: 'openai/gpt-4o', credential: 'reflector-cred' },
					},
				},
				config: {
					webSearch: { enabled: true, provider: 'brave', credential: 'web-search-cred' },
				},
				vectorStores: [
					{
						provider: 'qdrant',
						name: 'docs',
						credential: 'vector-conn-cred',
						useWhen: 'Search docs',
						embedding: { model: 'openai/text-embedding-3-small', credential: 'vector-embed-cred' },
						collectionName: 'docs',
					},
				],
				subAgents: {
					enabled: true,
					modelsByDifficulty: {
						low: { model: 'openai/gpt-4o', credential: 'low-cred' },
						medium: { model: 'openai/gpt-4o', credential: 'medium-cred' },
					},
				},
			} as AgentJsonConfig),
		);
		const failingCredentialProvider = {
			list: vi.fn().mockRejectedValue(new Error('credentials unavailable')),
		} as unknown as CredentialProvider;

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			failingCredentialProvider,
		);

		expect(result.status).toBe('invalid');
		expect(result.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'invalid_credential',
					path: 'memory.observationalMemory.observerModel.credential',
				}),
				expect.objectContaining({
					code: 'invalid_credential',
					path: 'memory.observationalMemory.reflectorModel.credential',
				}),
				expect.objectContaining({ code: 'invalid_credential', path: 'webSearch.credential' }),
				expect.objectContaining({
					code: 'invalid_credential',
					path: 'vectorStores.docs.credential',
				}),
				expect.objectContaining({
					code: 'invalid_credential',
					path: 'vectorStores.docs.embedding.credential',
				}),
				expect.objectContaining({
					code: 'invalid_credential',
					path: 'subAgents.modelsByDifficulty.low.credential',
				}),
				expect.objectContaining({
					code: 'invalid_credential',
					path: 'subAgents.modelsByDifficulty.medium.credential',
				}),
			]),
		);
	});

	it('distinguishes missing invalid and incompatible vector-store connection credentials', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				vectorStores: [
					{
						provider: 'pinecone',
						name: 'no_cred',
						credential: '',
						useWhen: 'Search docs',
						embedding: { model: 'openai/text-embedding-3-small', credential: 'openai-main' },
						indexName: 'docs',
					},
					{
						provider: 'supabase',
						name: 'inaccessible_cred',
						credential: 'nonexistent-cred',
						useWhen: 'Search FAQ',
						embedding: { model: 'openai/text-embedding-3-small', credential: 'openai-main' },
						tableName: 'faq',
					},
					{
						provider: 'qdrant',
						name: 'wrong_type_cred',
						credential: 'postgres-cred',
						useWhen: 'Search notes',
						embedding: { model: 'openai/text-embedding-3-small', credential: 'openai-main' },
						collectionName: 'notes',
					},
				],
			} as AgentJsonConfig),
		);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([
				{ id: 'openai-main', type: 'openAiApi' },
				{ id: 'postgres-cred', type: 'postgres' },
			]),
		);

		expect(result.status).toBe('invalid');
		expect(result.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					code: 'missing_credential',
					path: 'vectorStores.no_cred.credential',
				}),
				expect.objectContaining({
					code: 'invalid_credential',
					path: 'vectorStores.inaccessible_cred.credential',
				}),
				expect.objectContaining({
					code: 'incompatible_credential',
					path: 'vectorStores.wrong_type_cred.credential',
				}),
			]),
		);
		expect(result.issues).not.toContainEqual(
			expect.objectContaining({ path: 'vectorStores.no_cred.embedding.credential' }),
		);
		expect(result.issues).not.toContainEqual(
			expect.objectContaining({ path: 'vectorStores.inaccessible_cred.embedding.credential' }),
		);
		expect(result.issues).not.toContainEqual(
			expect.objectContaining({ path: 'vectorStores.wrong_type_cred.embedding.credential' }),
		);
	});

	it('runtime validation ignores channel and task issues without loading tasks', async () => {
		const { service, agentRepository, agentTaskRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent(
				{
					...runnableConfig,
					tasks: [
						{ type: 'task', id: 'missing_enabled', enabled: true },
						{ type: 'task', id: 'broken_schedule', enabled: true },
					],
				},
				{},
				{ integrations: [{ type: 'slack', credentialId: '' }] },
			),
		);
		agentTaskRepository.findByAgentId.mockResolvedValue([
			{
				id: 'broken_schedule',
				name: 'Broken schedule',
				objective: 'Demonstrate task validation',
				cronExpression: 'not a cron',
			},
		] as never);

		const publishResult = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
			'publish',
		);
		const runtimeResult = await service.validateAgentIsRunnable(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(publishResult.status).toBe('invalid');
		expect(publishResult.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ path: 'integrations.0.credentialId' }),
				expect.objectContaining({ path: 'tasks.0.id' }),
				expect.objectContaining({ path: 'tasks.1' }),
			]),
		);
		expect(runtimeResult).toEqual({ missing: [] });
		expect(agentTaskRepository.findByAgentId).toHaveBeenCalledTimes(1);
	});

	it('runtime validation still reports execution-relevant tool and sub-agent issues', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				subAgents: { agents: [{ agentId: 'ghost' }] },
				tools: [{ type: 'custom', id: 'missing_tool' }],
				mcpServers: [{ name: 'docs', url: '', authentication: 'none' }],
			}),
		);
		agentRepository.findByIdsAndProjectId.mockResolvedValue([]);

		const runtimeResult = await service.validateAgentIsRunnable(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(runtimeResult.missing).toEqual(
			expect.arrayContaining(['subAgents.agents.0.agentId', 'tools.0.id', 'mcpServers.0.url']),
		);
	});

	it('batches sub-agent and workflow lookups once per validation pass', async () => {
		const { service, agentRepository, workflowRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				subAgents: {
					agents: [
						{ agentId: 'sub-1' },
						{ agentId: 'sub-1' },
						{ agentId: 'sub-2' },
						{ agentId: agentId },
						{ agentId: 'sub-3' },
					],
				},
				tools: [
					{ type: 'workflow', workflow: 'Workflow A' },
					{ type: 'workflow', workflow: 'Workflow A' },
					{ type: 'workflow', workflow: 'Workflow B' },
					{ type: 'workflow', workflow: 'Workflow C' },
				],
			}),
		);
		agentRepository.findByIdsAndProjectId.mockResolvedValue([
			{ id: 'sub-1', activeVersionId: 'version-1' },
			{ id: 'sub-3', activeVersionId: null },
		] as never);
		workflowRepository.find.mockResolvedValue([
			{
				id: 'wf-a',
				name: 'Workflow A',
				nodes: [
					{
						id: 'trigger-node-id',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
			},
			{ id: 'wf-c', name: 'Workflow C', nodes: [] },
		] as never);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(agentRepository.findByIdsAndProjectId).toHaveBeenCalledTimes(1);
		expect(agentRepository.findByIdsAndProjectId).toHaveBeenCalledWith(
			['sub-1', 'sub-2', 'sub-3'],
			projectId,
		);
		expect(workflowRepository.find).toHaveBeenCalledTimes(1);
		expect(result.issues).toEqual([
			{
				code: 'missing_reference',
				path: 'subAgents.agents.2.agentId',
				capability: { kind: 'subAgent', id: 'sub-2', index: 2 },
			},
			{
				code: 'incompatible_reference',
				path: 'subAgents.agents.3.agentId',
				capability: { kind: 'subAgent', id: agentId, index: 3 },
			},
			{
				code: 'incompatible_reference',
				path: 'subAgents.agents.4.agentId',
				capability: { kind: 'subAgent', id: 'sub-3', index: 4 },
			},
			{
				code: 'missing_reference',
				path: 'tools.2.workflow',
				capability: { kind: 'tool', id: 'Workflow B', index: 2, toolType: 'workflow' },
			},
			{
				code: 'incompatible_reference',
				path: 'tools.3.workflow',
				capability: { kind: 'tool', id: 'Workflow C', index: 3, toolType: 'workflow' },
			},
		]);
	});

	it('loaded-agent full validation loads tasks but does not refetch the agent', async () => {
		const { service, agentRepository, agentTaskRepository } = makeService();
		const agent = makeAgent({
			...runnableConfig,
			tasks: [{ type: 'task', id: 'missing_task', enabled: true }],
		});
		agentTaskRepository.findByAgentId.mockResolvedValue([]);

		const result = await service.validateLoadedAgentConfiguration(
			agent,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
			'publish',
		);

		expect(result.issues).toEqual([
			expect.objectContaining({
				code: 'missing_reference',
				path: 'tasks.0.id',
				capability: { kind: 'task', id: 'missing_task', index: 0 },
			}),
		]);
		expect(agentTaskRepository.findByAgentId).toHaveBeenCalledWith(agentId);
		expect(agentRepository.findByIdAndProjectId).not.toHaveBeenCalled();
	});
});

describe('AgentValidationService — validateAgentEntityConfiguration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('validates the passed-in entity and task map directly, without refetching either from the database', async () => {
		const { service, agentRepository, agentTaskRepository } = makeService();
		const agent = makeAgent({ ...runnableConfig, credential: '' });
		const tasks = new Map();

		const result = await service.validateAgentEntityConfiguration(
			agent,
			projectId,
			tasks,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result.status).toBe('invalid');
		expect(result.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'missing_credential', path: 'credential' }),
			]),
		);
		expect(agentRepository.findByIdAndProjectId).not.toHaveBeenCalled();
		expect(agentTaskRepository.findByAgentId).not.toHaveBeenCalled();
	});

	it('reports the same missing-credential issue as validateAgentConfiguration for equivalent input', async () => {
		const { service, agentRepository } = makeService();
		const agent = makeAgent({ ...runnableConfig, credential: '' });
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		const credentialProvider = makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]);

		const viaEntity = await service.validateAgentEntityConfiguration(
			agent,
			projectId,
			new Map(),
			credentialProvider,
		);
		const viaFetch = await service.validateAgentConfiguration(
			agentId,
			projectId,
			credentialProvider,
		);

		expect(viaEntity).toEqual(viaFetch);
		expect(viaEntity.status).toBe('invalid');
		expect(viaEntity.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'missing_credential', path: 'credential' }),
			]),
		);
	});

	it('flags an enabled task missing from the passed-in task map, without querying the task repository', async () => {
		const { service, agentTaskRepository } = makeService();
		const agent = makeAgent({
			...runnableConfig,
			tasks: [{ type: 'task', id: 'missing_task', enabled: true }],
		});

		const result = await service.validateAgentEntityConfiguration(
			agent,
			projectId,
			new Map(),
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result.issues).toEqual([
			expect.objectContaining({
				code: 'missing_reference',
				path: 'tasks.0.id',
				capability: { kind: 'task', id: 'missing_task', index: 0 },
			}),
		]);
		expect(agentTaskRepository.findByAgentId).not.toHaveBeenCalled();
	});

	it('flags a disabled task missing from the passed-in task map, without querying the task repository', async () => {
		const { service, agentTaskRepository } = makeService();
		const agent = makeAgent({
			...runnableConfig,
			tasks: [{ type: 'task', id: 'missing_disabled', enabled: false }],
		});

		const result = await service.validateAgentEntityConfiguration(
			agent,
			projectId,
			new Map(),
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result.issues).toEqual([
			expect.objectContaining({
				code: 'missing_reference',
				path: 'tasks.0.id',
				capability: { kind: 'task', id: 'missing_disabled', index: 0 },
			}),
		]);
		expect(agentTaskRepository.findByAgentId).not.toHaveBeenCalled();
	});

	it('accepts a task present in the passed-in task map even when the task repository is not stubbed to return it', async () => {
		const { service } = makeService();
		const agent = makeAgent({
			...runnableConfig,
			tasks: [{ type: 'task', id: 'task-1', enabled: true }],
		});
		const tasks = new Map([
			[
				'task-1',
				{ name: 'Daily summary', objective: 'Summarize messages', cronExpression: '0 9 * * *' },
			],
		]);

		const result = await service.validateAgentEntityConfiguration(
			agent,
			projectId,
			tasks,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result).toEqual({ status: 'valid', issues: [] });
	});

	it('reports missing config issues when the passed-in entity has no schema', async () => {
		const { service } = makeService();
		const agent = makeAgent(null);

		const result = await service.validateAgentEntityConfiguration(
			agent,
			projectId,
			new Map(),
			makeCredentialProvider(),
		);

		expect(result).toEqual({
			status: 'invalid',
			issues: [
				expect.objectContaining({ code: 'missing_required', path: 'instructions' }),
				expect.objectContaining({ code: 'missing_required', path: 'model' }),
				expect.objectContaining({ code: 'missing_credential', path: 'credential' }),
			],
		});
	});
});
