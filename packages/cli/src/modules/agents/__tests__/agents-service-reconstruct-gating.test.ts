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
import type { WorkflowRunner } from '@/workflow-runner';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentSkillsService } from '../agent-skills.service';
import type { AgentsToolsService } from '../agents-tools.service';
import { AgentsService } from '../agents.service';
import type { AgentsComputerUseService } from '../computer-use/agents-computer-use.service';
import type { Agent } from '../entities/agent.entity';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { N8nMemory } from '../integrations/n8n-memory';
import type { AgentJsonConfig } from '../json-config/agent-json-config';
import type { AgentPublishedVersionRepository } from '../repositories/agent-published-version.repository';
import type { AgentRepository } from '../repositories/agent.repository';
import type { AgentSecureRuntime } from '../runtime/agent-secure-runtime';

// Mock buildFromJson so reconstructFromConfig doesn't try to actually build an agent.
const builtAgent = mock<agents.Agent>();
builtAgent.hasCheckpointStorage.mockReturnValue(true); // skip checkpoint injection branch

jest.mock('../json-config/from-json-config', () => ({
	buildFromJson: jest.fn().mockImplementation(async () => builtAgent),
}));

// Avoid loading the rich-interaction tool (its import path resolves to runtime code).
jest.mock('../integrations/rich-interaction-tool', () => ({
	createRichInteractionTool: () => ({}) as never,
}));

function makeService(
	agentsToolsService: AgentsToolsService,
	modules: string[] = [],
	agentsComputerUseService = mock<AgentsComputerUseService>(),
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
		agentsComputerUseService,
		mock<N8nMemory>(),
		mock<AgentExecutionService>(),
		mock<AgentPublishedVersionRepository>(),
		mock<AgentSkillsService>(),
		mock(),
		{ modules } as unknown as AgentsConfig,
		mock(),
	);
}

function makeAgentEntity(schemaConfig?: AgentJsonConfig['config']): Agent {
	const schema: AgentJsonConfig = {
		name: 'Test',
		model: 'anthropic/claude-sonnet-4-5',
		instructions: 'Be helpful',
		...(schemaConfig !== undefined ? { config: schemaConfig } : {}),
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
		options?: { integrationType?: string; computerUseUserId?: string } | string,
	): Promise<{ agent: agents.Agent; toolRegistry: ToolRegistry }>;
};

describe('AgentsService.reconstructFromConfig — node tools gating', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// rebuild the builtAgent mock state (jest.clearAllMocks clears calls, not behavior)
		builtAgent.hasCheckpointStorage.mockReturnValue(true);
	});

	function setup(
		options: { nodeToolsModuleEnabled?: boolean; computerUseModuleEnabled?: boolean } = {},
	) {
		const agentsToolsService = mock<AgentsToolsService>();
		agentsToolsService.getRuntimeTools.mockReturnValue([] as BuiltTool[]);
		const agentsComputerUseService = mock<AgentsComputerUseService>();
		agentsComputerUseService.getRuntimeTools.mockReturnValue([]);
		const credentialProvider = mock<CredentialProvider>();
		const modules = [
			...(options.nodeToolsModuleEnabled ? ['node-tools-searcher'] : []),
			...(options.computerUseModuleEnabled ? ['computer-use'] : []),
		];
		const service = makeService(agentsToolsService, modules, agentsComputerUseService);
		return { service, agentsToolsService, agentsComputerUseService, credentialProvider };
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

	it('attaches computer-use tools only when the runtime passes a test-chat user context', async () => {
		const { service, agentsComputerUseService, credentialProvider } = setup({
			computerUseModuleEnabled: true,
		});
		const computerTool: BuiltTool = {
			name: 'browser_connect',
			description: 'Connect to a browser session',
		};
		agentsComputerUseService.getRuntimeTools.mockReturnValue([computerTool]);
		const entity = makeAgentEntity();
		if (entity.schema === null) throw new Error('Expected test agent to have a schema');
		entity.schema.computerUse = { enabled: true, browser: { enabled: true } };

		await (service as unknown as Reconstructable).reconstructFromConfig(
			entity,
			credentialProvider,
			'user-1',
		);

		expect(agentsComputerUseService.getRuntimeTools).not.toHaveBeenCalled();

		await (service as unknown as Reconstructable).reconstructFromConfig(
			entity,
			credentialProvider,
			'user-1',
			{ computerUseUserId: 'user-1' },
		);

		expect(agentsComputerUseService.getRuntimeTools).toHaveBeenCalledWith(entity.schema, 'user-1');
	});
});
