import type * as agents from '@n8n/agents';
import type { CredentialProvider, BuiltTool } from '@n8n/agents';
import type { AgentsConfig } from '@n8n/config';

import type { ToolRegistry } from '../tool-registry';
import type { Logger } from '@n8n/backend-common';
import type {
	ExecutionRepository,
	ProjectRelationRepository,
	UserRepository,
	WorkflowRepository,
} from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import type { EphemeralNodeExecutor } from '@/node-execution';
import type { UrlService } from '@/services/url.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowRunner } from '@/workflow-runner';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentSkillsService } from '../agent-skills.service';
import type { AgentsToolsService } from '../agents-tools.service';
import { AgentsService } from '../agents.service';
import type { Agent } from '../entities/agent.entity';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { N8nMemory } from '../integrations/n8n-memory';
import type { AgentJsonConfig } from '@n8n/api-types';
import type { AgentHistoryRepository } from '../repositories/agent-history.repository';
import type { AgentRepository } from '../repositories/agent.repository';
import type { AgentSecureRuntime } from '../runtime/agent-secure-runtime';

// Mock buildFromJson so reconstructFromConfig doesn't try to actually build an agent.
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

// Avoid loading the rich-interaction tool (its import path resolves to runtime code).
jest.mock('../integrations/rich-interaction-tool', () => ({
	createRichInteractionTool: () => ({}) as never,
}));

function makeService(
	agentsToolsService: AgentsToolsService,
	modules: string[] = [],
): AgentsService {
	return new AgentsService(
		mock<Logger>(),
		mock<AgentRepository>(),
		mock<ProjectRelationRepository>(),
		mock<WorkflowRunner>(),
		mock<ActiveExecutions>(),
		mock<ExecutionRepository>(),
		mock<WorkflowRepository>(),
		mock<UserRepository>(),
		mock<WorkflowFinderService>(),
		mock<UrlService>(),
		mock<N8NCheckpointStorage>(),
		mock<AgentSecureRuntime>(),
		mock<EphemeralNodeExecutor>(),
		agentsToolsService,
		mock<N8nMemory>(),
		mock<AgentExecutionService>(),
		mock<AgentHistoryRepository>(),
		mock<AgentSkillsService>(),
		mock(), // AgentTaskRepository
		mock(), // AgentTaskSnapshotRepository
		mock(),
		{ modules } as unknown as AgentsConfig,
		mock(),
		mock<Telemetry>(),
		mock(),
		mock(),
		mock(),
		mock(),
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

// reconstructFromConfig is private; cast to invoke directly.
type Reconstructable = {
	reconstructFromConfig(
		agentEntity: Agent,
		credentialProvider: CredentialProvider,
		userId?: string,
	): Promise<{ agent: agents.Agent; toolRegistry: ToolRegistry }>;
};

describe('AgentsService.reconstructFromConfig — node tools gating', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// rebuild the builtAgent mock state (jest.clearAllMocks clears calls, not behavior)
		builtAgent.hasCheckpointStorage.mockReturnValue(true);
	});

	function setup(options: { nodeToolsModuleEnabled?: boolean } = {}) {
		const agentsToolsService = mock<AgentsToolsService>();
		agentsToolsService.getRuntimeTools.mockReturnValue([] as BuiltTool[]);
		const credentialProvider = mock<CredentialProvider>();
		const service = makeService(
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

		await (service as unknown as Reconstructable).reconstructFromConfig(entity, credentialProvider);

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

describe('AgentsService.reconstructFromConfig — MCP wiring', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		builtAgent.hasCheckpointStorage.mockReturnValue(true);
		buildFromJsonMock.mockImplementation(async (_config, _descriptors, options) => {
			// Drive the buildMcpClient callback exactly once per configured server,
			// matching what the real buildFromJson does — this is what lets the
			// gating test assert how many MCP clients were created.
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
		const service = makeService(agentsToolsService);
		return { service, credentialProvider };
	}

	it('does not call the MCP factory when no mcpServers are configured', async () => {
		const { service, credentialProvider } = setup();
		const entity = makeAgentEntity();

		await (service as unknown as Reconstructable).reconstructFromConfig(entity, credentialProvider);

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

		await (service as unknown as Reconstructable).reconstructFromConfig(entity, credentialProvider);

		expect(buildMcpClientForServerMock).toHaveBeenCalledTimes(2);
		expect(buildMcpClientForServerMock.mock.calls[0][0]).toMatchObject({ name: 'github' });
		expect(buildMcpClientForServerMock.mock.calls[1][0]).toMatchObject({ name: 'fs' });
	});
});
