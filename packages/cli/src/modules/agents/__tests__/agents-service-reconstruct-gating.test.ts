import {
	DELEGATE_SUB_AGENT_TOOL_NAME,
	DEFAULT_SUB_AGENT_MAX_CHILDREN,
	getInlineDelegateSubAgentToolOptions,
	WRITE_TODOS_TOOL_NAME,
	Workspace,
} from '@n8n/agents';
import type * as agents from '@n8n/agents';
import type { CredentialProvider, BuiltTool } from '@n8n/agents';
import {
	N8N_CHAT_ACTION_TOOL_NAME,
	N8N_CHAT_CONTEXT_TOOL_NAME,
	N8N_CHAT_INTEGRATION_TYPE,
	SUB_AGENT_MAX_CHILDREN_DEFAULT,
	type AgentJsonConfig,
} from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { CustomFetch, HttpTransport, OutboundHttp } from '@n8n/backend-network';
import type { UserRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { EphemeralNodeExecutor } from '@/node-execution';
import type { OauthService } from '@/oauth/oauth.service';
import type { AiService } from '@/services/ai.service';
import type { UrlService } from '@/services/url.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import type { AgentKnowledgeMirrorService } from '../agent-knowledge-mirror.service';
import { AgentRuntimeReconstructionService } from '../agent-runtime-reconstruction.service';
import { hashAgentSandboxPrincipal } from '../agent-sandbox-principal';
import type { AgentSandboxRuntimeService } from '../agent-sandbox-runtime.service';
import type { AgentWorkspaceService } from '../agent-workspace.service';
import type { Agent } from '../entities/agent.entity';
import { ChatIntegrationRegistry } from '../integrations/agent-chat-integration';
import { ChatIntegrationActionExecutor } from '../integrations/integration-action-executor';
import { ChatIntegrationContextQueryExecutor } from '../integrations/integration-context-query-executor';
import { IntegrationMessageContextService } from '../integrations/integration-message-context.service';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { N8nMemory } from '../integrations/n8n-memory';
import { N8nChatIntegration } from '../integrations/platforms/n8n-chat-integration';
import type * as FromJsonConfig from '../json-config/from-json-config';
import type { ToolExecutor } from '../json-config/from-json-config';
import type { AgentFileRepository } from '../repositories/agent-file.repository';
import type { AgentRepository } from '../repositories/agent.repository';
import type { AgentSecureRuntime } from '../runtime/agent-secure-runtime';
import { SubAgentForegroundRunner } from '../sub-agents/sub-agent-foreground-runner';

// Mock buildFromJson so reconstruction doesn't try to actually build an agent.
const builtAgent = mock<agents.Agent>();
builtAgent.hasCheckpointStorage.mockReturnValue(true); // skip checkpoint injection branch

const buildFromJsonMock = vi.fn().mockImplementation(async () => builtAgent);
vi.mock('../json-config/from-json-config', async () => {
	const actual = await vi.importActual<typeof FromJsonConfig>('../json-config/from-json-config');
	return {
		...actual,
		buildFromJson: (...args: unknown[]) => buildFromJsonMock(...args),
	};
});

const buildMcpClientForServerMock = vi
	.fn()
	.mockImplementation(async () => mock<agents.McpClient>());
vi.mock('../json-config/mcp-client-factory', () => ({
	buildMcpClientForServer: (...args: unknown[]) => buildMcpClientForServerMock(...args),
}));

beforeEach(() => {
	Container.set(SubAgentForegroundRunner, mock<SubAgentForegroundRunner>());
});

function getInjectedToolNames(): string[] {
	const names: string[] = [];
	for (const call of builtAgent.tool.mock.calls) {
		for (const item of Array.isArray(call[0]) ? call[0] : [call[0]]) {
			const tool = item as { name?: string };
			if (tool.name) names.push(tool.name);
		}
	}
	return names;
}

function makeReconstructionService(
	overrides: {
		logger?: Logger;
		agentRepository?: AgentRepository;
		agentSandboxRuntimeService?: AgentSandboxRuntimeService;
		n8nCheckpointStorage?: N8NCheckpointStorage;
		agentFileRepository?: AgentFileRepository;
		agentWorkspaceService?: AgentWorkspaceService;
		agentKnowledgeMirrorService?: AgentKnowledgeMirrorService;
	} = {},
): AgentRuntimeReconstructionService {
	const secureRuntime = mock<AgentSecureRuntime>();
	secureRuntime.createToolExecutor.mockReturnValue(mock<ToolExecutor>());
	const transport = mock<HttpTransport>();
	transport.asCustomFetch.mockReturnValue(vi.fn() as unknown as CustomFetch);
	const outboundHttp = mock<OutboundHttp>();
	outboundHttp.transport.mockReturnValue(transport);
	const defaultAgentWorkspaceService = mock<AgentWorkspaceService>();
	defaultAgentWorkspaceService.getAgentWorkspace.mockResolvedValue(new Workspace({}));
	const agentWorkspaceService = overrides.agentWorkspaceService ?? defaultAgentWorkspaceService;
	return new AgentRuntimeReconstructionService(
		overrides.logger ?? mock<Logger>(),
		overrides.agentRepository ?? mock<AgentRepository>(),
		overrides.agentFileRepository ?? mock<AgentFileRepository>(),
		mock<ActiveExecutions>(),
		mock<WorkflowRepository>(),
		mock<UrlService>(),
		overrides.n8nCheckpointStorage ?? mock<N8NCheckpointStorage>(),
		secureRuntime,
		mock<EphemeralNodeExecutor>(),
		mock<N8nMemory>(),
		mock<OauthService>(),
		overrides.agentSandboxRuntimeService ?? mock<AgentSandboxRuntimeService>(),
		mock<AiService>(),
		outboundHttp,
		agentWorkspaceService,
		overrides.agentKnowledgeMirrorService ?? mock<AgentKnowledgeMirrorService>(),
		mock<CredentialsFinderService>(),
		mock<WorkflowFinderService>(),
		mock<AgentChatAttachmentService>(),
	);
}

function makeAgentEntity(
	schemaConfig?: AgentJsonConfig['config'],
	overrides?: Partial<AgentJsonConfig>,
): Agent {
	const schema: AgentJsonConfig = {
		name: 'Test',
		model: 'anthropic/claude-sonnet-4-5',
		instructions: 'Be helpful',
		...(schemaConfig !== undefined ? { config: schemaConfig } : {}),
		...(overrides ?? {}),
	};
	return {
		id: 'agent-1',
		projectId: 'project-1',
		schema,
		tools: {},
	} as unknown as Agent;
}

describe('AgentRuntimeReconstructionService.reconstructFromAgentEntity — MCP wiring', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		builtAgent.hasCheckpointStorage.mockReturnValue(true);
		buildFromJsonMock.mockImplementation(async (_config, _descriptors, options) => {
			const cfg = _config as AgentJsonConfig;
			if (options?.buildMcpClient && cfg.mcpServers) {
				for (const server of cfg.mcpServers) {
					await options.buildMcpClient(server);
				}
			}
			return builtAgent;
		});
	});

	function setup() {
		const credentialProvider = mock<CredentialProvider>();
		const service = makeReconstructionService();
		return { service, credentialProvider };
	}

	it('does not call the MCP factory when no mcpServers are configured', async () => {
		const { service, credentialProvider } = setup();
		const entity = makeAgentEntity();

		await service.reconstructFromAgentEntity(entity, credentialProvider, 'production');

		expect(buildMcpClientForServerMock).not.toHaveBeenCalled();
	});

	it('builds one MCP client per configured server', async () => {
		const { service, credentialProvider } = setup();
		const entity = makeAgentEntity(undefined, {
			mcpServers: [
				{
					name: 'github',
					url: 'https://api.example.test/mcp',
					transport: 'streamableHttp',
					authentication: 'none',
				},
				{
					name: 'fs',
					url: 'https://fs.example.test/mcp',
					transport: 'sse',
					authentication: 'none',
				},
			],
		});

		await service.reconstructFromAgentEntity(entity, credentialProvider, 'production');

		expect(buildMcpClientForServerMock).toHaveBeenCalledTimes(2);
		expect(buildMcpClientForServerMock.mock.calls[0][0]).toMatchObject({ name: 'github' });
		expect(buildMcpClientForServerMock.mock.calls[1][0]).toMatchObject({ name: 'fs' });
	});

	it('forwards resolved MCP tool names through eval instrumentation', async () => {
		const { service, credentialProvider } = setup();
		const onMcpToolCallSettled = vi.fn();
		const entity = makeAgentEntity(undefined, {
			mcpServers: [
				{
					name: 'Linear Prod',
					url: 'https://api.example.test/mcp',
					transport: 'streamableHttp',
					authentication: 'none',
				},
			],
		});

		await service.reconstructFromAgentEntity(
			entity,
			credentialProvider,
			'production',
			undefined,
			undefined,
			{
				mcpFetch: vi.fn(),
				onMcpToolCallSettled,
			} as never,
		);

		const deps = buildMcpClientForServerMock.mock.calls[0][1] as {
			onToolCallSettled?: (event: {
				toolName: string;
				modelToolName?: string;
				success: boolean;
			}) => Promise<void>;
		};
		await deps.onToolCallSettled?.({
			toolName: 'read file',
			modelToolName: 'Linear_Prod_read_file_12345678',
			success: true,
		});

		expect(onMcpToolCallSettled).toHaveBeenCalledWith({
			serverName: 'Linear Prod',
			toolName: 'read file',
			modelToolName: 'Linear_Prod_read_file_12345678',
			success: true,
		});
	});
});

describe('AgentRuntimeReconstructionService — workspace attachment', () => {
	const principalHash = hashAgentSandboxPrincipal({ type: 'n8n-user', userId: 'user-1' });
	const reconstructWithWorkspace = async (service: AgentRuntimeReconstructionService) =>
		await service.reconstructFromAgentEntity(
			makeAgentEntity(),
			mock<CredentialProvider>(),
			'production',
			undefined,
			undefined,
			undefined,
			'manual',
			principalHash,
		);

	beforeEach(() => {
		vi.clearAllMocks();
		builtAgent.hasCheckpointStorage.mockReturnValue(true);
	});

	it('attaches a workspace when the effective sandbox setting is enabled', async () => {
		const agentFileRepository = mock<AgentFileRepository>();
		const agentSandboxRuntimeService = mock<AgentSandboxRuntimeService>({
			isEnabled: () => true,
		});
		const agentWorkspaceService = mock<AgentWorkspaceService>();
		const workspace = new Workspace({});
		agentFileRepository.hasFilesForAgent.mockResolvedValue(false);
		agentWorkspaceService.getAgentWorkspace.mockResolvedValue(workspace);
		const service = makeReconstructionService({
			agentSandboxRuntimeService,
			agentFileRepository,
			agentWorkspaceService,
		});

		await reconstructWithWorkspace(service);

		expect(builtAgent.workspace).toHaveBeenCalledWith(workspace);
		expect(agentWorkspaceService.getAgentWorkspace).toHaveBeenCalledWith(
			'project-1',
			'agent-1',
			principalHash,
		);
		expect(getInjectedToolNames()).not.toContain('find_file');
	});

	it('keeps knowledge tools gated by uploaded files', async () => {
		const agentFileRepository = mock<AgentFileRepository>();
		const agentSandboxRuntimeService = mock<AgentSandboxRuntimeService>({
			isEnabled: () => true,
		});
		const agentWorkspaceService = mock<AgentWorkspaceService>();
		agentFileRepository.hasFilesForAgent.mockResolvedValue(true);
		agentWorkspaceService.getAgentWorkspace.mockResolvedValue(new Workspace({}));
		const service = makeReconstructionService({
			agentSandboxRuntimeService,
			agentFileRepository,
			agentWorkspaceService,
		});

		await reconstructWithWorkspace(service);

		expect(getInjectedToolNames()).toEqual(
			expect.arrayContaining(['find_file', 'search_text', 'read_file']),
		);
	});

	it('does not attach a workspace to inline runtimes', async () => {
		const agentSandboxRuntimeService = mock<AgentSandboxRuntimeService>({
			isEnabled: () => true,
		});
		const agentWorkspaceService = mock<AgentWorkspaceService>();
		const service = makeReconstructionService({
			agentSandboxRuntimeService,
			agentWorkspaceService,
		});

		await service.reconstructFromResolvedSource({
			config: {
				name: 'Inline',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Help',
			},
			memoryOwnerAgentId: 'agent-1',
			projectId: 'project-1',
			credentialProvider: mock<CredentialProvider>(),
			toolDescriptors: {},
			toolCodeByName: {},
			skills: {},
			runtimeProfile: 'inline',
			runType: 'production',
			parentAgentIdForDelegation: 'parent-agent-1',
		});

		expect(agentWorkspaceService.getAgentWorkspace).not.toHaveBeenCalled();
		expect(builtAgent.workspace).not.toHaveBeenCalled();
	});

	it('continues reconstruction when the workspace is unavailable', async () => {
		const agentSandboxRuntimeService = mock<AgentSandboxRuntimeService>({
			isEnabled: () => true,
		});
		const agentWorkspaceService = mock<AgentWorkspaceService>();
		agentWorkspaceService.getAgentWorkspace.mockRejectedValue(new Error('sandbox unavailable'));
		const service = makeReconstructionService({
			agentSandboxRuntimeService,
			agentWorkspaceService,
		});

		await expect(reconstructWithWorkspace(service)).resolves.toEqual(
			expect.objectContaining({ agent: builtAgent }),
		);
		expect(builtAgent.workspace).not.toHaveBeenCalled();
	});

	it('rejects a first-class runtime without a workspace principal', async () => {
		const service = makeReconstructionService({
			agentSandboxRuntimeService: mock<AgentSandboxRuntimeService>({
				isEnabled: () => true,
			}),
		});

		await expect(
			service.reconstructFromAgentEntity(
				makeAgentEntity(),
				mock<CredentialProvider>(),
				'production',
			),
		).rejects.toThrow('workspace scope is missing');
	});
});

describe('AgentRuntimeReconstructionService.reconstructFromAgentEntity — sub-agent delegation gating', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		builtAgent.hasCheckpointStorage.mockReturnValue(true);
		builtAgent.tool.mockClear();
	});

	function setup() {
		const credentialProvider = mock<CredentialProvider>();
		const service = makeReconstructionService();
		return { service, credentialProvider };
	}

	it.each([
		{
			name: 'no subAgents block',
			subAgents: undefined,
		},
		{
			name: 'empty saved-agent reference list',
			subAgents: { agents: [] },
		},
		{
			name: 'saved-agent references',
			subAgents: {
				agents: [{ agentId: 'agent-2', useWhen: 'Use for research tasks.' }],
			},
		},
	])('always injects delegation tools for $name', async ({ subAgents }) => {
		const { service, credentialProvider } = setup();
		const entity = makeAgentEntity(undefined, subAgents !== undefined ? { subAgents } : {});

		await service.reconstructFromAgentEntity(entity, credentialProvider, 'production');

		const toolNames = getInjectedToolNames();
		expect(toolNames).toContain(DELEGATE_SUB_AGENT_TOOL_NAME);
		expect(toolNames).toContain(WRITE_TODOS_TOOL_NAME);
	});

	function getInjectedDelegatePolicy() {
		for (const call of builtAgent.tool.mock.calls) {
			for (const item of Array.isArray(call[0]) ? call[0] : [call[0]]) {
				const tool = item as BuiltTool;
				if (tool.name === DELEGATE_SUB_AGENT_TOOL_NAME) {
					return getInlineDelegateSubAgentToolOptions(tool)?.policy;
				}
			}
		}
		return undefined;
	}

	function getInjectedDelegateTool() {
		for (const call of builtAgent.tool.mock.calls) {
			for (const item of Array.isArray(call[0]) ? call[0] : [call[0]]) {
				const tool = item as BuiltTool;
				if (tool.name === DELEGATE_SUB_AGENT_TOOL_NAME) return tool;
			}
		}
		return undefined;
	}

	function getInjectedAvailableSubAgents() {
		for (const call of builtAgent.tool.mock.calls) {
			for (const item of Array.isArray(call[0]) ? call[0] : [call[0]]) {
				const tool = item as BuiltTool;
				if (tool.name === DELEGATE_SUB_AGENT_TOOL_NAME) {
					return getInlineDelegateSubAgentToolOptions(tool)?.availableSubAgents;
				}
			}
		}
		return undefined;
	}

	function getInjectedInlineSubAgentModelsByDifficulty() {
		for (const call of builtAgent.tool.mock.calls) {
			for (const item of Array.isArray(call[0]) ? call[0] : [call[0]]) {
				const tool = item as BuiltTool;
				if (tool.name === DELEGATE_SUB_AGENT_TOOL_NAME) {
					return getInlineDelegateSubAgentToolOptions(tool)?.inlineSubAgentModelsByDifficulty;
				}
			}
		}
		return undefined;
	}

	function getInjectedResolveInlineSubAgentProviderTools() {
		for (const call of builtAgent.tool.mock.calls) {
			for (const item of Array.isArray(call[0]) ? call[0] : [call[0]]) {
				const tool = item as BuiltTool;
				if (tool.name === DELEGATE_SUB_AGENT_TOOL_NAME) {
					return getInlineDelegateSubAgentToolOptions(tool)?.resolveInlineSubAgentProviderTools;
				}
			}
		}
		return undefined;
	}

	it('keeps the config and SDK default maxChildren values aligned', () => {
		expect(SUB_AGENT_MAX_CHILDREN_DEFAULT).toBe(DEFAULT_SUB_AGENT_MAX_CHILDREN);
	});

	it('uses the shared default maxChildren when config does not override it', async () => {
		const credentialProvider = mock<CredentialProvider>();
		const service = makeReconstructionService();

		await service.reconstructFromAgentEntity(makeAgentEntity(), credentialProvider, 'production');

		expect(getInjectedDelegatePolicy()).toMatchObject({
			maxChildren: SUB_AGENT_MAX_CHILDREN_DEFAULT,
		});
	});

	it('uses subAgents.maxChildren over the SDK default', async () => {
		const credentialProvider = mock<CredentialProvider>();
		const service = makeReconstructionService();
		const entity = makeAgentEntity(undefined, { subAgents: { maxChildren: 2 } });

		await service.reconstructFromAgentEntity(entity, credentialProvider, 'production');

		expect(getInjectedDelegatePolicy()).toMatchObject({
			maxChildren: 2,
		});
	});

	it.each(['integrated', 'manual'] as const)(
		'passes the %s workflow execution mode to configured sub-agents',
		async (workflowToolExecutionMode) => {
			const credentialProvider = mock<CredentialProvider>();
			const foregroundRunner = mock<SubAgentForegroundRunner>();
			foregroundRunner.runForeground.mockResolvedValue({
				taskPath: '/root/research_api_0',
				threadId: 'child-thread-1',
				status: 'completed',
				result: {
					runId: 'child-run-1',
					messages: [],
					getState: () => mock<agents.SerializableAgentState>(),
				},
			});
			Container.set(SubAgentForegroundRunner, foregroundRunner);
			const agentRepository = mock<AgentRepository>();
			agentRepository.findByIdAndProjectId.mockResolvedValue({
				id: 'agent-2',
				name: 'Research Agent',
				activeVersionId: 'version-2',
			} as Agent);
			const service = makeReconstructionService({ agentRepository });
			const entity = makeAgentEntity(undefined, {
				subAgents: { agents: [{ agentId: 'agent-2' }] },
			});

			await service.reconstructFromAgentEntity(
				entity,
				credentialProvider,
				'production',
				undefined,
				undefined,
				undefined,
				workflowToolExecutionMode,
			);

			const delegateTool = getInjectedDelegateTool();
			if (!delegateTool?.handler) throw new Error('Expected delegate tool handler');

			await expect(
				delegateTool.handler(
					{
						subAgentId: 'agent-2',
						taskName: 'Research API',
						goal: 'Find the API behavior.',
					},
					{ runId: 'parent-run-1' },
				),
			).resolves.toMatchObject({ status: 'completed' });
			expect(foregroundRunner.runForeground).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({ workflowToolExecutionMode }),
			);
		},
	);

	it('passes saved sub-agent useWhen guidance into delegate tool metadata', async () => {
		const credentialProvider = mock<CredentialProvider>();
		const agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: 'agent-billing',
			name: 'Billing Agent',
			activeVersionId: 'version-billing',
		} as Agent);
		const service = makeReconstructionService({ agentRepository });
		const entity = makeAgentEntity(undefined, {
			subAgents: {
				agents: [
					{
						agentId: 'agent-billing',
						useWhen: 'Use for invoice investigations and payment status checks.',
					},
				],
			},
		});

		await service.reconstructFromAgentEntity(entity, credentialProvider, 'production');

		expect(getInjectedAvailableSubAgents()).toEqual([
			{
				id: 'agent-billing',
				name: 'Billing Agent',
				useWhen: 'Use for invoice investigations and payment status checks.',
			},
		]);
	});

	it('references a saved sub-agent by id only, with no versionId pin', async () => {
		const agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: 'agent-billing',
			name: 'Billing Agent',
			activeVersionId: 'version-billing',
		} as Agent);
		const service = makeReconstructionService({ agentRepository });
		const config: AgentJsonConfig = {
			name: 'Test',
			model: 'anthropic/claude-sonnet-4-5',
			instructions: 'Be helpful',
			subAgents: { agents: [{ agentId: 'agent-billing' }] },
		};

		const { sourcesById } = await service.createSubAgentDelegationConfig(config, 'project-1');

		expect(sourcesById).toEqual({ 'agent-billing': { agentId: 'agent-billing' } });
	});

	it('includes an unpublished sub-agent in sourcesById and availableSubAgents', async () => {
		const agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: 'agent-billing',
			name: 'Billing Agent',
			activeVersionId: null,
		} as Agent);
		const service = makeReconstructionService({ agentRepository });
		const config: AgentJsonConfig = {
			name: 'Test',
			model: 'anthropic/claude-sonnet-4-5',
			instructions: 'Be helpful',
			subAgents: { agents: [{ agentId: 'agent-billing' }] },
		};

		const { sourcesById, availableSubAgents } = await service.createSubAgentDelegationConfig(
			config,
			'project-1',
		);

		expect(sourcesById).toEqual({ 'agent-billing': { agentId: 'agent-billing' } });
		expect(availableSubAgents).toEqual([{ id: 'agent-billing', name: 'Billing Agent' }]);
	});

	it('resolves subAgents.modelsByDifficulty into delegate tool metadata', async () => {
		const credentialProvider = mock<CredentialProvider>();
		credentialProvider.resolve.mockImplementation(async (credentialId: string) => {
			if (credentialId === 'low-cred') {
				return { apiKey: 'low-key', url: 'https://low.example/v1' };
			}
			if (credentialId === 'high-cred') {
				return { apiKey: 'high-key' };
			}
			throw new Error(`unexpected credential ${credentialId}`);
		});
		const service = makeReconstructionService();
		const entity = makeAgentEntity(undefined, {
			subAgents: {
				modelsByDifficulty: {
					low: { model: 'openai/gpt-4o-mini', credential: 'low-cred' },
					high: { model: 'anthropic/claude-sonnet-4-5', credential: 'high-cred' },
				},
			},
		});

		await service.reconstructFromAgentEntity(entity, credentialProvider, 'production');

		expect(getInjectedInlineSubAgentModelsByDifficulty()).toEqual({
			low: {
				id: 'openai/gpt-4o-mini',
				apiKey: 'low-key',
				baseURL: 'https://low.example/v1',
			},
			high: {
				id: 'anthropic/claude-sonnet-4-5',
				apiKey: 'high-key',
			},
		});
	});

	it('resolves inline child provider tools for the child model provider', async () => {
		const credentialProvider = mock<CredentialProvider>();
		credentialProvider.resolve.mockImplementation(async (credentialId: string) => {
			if (credentialId === 'high-cred') {
				return { apiKey: 'high-key' };
			}
			throw new Error(`unexpected credential ${credentialId}`);
		});
		const service = makeReconstructionService();
		const entity = makeAgentEntity(
			{ webSearch: { enabled: true } },
			{
				model: 'openai/gpt-4o',
				subAgents: {
					modelsByDifficulty: {
						high: { model: 'anthropic/claude-sonnet-4-5', credential: 'high-cred' },
					},
				},
			},
		);

		await service.reconstructFromAgentEntity(entity, credentialProvider, 'production');

		const resolveInlineSubAgentProviderTools = getInjectedResolveInlineSubAgentProviderTools();
		expect(resolveInlineSubAgentProviderTools).toBeDefined();

		const highModel = getInjectedInlineSubAgentModelsByDifficulty()?.high;
		expect(highModel).toBeDefined();

		const providerTools = await resolveInlineSubAgentProviderTools?.(highModel!);
		expect(providerTools?.map((tool) => tool.name)).toEqual(['anthropic.web_search_20250305']);
		expect(providerTools?.map((tool) => tool.name)).not.toContain('openai.web_search');
	});

	it('omits inlineSubAgentModelsByDifficulty when no difficulty mappings are configured', async () => {
		const credentialProvider = mock<CredentialProvider>();
		const service = makeReconstructionService();

		await service.reconstructFromAgentEntity(makeAgentEntity(), credentialProvider, 'production');

		expect(getInjectedInlineSubAgentModelsByDifficulty()).toBeUndefined();
	});
});

describe('AgentRuntimeReconstructionService.reconstructFromAgentEntity — n8n chat tool gating', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		builtAgent.hasCheckpointStorage.mockReturnValue(true);

		// Provide real ChatIntegrationRegistry with N8nChatIntegration registered.
		const registry = new ChatIntegrationRegistry();
		registry.register(new N8nChatIntegration(mock<UserRepository>()));
		Container.set(ChatIntegrationRegistry, registry);

		// Provide mocked integration services required when the integration block runs.
		Container.set(IntegrationMessageContextService, mock<IntegrationMessageContextService>());
		Container.set(ChatIntegrationActionExecutor, mock<ChatIntegrationActionExecutor>());
		Container.set(ChatIntegrationContextQueryExecutor, mock<ChatIntegrationContextQueryExecutor>());
	});

	function setup() {
		const credentialProvider = mock<CredentialProvider>();
		const service = makeReconstructionService();
		return { service, credentialProvider };
	}

	it('injects n8n_chat tools when integrationType is n8n_chat', async () => {
		const { service, credentialProvider } = setup();
		// Agent entity with NO credential integrations connected.
		const entity = makeAgentEntity();

		await service.reconstructFromAgentEntity(
			entity,
			credentialProvider,
			'production',
			N8N_CHAT_INTEGRATION_TYPE,
		);

		const toolNames = getInjectedToolNames();
		expect(toolNames).toContain(N8N_CHAT_ACTION_TOOL_NAME);
		expect(toolNames).toContain(N8N_CHAT_CONTEXT_TOOL_NAME);
	});

	it('does not inject n8n_chat tools when integrationType is absent', async () => {
		const { service, credentialProvider } = setup();
		// Same entity, reconstruct WITHOUT integrationType.
		const entity = makeAgentEntity();

		await service.reconstructFromAgentEntity(entity, credentialProvider, 'production');

		const toolNames = getInjectedToolNames();
		expect(toolNames).not.toContain(N8N_CHAT_ACTION_TOOL_NAME);
		expect(toolNames).not.toContain(N8N_CHAT_CONTEXT_TOOL_NAME);
	});

	it('does not inject n8n_chat tools for credential-backed integration runs', async () => {
		const { service, credentialProvider } = setup();
		const entity = makeAgentEntity();

		await service.reconstructFromAgentEntity(entity, credentialProvider, 'production', 'slack');

		const toolNames = getInjectedToolNames();
		expect(toolNames).not.toContain(N8N_CHAT_ACTION_TOOL_NAME);
		expect(toolNames).not.toContain(N8N_CHAT_CONTEXT_TOOL_NAME);
	});
});

describe('AgentRuntimeReconstructionService.reconstructFromAgentEntity — checkpoint wiring', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		builtAgent.hasCheckpointStorage.mockReturnValue(false);
	});

	it('uses agent-scoped checkpoint storage for reconstructed runtime agents', async () => {
		const scopedStorage = {
			save: vi.fn(),
			load: vi.fn(),
			delete: vi.fn(),
		};
		const n8nCheckpointStorage = mock<N8NCheckpointStorage>();
		n8nCheckpointStorage.getStorage.mockReturnValue(scopedStorage);
		const credentialProvider = mock<CredentialProvider>();
		const service = makeReconstructionService({ n8nCheckpointStorage });

		await service.reconstructFromAgentEntity(makeAgentEntity(), credentialProvider, 'production');

		expect(n8nCheckpointStorage.getStorage).toHaveBeenCalledWith('agent-1');
		expect(builtAgent.checkpoint).toHaveBeenCalledWith(scopedStorage);
	});
});

describe('AgentRuntimeReconstructionService.reconstructFromResolvedSource — sub-agent runtime profile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		builtAgent.hasCheckpointStorage.mockReturnValue(true);
		builtAgent.tool.mockClear();
	});

	it('does not inject top-level integration context/action tools', async () => {
		const credentialProvider = mock<CredentialProvider>();
		const service = makeReconstructionService();

		const config: AgentJsonConfig = {
			name: 'Child',
			model: 'anthropic/claude-sonnet-4-5',
			instructions: 'Help',
		};

		await service.reconstructFromResolvedSource({
			config,
			memoryOwnerAgentId: 'child-agent-1',
			projectId: 'project-1',
			credentialProvider,
			toolDescriptors: {},
			toolCodeByName: {},
			skills: {},
			runtimeProfile: 'sub-agent',
			runType: 'production',
			parentAgentIdForDelegation: 'parent-agent-1',
		});

		const toolNames = getInjectedToolNames();
		expect(toolNames.filter((name) => name.endsWith('_context'))).toHaveLength(0);
		expect(toolNames.filter((name) => name.endsWith('_action'))).toHaveLength(0);
		expect(toolNames).not.toContain(DELEGATE_SUB_AGENT_TOOL_NAME);
		expect(toolNames).not.toContain(WRITE_TODOS_TOOL_NAME);
	});
});
