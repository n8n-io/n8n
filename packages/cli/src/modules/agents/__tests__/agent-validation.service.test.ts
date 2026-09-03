import type { CredentialProvider } from '@n8n/agents';
import { AI_GATEWAY_MANAGED_TAG, type AgentJsonConfig } from '@n8n/api-types';
import type { WorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { NodeTypes } from '@/node-types';
import type { AiGatewayService } from '@/services/ai-gateway.service';

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

function makeCredentialProvider(
	credentials: Array<{ id: string; type: string }> = [],
	resolveImpl?: (id: string) => Record<string, unknown>,
) {
	return {
		list: vi.fn().mockResolvedValue(credentials),
		resolve: vi.fn().mockImplementation(async (id: string) => resolveImpl?.(id) ?? {}),
	} as unknown as CredentialProvider;
}

function makeService() {
	const agentRepository = mock<AgentRepository>();
	const agentSkillsService = mock<AgentSkillsService>();
	const agentTaskRepository = mock<AgentTaskRepository>();
	agentTaskRepository.findByAgentId.mockResolvedValue([]);
	const agentTaskSnapshotRepository = mock<AgentTaskSnapshotRepository>();
	agentTaskSnapshotRepository.findByVersionId.mockResolvedValue([]);
	const nodeTypes = mock<NodeTypes>();
	const workflowRepository = mock<WorkflowRepository>();
	workflowRepository.findManyByAgentToolReferences.mockResolvedValue([]);
	agentRepository.findByIdsAndProjectId.mockResolvedValue([]);
	const chatIntegrationRegistry = mock<ChatIntegrationRegistry>();
	chatIntegrationRegistry.get.mockReturnValue(undefined);
	const aiGatewayService = mock<AiGatewayService>();
	return {
		service: new AgentValidationService(
			agentRepository,
			agentTaskRepository,
			agentTaskSnapshotRepository,
			nodeTypes,
			workflowRepository,
			chatIntegrationRegistry,
			aiGatewayService,
		),
		agentRepository,
		agentSkillsService,
		agentTaskRepository,
		agentTaskSnapshotRepository,
		nodeTypes,
		workflowRepository,
		chatIntegrationRegistry,
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
});

describe('AgentValidationService — structured issues', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('flags a main model credential whose provider does not match the configured model, but not when the model itself is invalid', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent(runnableConfig));

		const mismatchResult = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'anthropicApi' }]),
		);

		expect(mismatchResult.status).toBe('invalid');
		expect(mismatchResult.issues).toEqual([
			expect.objectContaining({
				code: 'incompatible_credential',
				path: 'credential',
				capability: { kind: 'agent' },
			}),
		]);

		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ ...runnableConfig, model: 'not-a-model' }),
		);

		const invalidModelResult = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(invalidModelResult.issues).toEqual(
			expect.arrayContaining([expect.objectContaining({ code: 'invalid_value', path: 'model' })]),
		);
		expect(invalidModelResult.issues).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'incompatible_credential', path: 'credential' }),
			]),
		);
	});

	it('accepts Azure OpenAI and AWS Bedrock credentials paired with their own provider models', async () => {
		const { service, agentRepository } = makeService();

		const azureConfig: AgentJsonConfig = {
			...runnableConfig,
			model: 'azure-openai/gpt-4o',
			credential: 'azure-main',
			modelDeploymentName: 'my-gpt4o-deployment',
		};
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent(azureConfig));
		const azureResult = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'azure-main', type: 'azureOpenAiApi' }]),
		);
		expect(azureResult).toEqual({ status: 'valid', issues: [] });

		const azureEntraConfig: AgentJsonConfig = {
			...runnableConfig,
			model: 'azure-openai/gpt-4o',
			credential: 'azure-entra',
			modelDeploymentName: 'my-gpt4o-deployment',
		};
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent(azureEntraConfig));
		const azureEntraResult = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'azure-entra', type: 'azureEntraCognitiveServicesOAuth2Api' }]),
		);
		expect(azureEntraResult).toEqual({ status: 'valid', issues: [] });

		const bedrockConfig: AgentJsonConfig = {
			...runnableConfig,
			model: 'aws-bedrock/anthropic.claude-3-sonnet',
			credential: 'bedrock-main',
		};
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent(bedrockConfig));
		const bedrockResult = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'bedrock-main', type: 'aws' }]),
		);
		expect(bedrockResult).toEqual({ status: 'valid', issues: [] });
	});

	it('flags a classic Azure OpenAI credential without a deployment name', async () => {
		const { service, agentRepository } = makeService();
		const azureConfig: AgentJsonConfig = {
			...runnableConfig,
			model: 'azure-openai/gpt-4o',
			credential: 'azure-main',
		};
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent(azureConfig));

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'azure-main', type: 'azureOpenAiApi' }], () => ({
				endpointType: 'classic',
			})),
		);

		expect(result.status).toBe('invalid');
		expect(result.issues).toContainEqual(
			expect.objectContaining({
				code: 'missing_required',
				path: 'modelDeploymentName',
				capability: { kind: 'agent' },
			}),
		);
	});

	it('accepts a Foundry Azure OpenAI credential without a deployment name', async () => {
		const { service, agentRepository } = makeService();
		const azureConfig: AgentJsonConfig = {
			...runnableConfig,
			model: 'azure-openai/gpt-4o',
			credential: 'azure-foundry',
		};
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent(azureConfig));

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'azure-foundry', type: 'azureOpenAiApi' }], () => ({
				endpointType: 'foundry',
			})),
		);

		expect(result).toEqual({ status: 'valid', issues: [] });
	});

	it('does not require a deployment name when Azure credential resolve fails', async () => {
		const { service, agentRepository } = makeService();
		const azureConfig: AgentJsonConfig = {
			...runnableConfig,
			model: 'azure-openai/gpt-4o',
			credential: 'azure-main',
		};
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent(azureConfig));

		const credentialProvider = makeCredentialProvider(
			[{ id: 'azure-main', type: 'azureOpenAiApi' }],
			() => {
				throw new Error('transient');
			},
		);

		const result = await service.validateAgentConfiguration(agentId, projectId, credentialProvider);

		expect(result.issues).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'missing_required', path: 'modelDeploymentName' }),
			]),
		);
	});

	it('flags a cross-provider mismatch between an Azure OpenAI credential and an OpenAI model', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ ...runnableConfig, credential: 'azure-main' }),
		);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'azure-main', type: 'azureOpenAiApi' }]),
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

	it('accepts the n8n Connect managed tag on the main model when the gateway serves the provider, else flags it', async () => {
		const { service, agentRepository, aiGatewayService } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ ...runnableConfig, credential: AI_GATEWAY_MANAGED_TAG }),
		);

		// Gateway serves the model's provider → the managed credential is valid.
		aiGatewayService.getCredentialTypeForProviderCached.mockReturnValue('openAiApi');
		const served = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([]),
		);
		expect(served.issues).not.toEqual(
			expect.arrayContaining([expect.objectContaining({ path: 'credential' })]),
		);

		// Cached config present but does not serve the provider → incompatible_credential.
		aiGatewayService.getCredentialTypeForProviderCached.mockReturnValue(null);
		const unserved = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([]),
		);
		expect(unserved.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'incompatible_credential', path: 'credential' }),
			]),
		);
	});

	it('does not flag the managed tag when gateway support cannot be determined (no cached config)', async () => {
		const { service, agentRepository, aiGatewayService } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ ...runnableConfig, credential: AI_GATEWAY_MANAGED_TAG }),
		);
		// No cached config (e.g. cold start or a throttled/failed fetch) → support is
		// unknown. The static validator must fail open rather than block a working agent.
		aiGatewayService.getCredentialTypeForProviderCached.mockReturnValue(undefined);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([]),
		);

		expect(result.issues).not.toEqual(
			expect.arrayContaining([expect.objectContaining({ path: 'credential' })]),
		);
	});

	it('flags a node tool missing a required credential slot but accepts one with the slot configured and accessible', async () => {
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
					{
						type: 'node',
						name: 'update_issue',
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

		expect(result.status).toBe('invalid');
		expect(result.issues).toEqual([
			expect.objectContaining({
				code: 'missing_credential',
				path: 'tools.0.node.credentials.linearOAuth2Api',
				capability: { kind: 'tool', id: 'create_issue', index: 0, toolType: 'node' },
			}),
		]);
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

	it('treats an n8n Connect managed node-tool credential as satisfied when the gateway covers it', async () => {
		const { service, agentRepository, nodeTypes, aiGatewayService } = makeService();
		nodeTypes.getByNameAndVersion.mockReturnValue({
			description: { credentials: [{ name: 'slackApi', required: true }], properties: [] },
		} as never);
		aiGatewayService.isAvailable.mockResolvedValue({
			available: true,
			config: {
				nodes: ['n8n-nodes-base.slack'],
				credentialTypes: ['slackApi'],
				providerConfig: {},
			},
		} as never);
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				tools: [
					{
						type: 'node',
						name: 'send_message',
						node: {
							nodeType: 'n8n-nodes-base.slackTool',
							nodeTypeVersion: 1,
							nodeParameters: {},
							credentials: {
								slackApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true },
							},
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

	it('flags an n8n Connect managed node-tool credential when the config no longer covers the node', async () => {
		const { service, agentRepository, nodeTypes, aiGatewayService } = makeService();
		nodeTypes.getByNameAndVersion.mockReturnValue({
			description: { credentials: [{ name: 'slackApi', required: true }], properties: [] },
		} as never);
		aiGatewayService.isAvailable.mockResolvedValue({
			available: true,
			config: {
				nodes: ['n8n-nodes-base.notion'],
				credentialTypes: ['notionApi'],
				providerConfig: {},
			},
		} as never);
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				tools: [
					{
						type: 'node',
						name: 'send_message',
						node: {
							nodeType: 'n8n-nodes-base.slackTool',
							nodeTypeVersion: 1,
							nodeParameters: {},
							credentials: {
								slackApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true },
							},
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
		expect(result.issues).toContainEqual(
			expect.objectContaining({
				code: 'invalid_credential',
				path: 'tools.0.node.credentials.slackApi',
			}),
		);
	});

	it('flags an n8n Connect managed node-tool credential when the feature is disabled', async () => {
		const { service, agentRepository, nodeTypes, aiGatewayService } = makeService();
		nodeTypes.getByNameAndVersion.mockReturnValue({
			description: { credentials: [{ name: 'slackApi', required: true }], properties: [] },
		} as never);
		aiGatewayService.isAvailable.mockResolvedValue({ available: false } as never);
		aiGatewayService.isEnabled.mockReturnValue(false);
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				tools: [
					{
						type: 'node',
						name: 'send_message',
						node: {
							nodeType: 'n8n-nodes-base.slackTool',
							nodeTypeVersion: 1,
							nodeParameters: {},
							credentials: {
								slackApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true },
							},
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
		expect(result.issues).toContainEqual(
			expect.objectContaining({
				code: 'invalid_credential',
				path: 'tools.0.node.credentials.slackApi',
			}),
		);
	});

	it('does not flag a managed node-tool credential when the gateway is enabled but its config is unavailable', async () => {
		// Indeterminate gateway state (e.g. transient config fetch failure) must
		// not fail closed, mirroring the managed main-credential policy.
		const { service, agentRepository, nodeTypes, aiGatewayService } = makeService();
		nodeTypes.getByNameAndVersion.mockReturnValue({
			description: { credentials: [{ name: 'slackApi', required: true }], properties: [] },
		} as never);
		aiGatewayService.isAvailable.mockResolvedValue({ available: false } as never);
		aiGatewayService.isEnabled.mockReturnValue(true);
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				tools: [
					{
						type: 'node',
						name: 'send_message',
						node: {
							nodeType: 'n8n-nodes-base.slackTool',
							nodeTypeVersion: 1,
							nodeParameters: {},
							credentials: {
								slackApi: { id: null, name: 'n8n credits', __aiGatewayManaged: true },
							},
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

	it("applies the node's default authentication when the selector is absent", async () => {
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

	it('validates a multi-auth node tool against its default authentication only, not every auth branch', async () => {
		const { service, agentRepository, nodeTypes } = makeService();
		nodeTypes.getByNameAndVersion.mockReturnValue({
			description: {
				properties: [
					{
						displayName: 'Authentication',
						name: 'authentication',
						type: 'options',
						options: [
							{ name: 'OAuth2 (recommended)', value: 'oAuth2' },
							{ name: 'Service Account', value: 'serviceAccount' },
						],
						default: 'oAuth2',
					},
				],
				credentials: [
					{
						name: 'googleApi',
						required: true,
						displayOptions: { show: { authentication: ['serviceAccount'] } },
					},
					{
						name: 'gmailOAuth2',
						required: true,
						displayOptions: { show: { authentication: ['oAuth2'] } },
					},
				],
			},
		} as never);
		const gmailNode = {
			nodeType: 'n8n-nodes-base.gmail',
			nodeTypeVersion: 2.2,
			nodeParameters: {},
		};
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				tools: [
					{
						type: 'node',
						name: 'send_email',
						node: {
							...gmailNode,
							credentials: { gmailOAuth2: { id: 'gmail-1', name: 'Gmail' } },
						},
					},
					{
						type: 'node',
						name: 'send_email_unconfigured',
						node: gmailNode,
					},
				],
			}),
		);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([
				{ id: 'openai-main', type: 'openAiApi' },
				{ id: 'gmail-1', type: 'gmailOAuth2' },
			]),
		);

		expect(result.status).toBe('invalid');
		expect(result.issues).toEqual([
			expect.objectContaining({
				code: 'missing_credential',
				path: 'tools.1.node.credentials.gmailOAuth2',
				capability: { kind: 'tool', id: 'send_email_unconfigured', index: 1, toolType: 'node' },
			}),
		]);
	});

	it('flags MCP servers with missing or incompatible credential authentication', async () => {
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
					{
						name: 'jira',
						url: 'https://example.com/mcp',
						transport: 'streamableHttp',
						authentication: 'bearerAuth',
						credential: 'wrong-type-cred',
					},
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
				{ id: 'wrong-type-cred', type: 'httpHeaderAuth' },
				{ id: 'generic-oauth-cred', type: 'mcpOAuth2Api' },
			]),
		);

		expect(result.status).toBe('invalid');
		expect(result.issues).toEqual([
			expect.objectContaining({
				code: 'missing_credential',
				path: 'mcpServers.0.credential',
				capability: { kind: 'mcpServer', id: 'github', index: 0 },
			}),
			expect.objectContaining({
				code: 'incompatible_credential',
				path: 'mcpServers.1.credential',
				capability: { kind: 'mcpServer', id: 'jira', index: 1 },
			}),
			expect.objectContaining({
				code: 'incompatible_credential',
				path: 'mcpServers.2.credential',
				capability: { kind: 'mcpServer', id: 'notion', index: 2 },
			}),
		]);
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

	it('flags channels with a missing credential or a credential type the integration does not support', async () => {
		const { service, agentRepository, chatIntegrationRegistry } = makeService();
		chatIntegrationRegistry.get.mockReturnValue({
			type: 'slack',
			credentialTypes: ['slackOAuth2Api'],
		} as never);
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent(
				runnableConfig,
				{},
				{
					integrations: [
						{ type: 'slack', credentialId: '' },
						{ type: 'slack', credentialId: 'wrong-cred' },
					],
				},
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

		expect(result.status).toBe('invalid');
		expect(result.issues).toEqual([
			expect.objectContaining({
				code: 'missing_credential',
				path: 'integrations.0.credentialId',
				capability: { kind: 'channel', id: 'slack', index: 0 },
			}),
			expect.objectContaining({
				code: 'incompatible_credential',
				path: 'integrations.1.credentialId',
				capability: { kind: 'channel', id: 'slack', index: 1 },
			}),
		]);
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

	it('flags a vector store whose derived tool name collides with a configured tool', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent(
				{
					...runnableConfig,
					tools: [{ type: 'custom', id: 'search_product_docs' }],
					vectorStores: [
						{
							provider: 'qdrant',
							name: 'product-docs',
							credential: 'qdrant-cred',
							useWhen: 'Search product docs',
							embedding: {
								model: 'openai/text-embedding-3-small',
								credential: 'embed-cred',
							},
							collectionName: 'product-docs',
						},
					],
				},
				{},
				{
					tools: {
						search_product_docs: {
							code: '',
							descriptor: { name: 'search_product_docs' },
						},
					} as unknown as Agent['tools'],
				},
			),
		);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

		expect(result.status).toBe('invalid');
		expect(result.issues).toEqual(
			expect.arrayContaining([
				{
					code: 'invalid_value',
					path: 'vectorStores.0.name',
					capability: { kind: 'vectorStore', id: 'product-docs', index: 0 },
				},
			]),
		);
	});

	it('flags an enabled task with an invalid schedule while keeping its body available, but ignores the same invalid body on a disabled task', async () => {
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
				tasks: [
					{ type: 'task', id: 'broken_schedule', enabled: true },
					{ type: 'task', id: 'broken_schedule', enabled: false },
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
				code: 'invalid_value',
				path: 'tasks.0',
				capability: { kind: 'task', id: 'broken_schedule', index: 0 },
			}),
		]);
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

	it('blocks an HTTP Request URL using $fromAI for publishing but not runtime validation', async () => {
		const { service, agentRepository, nodeTypes } = makeService();
		nodeTypes.getByNameAndVersion.mockReturnValue({
			description: { properties: [] },
		} as never);
		const config: AgentJsonConfig = {
			...runnableConfig,
			tools: [
				{
					type: 'node',
					name: 'Fetch page',
					node: {
						nodeType: 'n8n-nodes-base.httpRequestTool',
						nodeTypeVersion: 4.5,
						nodeParameters: { url: "={{ $fromAI('url') }}" },
					},
				},
			],
		};
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent(config));
		const credentials = makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]);

		const publishResult = await service.validateAgentConfiguration(
			agentId,
			projectId,
			credentials,
			'publish',
		);
		const runtimeResult = await service.validateAgentIsRunnable(agentId, projectId, credentials);
		const historyResult = await service.validateAgentHistoryConfiguration(
			agentId,
			projectId,
			{
				versionId: 'version-1',
				schema: config,
				skills: null,
				tools: null,
			} as never,
			[],
			credentials,
		);

		const expectedResult = {
			status: 'invalid',
			issues: [
				{
					code: 'invalid_value',
					path: 'tools.0.node.nodeParameters.url',
					capability: { kind: 'tool', id: 'Fetch page', index: 0, toolType: 'node' },
				},
			],
		} as const;
		expect(publishResult).toEqual(expectedResult);
		expect(historyResult).toEqual(expectedResult);
		expect(runtimeResult).toEqual({ missing: [] });
	});

	it('runtime validation ignores channel and task issues but still reports execution-relevant tool and sub-agent issues', async () => {
		const { service, agentRepository, agentTaskRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent(
				{
					...runnableConfig,
					tasks: [
						{ type: 'task', id: 'missing_enabled', enabled: true },
						{ type: 'task', id: 'broken_schedule', enabled: true },
					],
					subAgents: { agents: [{ agentId: 'ghost' }] },
					tools: [{ type: 'custom', id: 'missing_tool' }],
					mcpServers: [
						{ name: 'docs', url: '', transport: 'streamableHttp', authentication: 'none' },
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
		agentRepository.findByIdsAndProjectId.mockResolvedValue([]);

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

		expect(runtimeResult.missing).toEqual(
			expect.arrayContaining(['subAgents.agents.0.agentId', 'tools.0.id', 'mcpServers.0.url']),
		);
		expect(runtimeResult.missing).not.toEqual(
			expect.arrayContaining(['integrations.0.credentialId', 'tasks.0.id', 'tasks.1']),
		);
	});

	it('flags missing and self sub-agent references plus invalid workflow-tool references', async () => {
		const { service, agentRepository, workflowRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({
				...runnableConfig,
				subAgents: {
					agents: [
						{ agentId: 'sub-1' },
						{ agentId: 'sub-1' },
						{ agentId: 'sub-2' },
						{ agentId },
						{ agentId: 'sub-3' },
					],
				},
				tools: [
					{ type: 'workflow', workflowId: 'wf-a', workflow: 'Old Workflow A' },
					{ type: 'workflow', workflowId: 'wf-a', workflow: 'Old Workflow A' },
					{ type: 'workflow', workflow: 'Workflow B' },
					{ type: 'workflow', workflow: 'Workflow C' },
					{ type: 'workflow', workflowId: 'wf-missing', workflow: 'Workflow A' },
					{ type: 'workflow', workflowId: 'wf-form', workflow: 'Workflow With Form' },
				],
			}),
		);
		agentRepository.findByIdsAndProjectId.mockResolvedValue([
			{ id: 'sub-1', activeVersionId: 'version-1' },
			{ id: 'sub-3', activeVersionId: null },
		] as never);
		workflowRepository.findManyByAgentToolReferences.mockResolvedValue([
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
			{
				id: 'wf-form',
				name: 'Workflow With Form',
				nodes: [
					{
						id: 'trigger-2',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'form-1',
						name: 'Form',
						type: 'n8n-nodes-base.form',
						typeVersion: 1,
						position: [200, 0],
						parameters: {},
					},
				],
				// Form is reachable from the trigger, so it actually runs and is flagged.
				connections: { 'Manual Trigger': { main: [[{ node: 'Form', type: 'main', index: 0 }]] } },
			},
		] as never);

		const result = await service.validateAgentConfiguration(
			agentId,
			projectId,
			makeCredentialProvider([{ id: 'openai-main', type: 'openAiApi' }]),
		);

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
				code: 'missing_reference',
				path: 'tools.2.workflow',
				capability: { kind: 'tool', id: 'Workflow B', index: 2, toolType: 'workflow' },
			},
			{
				code: 'incompatible_reference',
				path: 'tools.3.workflow',
				capability: { kind: 'tool', id: 'Workflow C', index: 3, toolType: 'workflow' },
				reason: 'no_supported_trigger',
			},
			{
				code: 'missing_reference',
				path: 'tools.4.workflowId',
				capability: { kind: 'tool', id: 'Workflow A', index: 4, toolType: 'workflow' },
			},
			{
				code: 'incompatible_reference',
				path: 'tools.5.workflowId',
				capability: { kind: 'tool', id: 'Workflow With Form', index: 5, toolType: 'workflow' },
				reason: 'incompatible_nodes',
			},
		]);
	});

	it('loaded-agent full validation loads tasks but does not refetch the agent, flagging missing task bodies regardless of enabled state', async () => {
		const { service, agentTaskRepository } = makeService();
		const agent = makeAgent({
			...runnableConfig,
			tasks: [
				{ type: 'task', id: 'missing_task', enabled: true },
				{ type: 'task', id: 'missing_disabled', enabled: false },
			],
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
			expect.objectContaining({
				code: 'missing_reference',
				path: 'tasks.1.id',
				capability: { kind: 'task', id: 'missing_disabled', index: 1 },
			}),
		]);
	});
});

describe('AgentValidationService — mock-enabled node tools', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	function makeMockedToolConfig(mockEnabled: boolean, withCredential: boolean): AgentJsonConfig {
		return {
			...runnableConfig,
			tools: [
				{
					type: 'node',
					name: 'send_message',
					node: {
						nodeType: 'n8n-nodes-base.slackTool',
						nodeTypeVersion: 1,
						nodeParameters: {},
						...(withCredential
							? { credentials: { slackApi: { id: 'slack-1', name: 'Slack' } } }
							: {}),
					},
					...(mockEnabled ? { mock: { enabled: true, items: [{ ok: true }] } } : {}),
				},
			],
		};
	}

	function setUpSlackNodeType(nodeTypes: ReturnType<typeof makeService>['nodeTypes']) {
		nodeTypes.getByNameAndVersion.mockReturnValue({
			description: { credentials: [{ name: 'slackApi', required: true }], properties: [] },
		} as never);
	}

	const credentials = () =>
		makeCredentialProvider([
			{ id: 'openai-main', type: 'openAiApi' },
			{ id: 'slack-1', type: 'slackApi' },
		]);

	// Runtime/publish matrix (AGENT-716): a mock-enabled tool must never block
	// Preview on a missing credential, but publish always requires the real
	// thing — mocks are stripped from published snapshots (agent-publish.service.ts).
	it('mocked + no credential: runnable (no runtime issue) but not publishable', async () => {
		const { service, agentRepository, nodeTypes } = makeService();
		setUpSlackNodeType(nodeTypes);
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent(makeMockedToolConfig(true, false)),
		);

		const runtimeResult = await service.validateAgentConfiguration(
			agentId,
			projectId,
			credentials(),
			'runtime',
		);
		expect(runtimeResult).toEqual({ status: 'valid', issues: [] });

		const publishResult = await service.validateAgentConfiguration(
			agentId,
			projectId,
			credentials(),
			'publish',
		);
		expect(publishResult.status).toBe('invalid');
		expect(publishResult.issues).toEqual([
			expect.objectContaining({
				code: 'missing_credential',
				path: 'tools.0.node.credentials.slackApi',
				capability: { kind: 'tool', id: 'send_message', index: 0, toolType: 'node' },
			}),
		]);
	});

	it('unmocked + no credential: neither runnable nor publishable', async () => {
		const { service, agentRepository, nodeTypes } = makeService();
		setUpSlackNodeType(nodeTypes);
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent(makeMockedToolConfig(false, false)),
		);

		const runtimeResult = await service.validateAgentConfiguration(
			agentId,
			projectId,
			credentials(),
			'runtime',
		);
		expect(runtimeResult.status).toBe('invalid');
		expect(runtimeResult.issues).toEqual([
			expect.objectContaining({
				code: 'missing_credential',
				path: 'tools.0.node.credentials.slackApi',
			}),
		]);

		const publishResult = await service.validateAgentConfiguration(
			agentId,
			projectId,
			credentials(),
			'publish',
		);
		expect(publishResult.status).toBe('invalid');
	});

	it('mocked + credential configured: runnable and publishable', async () => {
		const { service, agentRepository, nodeTypes } = makeService();
		setUpSlackNodeType(nodeTypes);
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent(makeMockedToolConfig(true, true)),
		);

		const runtimeResult = await service.validateAgentConfiguration(
			agentId,
			projectId,
			credentials(),
			'runtime',
		);
		expect(runtimeResult).toEqual({ status: 'valid', issues: [] });

		const publishResult = await service.validateAgentConfiguration(
			agentId,
			projectId,
			credentials(),
			'publish',
		);
		expect(publishResult).toEqual({ status: 'valid', issues: [] });
	});

	it('still flags a missing_reference for a mocked tool with an unknown node type, in runtime scope', async () => {
		const { service, agentRepository, nodeTypes } = makeService();
		nodeTypes.getByNameAndVersion.mockImplementation(() => {
			throw new Error('unknown node type');
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent(makeMockedToolConfig(true, false)),
		);

		const runtimeResult = await service.validateAgentConfiguration(
			agentId,
			projectId,
			credentials(),
			'runtime',
		);

		expect(runtimeResult.status).toBe('invalid');
		expect(runtimeResult.issues).toEqual([
			expect.objectContaining({
				code: 'missing_reference',
				path: 'tools.0.node.nodeType',
				capability: { kind: 'tool', id: 'send_message', index: 0, toolType: 'node' },
			}),
		]);
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
});
