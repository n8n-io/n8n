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
