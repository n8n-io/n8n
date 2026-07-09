import type { AgentJsonConfig } from '@n8n/api-types';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiAgentBuilderService, InstanceAiContext } from '../../../types';
import { getAgentConfigHash } from '../config-helpers';
import { createReadConfigTool } from '../config-tools';

const VALID_CONFIG: AgentJsonConfig = {
	name: 'Support Agent',
	model: 'anthropic/claude-sonnet-4-5',
	credential: 'cred-1',
	instructions: 'Answer support questions.',
};

function createService(
	overrides: Partial<InstanceAiAgentBuilderService> = {},
): InstanceAiAgentBuilderService {
	return {
		createAgent: vi.fn(),
		getConfigSnapshot: vi.fn(),
		updateConfig: vi.fn(),
		createSkill: vi.fn(),
		createTask: vi.fn(),
		describeCustomTool: vi.fn(),
		buildCustomTool: vi.fn(),
		listChatIntegrations: vi.fn(),
		listProjectAgents: vi.fn(),
		listAllProjectAgents: vi.fn(),
		listModels: vi.fn(),
		searchMcpServers: vi.fn(),
		verifyMcpServer: vi.fn(),
		searchNodes: vi.fn(),
		resolveResourceLocatorOptions: vi.fn(),
		listAttachableWorkflows: vi.fn(),
		...overrides,
	};
}

function createContext(service?: InstanceAiAgentBuilderService): InstanceAiContext {
	return {
		userId: 'user-1',
		agentBuilderService: service,
		agentBuilderTarget: service ? { agentId: 'agent-1', projectId: 'project-1' } : undefined,
		// nodeTypesProvider intentionally omitted → dynamic-selector check is skipped.
	} as unknown as InstanceAiContext;
}

describe('agent-builder config tools', () => {
	describe('read_config', () => {
		it('returns the snapshot with a configHash', async () => {
			const service = createService({
				getConfigSnapshot: vi
					.fn()
					.mockResolvedValue({ config: VALID_CONFIG, updatedAt: 't', versionId: 'v1' }),
			});
			const result = await executeTool(createReadConfigTool(createContext(service)), {}, {});
			expect(result).toEqual({
				ok: true,
				config: VALID_CONFIG,
				updatedAt: 't',
				versionId: 'v1',
				configHash: getAgentConfigHash(VALID_CONFIG),
			});
		});

		it('reports not-configured when the service is absent', async () => {
			const result = await executeTool<{ ok: boolean }>(
				createReadConfigTool(createContext()),
				{},
				{},
			);
			expect(result.ok).toBe(false);
		});
	});
});
