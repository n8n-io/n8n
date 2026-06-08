import type * as agents from '@n8n/agents';
import {
	DELEGATE_SUB_AGENT_TOOL_NAME,
	getInlineDelegateSubAgentToolOptions,
	WRITE_TODOS_TOOL_NAME,
} from '@n8n/agents';
import type { CredentialProvider, BuiltTool } from '@n8n/agents';
import type { AgentsConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import type { Logger } from '@n8n/backend-common';
import type { UserRepository, WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import type { EphemeralNodeExecutor } from '@/node-execution';
import type { OauthService } from '@/oauth/oauth.service';
import type { UrlService } from '@/services/url.service';
import type { WorkflowRunner } from '@/workflow-runner';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { AgentRuntimeReconstructionService } from '../agent-runtime-reconstruction.service';
import type { AgentsToolsService } from '../agents-tools.service';
import type { Agent } from '../entities/agent.entity';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { N8nMemory } from '../integrations/n8n-memory';
import type { AgentJsonConfig } from '@n8n/api-types';
import type { AgentRepository } from '../repositories/agent.repository';
import type { ToolExecutor } from '../json-config/from-json-config';
import type { AgentSecureRuntime } from '../runtime/agent-secure-runtime';
import type { AgentKnowledgeCommandService } from '../agent-knowledge-command.service';
import type { AgentKnowledgeService } from '../agent-knowledge.service';
import { SubAgentForegroundRunner } from '../sub-agents/sub-agent-foreground-runner';

// Mock buildFromJson so reconstruction doesn't try to actually build an agent.
const builtAgent = mock<agents.Agent>();
builtAgent.hasCheckpointStorage.mockReturnValue(true); // skip checkpoint injection branch

const buildFromJsonMock = jest.fn().mockImplementation(async () => builtAgent);
jest.mock('../json-config/from-json-config', () => ({
	buildFromJson: (...args: unknown[]) => buildFromJsonMock(...args),
}));

const buildMcpClientForServerMock = jest
	.fn()
	.mockImplementation(async () => mock<agents.McpClient>());
jest.mock('../json-config/mcp-client-factory', () => ({
	buildMcpClientForServer: (...args: unknown[]) => buildMcpClientForServerMock(...args),
}));

beforeEach(() => {
	Container.set(SubAgentForegroundRunner, mock<SubAgentForegroundRunner>());
});

function makeReconstructionService(
	agentsToolsService: AgentsToolsService,
	modules: string[] = [],
	overrides: {
		logger?: Logger;
		agentsConfig?: Partial<AgentsConfig>;
	} = {},
): AgentRuntimeReconstructionService {
	const secureRuntime = mock<AgentSecureRuntime>();
	secureRuntime.createToolExecutor.mockReturnValue(mock<ToolExecutor>());
	return new AgentRuntimeReconstructionService(
		overrides.logger ?? mock<Logger>(),
		mock<AgentRepository>(),
		mock<WorkflowRunner>(),
		mock<ActiveExecutions>(),
		mock<WorkflowRepository>(),
		mock<UserRepository>(),
		mock<WorkflowFinderService>(),
		mock<UrlService>(),
		mock<N8NCheckpointStorage>(),
		secureRuntime,
		mock<EphemeralNodeExecutor>(),
		agentsToolsService,
		mock<N8nMemory>(),
		mock<OauthService>(),
		{
			modules,
			...(overrides.agentsConfig ?? {}),
		} as unknown as AgentsConfig,
		mock<AgentKnowledgeService>(),
		mock<AgentKnowledgeCommandService>(),
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

describe('AgentRuntimeReconstructionService.reconstructFromAgentEntity — node tools gating', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		builtAgent.hasCheckpointStorage.mockReturnValue(true);
	});

	function setup(options: { nodeToolsModuleEnabled?: boolean } = {}) {
		const agentsToolsService = mock<AgentsToolsService>();
		agentsToolsService.getRuntimeTools.mockReturnValue([] as BuiltTool[]);
		const credentialProvider = mock<CredentialProvider>();
		const service = makeReconstructionService(
			agentsToolsService,
			options.nodeToolsModuleEnabled ? ['node-tools-searcher'] : [],
		);
		return { service, agentsToolsService, credentialProvider };
	}

	it.each([
		{
			name: 'config.nodeTools is absent and the module is disabled',
			nodeToolsModuleEnabled: false,
			schemaConfig: undefined,
			attaches: false,
		},
		{
			name: 'config.nodeTools is absent and the module is enabled',
			nodeToolsModuleEnabled: true,
			schemaConfig: undefined,
			attaches: false,
		},
		{
			name: 'config.nodeTools.enabled is true but the module is disabled',
			nodeToolsModuleEnabled: false,
			schemaConfig: { nodeTools: { enabled: true } },
			attaches: false,
		},
		{
			name: 'config.nodeTools.enabled is true and the module is enabled',
			nodeToolsModuleEnabled: true,
			schemaConfig: { nodeTools: { enabled: true } },
			attaches: true,
		},
		{
			name: 'config.nodeTools.enabled is false and the module is disabled',
			nodeToolsModuleEnabled: false,
			schemaConfig: { nodeTools: { enabled: false } },
			attaches: false,
		},
		{
			name: 'config.nodeTools.enabled is false and the module is enabled',
			nodeToolsModuleEnabled: true,
			schemaConfig: { nodeTools: { enabled: false } },
			attaches: false,
		},
	])('$name', async ({ nodeToolsModuleEnabled, schemaConfig, attaches }) => {
		const { service, agentsToolsService, credentialProvider } = setup({
			nodeToolsModuleEnabled,
		});
		const entity = makeAgentEntity(schemaConfig);

		await service.reconstructFromAgentEntity(entity, credentialProvider, 'user-1');

		if (attaches) {
			expect(agentsToolsService.getRuntimeTools).toHaveBeenCalledWith(
				credentialProvider,
				'project-1',
			);
		} else {
			expect(agentsToolsService.getRuntimeTools).not.toHaveBeenCalled();
		}
	});
});

describe('AgentRuntimeReconstructionService.reconstructFromAgentEntity — MCP wiring', () => {
	beforeEach(() => {
		jest.clearAllMocks();
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
		const agentsToolsService = mock<AgentsToolsService>();
		agentsToolsService.getRuntimeTools.mockReturnValue([] as BuiltTool[]);
		const credentialProvider = mock<CredentialProvider>();
		const service = makeReconstructionService(agentsToolsService);
		return { service, credentialProvider };
	}

	it('does not call the MCP factory when no mcpServers are configured', async () => {
		const { service, credentialProvider } = setup();
		const entity = makeAgentEntity();

		await service.reconstructFromAgentEntity(entity, credentialProvider, 'user-1');

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

		await service.reconstructFromAgentEntity(entity, credentialProvider, 'user-1');

		expect(buildMcpClientForServerMock).toHaveBeenCalledTimes(2);
		expect(buildMcpClientForServerMock.mock.calls[0][0]).toMatchObject({ name: 'github' });
		expect(buildMcpClientForServerMock.mock.calls[1][0]).toMatchObject({ name: 'fs' });
	});
});

describe('AgentRuntimeReconstructionService.reconstructFromAgentEntity — sub-agent delegation gating', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		builtAgent.hasCheckpointStorage.mockReturnValue(true);
		builtAgent.tool.mockClear();
	});

	function setup() {
		const agentsToolsService = mock<AgentsToolsService>();
		agentsToolsService.getRuntimeTools.mockReturnValue([] as BuiltTool[]);
		const credentialProvider = mock<CredentialProvider>();
		const service = makeReconstructionService(agentsToolsService);
		return { service, credentialProvider };
	}

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
			subAgents: { agents: [{ agentId: 'agent-2' }] },
		},
	])('always injects delegation tools for $name', async ({ subAgents }) => {
		const { service, credentialProvider } = setup();
		const entity = makeAgentEntity(undefined, subAgents !== undefined ? { subAgents } : {});

		await service.reconstructFromAgentEntity(entity, credentialProvider, 'user-1');

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

	it('uses the SDK default maxChildren when config does not override it', async () => {
		const agentsToolsService = mock<AgentsToolsService>();
		agentsToolsService.getRuntimeTools.mockReturnValue([] as BuiltTool[]);
		const credentialProvider = mock<CredentialProvider>();
		const service = makeReconstructionService(agentsToolsService, []);

		await service.reconstructFromAgentEntity(makeAgentEntity(), credentialProvider, 'user-1');

		expect(getInjectedDelegatePolicy()).toMatchObject({
			maxChildren: 10,
		});
	});

	it('uses subAgents.maxChildren over the SDK default', async () => {
		const agentsToolsService = mock<AgentsToolsService>();
		agentsToolsService.getRuntimeTools.mockReturnValue([] as BuiltTool[]);
		const credentialProvider = mock<CredentialProvider>();
		const service = makeReconstructionService(agentsToolsService, []);
		const entity = makeAgentEntity(undefined, { subAgents: { maxChildren: 2 } });

		await service.reconstructFromAgentEntity(entity, credentialProvider, 'user-1');

		expect(getInjectedDelegatePolicy()).toMatchObject({
			maxChildren: 2,
		});
	});
});

describe('AgentRuntimeReconstructionService.reconstructFromResolvedSource — sub-agent runtime profile', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		builtAgent.hasCheckpointStorage.mockReturnValue(true);
		builtAgent.tool.mockClear();
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

	it('does not inject top-level integration context/action tools', async () => {
		const agentsToolsService = mock<AgentsToolsService>();
		agentsToolsService.getRuntimeTools.mockReturnValue([] as BuiltTool[]);
		const credentialProvider = mock<CredentialProvider>();
		const service = makeReconstructionService(agentsToolsService);

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
			userId: 'user-1',
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
