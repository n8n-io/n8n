import {
	DELEGATE_SUB_AGENT_TOOL_NAME,
	DEFAULT_SUB_AGENT_MAX_CHILDREN,
	getInlineDelegateSubAgentToolOptions,
	WRITE_TODOS_TOOL_NAME,
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
import type {
	CustomFetch,
	HttpTransport,
	OutboundHttp,
	SsrfProtectionService,
} from '@n8n/backend-network';
import type { AgentsConfig, SsrfProtectionConfig } from '@n8n/config';
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

import { AgentRuntimeReconstructionService } from '../agent-runtime-reconstruction.service';
import type { AgentKnowledgeSandboxService } from '../agent-knowledge-sandbox.service';
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
	modules: string[] = [],
	overrides: {
		logger?: Logger;
		agentRepository?: AgentRepository;
		agentsConfig?: Partial<AgentsConfig>;
		n8nCheckpointStorage?: N8NCheckpointStorage;
	} = {},
): AgentRuntimeReconstructionService {
	const secureRuntime = mock<AgentSecureRuntime>();
	secureRuntime.createToolExecutor.mockReturnValue(mock<ToolExecutor>());
	const transport = mock<HttpTransport>();
	transport.asCustomFetch.mockReturnValue(vi.fn() as unknown as CustomFetch);
	const outboundHttp = mock<OutboundHttp>();
	outboundHttp.transport.mockReturnValue(transport);
	return new AgentRuntimeReconstructionService(
		overrides.logger ?? mock<Logger>(),
		overrides.agentRepository ?? mock<AgentRepository>(),
		mock<AgentFileRepository>(),
		mock<ActiveExecutions>(),
		mock<WorkflowRepository>(),
		mock<UrlService>(),
		overrides.n8nCheckpointStorage ?? mock<N8NCheckpointStorage>(),
		secureRuntime,
		mock<EphemeralNodeExecutor>(),
		mock<N8nMemory>(),
		mock<OauthService>(),
		{
			modules,
			...(overrides.agentsConfig ?? {}),
		} as unknown as AgentsConfig,
		mock<AiService>(),
		outboundHttp,
		mock<AgentKnowledgeSandboxService>(),
		mock<SsrfProtectionConfig>({ enabled: true }),
		mock<SsrfProtectionService>(),
		mock<CredentialsFinderService>(),
		mock<WorkflowFinderService>(),
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

		await service.reconstructFromAgentEntity(entity, credentialProvider);

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

		await service.reconstructFromAgentEntity(entity, credentialProvider);

		expect(buildMcpClientForServerMock).toHaveBeenCalledTimes(2);
		expect(buildMcpClientForServerMock.mock.calls[0][0]).toMatchObject({ name: 'github' });
		expect(buildMcpClientForServerMock.mock.calls[1][0]).toMatchObject({ name: 'fs' });
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

		await service.reconstructFromAgentEntity(entity, credentialProvider);

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

		await service.reconstructFromAgentEntity(makeAgentEntity(), credentialProvider);

		expect(getInjectedDelegatePolicy()).toMatchObject({
			maxChildren: SUB_AGENT_MAX_CHILDREN_DEFAULT,
		});
	});

	it('uses subAgents.maxChildren over the SDK default', async () => {
		const credentialProvider = mock<CredentialProvider>();
		const service = makeReconstructionService();
		const entity = makeAgentEntity(undefined, { subAgents: { maxChildren: 2 } });

		await service.reconstructFromAgentEntity(entity, credentialProvider);

		expect(getInjectedDelegatePolicy()).toMatchObject({
			maxChildren: 2,
		});
	});

	it('passes saved sub-agent useWhen guidance into delegate tool metadata', async () => {
		const credentialProvider = mock<CredentialProvider>();
		const agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: 'agent-billing',
			name: 'Billing Agent',
			activeVersionId: 'version-billing',
		} as Agent);
		const service = makeReconstructionService([], { agentRepository });
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

		await service.reconstructFromAgentEntity(entity, credentialProvider);

		expect(getInjectedAvailableSubAgents()).toEqual([
			{
				id: 'agent-billing',
				name: 'Billing Agent',
				useWhen: 'Use for invoice investigations and payment status checks.',
			},
		]);
	});

	it('references a published sub-agent by id only, with no versionId pin', async () => {
		const agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: 'agent-billing',
			name: 'Billing Agent',
			activeVersionId: 'version-billing',
		} as Agent);
		const service = makeReconstructionService([], { agentRepository });
		const config: AgentJsonConfig = {
			name: 'Test',
			model: 'anthropic/claude-sonnet-4-5',
			instructions: 'Be helpful',
			subAgents: { agents: [{ agentId: 'agent-billing' }] },
		};

		const { sourcesById } = await service.createSubAgentDelegationConfig(config, 'project-1');

		expect(sourcesById).toEqual({ 'agent-billing': { agentId: 'agent-billing' } });
	});

	it('omits an unpublished sub-agent from sourcesById and availableSubAgents', async () => {
		const agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: 'agent-billing',
			name: 'Billing Agent',
			activeVersionId: null,
		} as Agent);
		const service = makeReconstructionService([], { agentRepository });
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

		expect(sourcesById).toEqual({});
		expect(availableSubAgents).toEqual([]);
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

		await service.reconstructFromAgentEntity(entity, credentialProvider);

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

		await service.reconstructFromAgentEntity(entity, credentialProvider);

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

		await service.reconstructFromAgentEntity(makeAgentEntity(), credentialProvider);

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

		await service.reconstructFromAgentEntity(entity, credentialProvider, N8N_CHAT_INTEGRATION_TYPE);

		const toolNames = getInjectedToolNames();
		expect(toolNames).toContain(N8N_CHAT_ACTION_TOOL_NAME);
		expect(toolNames).toContain(N8N_CHAT_CONTEXT_TOOL_NAME);
	});

	it('does not inject n8n_chat tools when integrationType is absent', async () => {
		const { service, credentialProvider } = setup();
		// Same entity, reconstruct WITHOUT integrationType.
		const entity = makeAgentEntity();

		await service.reconstructFromAgentEntity(entity, credentialProvider);

		const toolNames = getInjectedToolNames();
		expect(toolNames).not.toContain(N8N_CHAT_ACTION_TOOL_NAME);
		expect(toolNames).not.toContain(N8N_CHAT_CONTEXT_TOOL_NAME);
	});

	it('does not inject n8n_chat tools for credential-backed integration runs', async () => {
		const { service, credentialProvider } = setup();
		const entity = makeAgentEntity();

		await service.reconstructFromAgentEntity(entity, credentialProvider, 'slack');

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
		const service = makeReconstructionService([], { n8nCheckpointStorage });

		await service.reconstructFromAgentEntity(makeAgentEntity(), credentialProvider);

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
			parentAgentIdForDelegation: 'parent-agent-1',
		});

		const toolNames = getInjectedToolNames();
		expect(toolNames.filter((name) => name.endsWith('_context'))).toHaveLength(0);
		expect(toolNames.filter((name) => name.endsWith('_action'))).toHaveLength(0);
		expect(toolNames).not.toContain(DELEGATE_SUB_AGENT_TOOL_NAME);
		expect(toolNames).not.toContain(WRITE_TODOS_TOOL_NAME);
	});
});
