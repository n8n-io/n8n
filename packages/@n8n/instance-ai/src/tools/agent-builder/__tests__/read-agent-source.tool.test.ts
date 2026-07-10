import type { AgentJsonConfig } from '@n8n/api-types';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiAgentBuilderService, InstanceAiContext } from '../../../types';
import { getAgentConfigHash } from '../config-helpers';
import { createReadAgentSourceTool } from '../read-agent-source.tool';

function createService(config: AgentJsonConfig): InstanceAiAgentBuilderService {
	return {
		createAgent: vi.fn(),
		getConfigSnapshot: vi.fn().mockResolvedValue({
			config,
			updatedAt: 't1',
			versionId: 'v1',
		}),
		updateConfig: vi.fn(),
		createSkill: vi.fn(),
		createTask: vi.fn(),
		describeCustomTool: vi.fn(),
		buildCustomTool: vi.fn(),
		listChatIntegrations: vi.fn(),
		listProjectAgents: vi.fn(),
		listAllProjectAgents: vi.fn(),
		isEpisodicMemoryManagedCredentialAvailable: vi.fn(),
		listModels: vi.fn(),
		searchMcpServers: vi.fn(),
		verifyMcpServer: vi.fn(),
		searchNodes: vi.fn(),
		resolveResourceLocatorOptions: vi.fn(),
		listAttachableWorkflows: vi.fn(),
	};
}

describe('read_agent_source tool', () => {
	it('writes deterministic TypeScript for the current persisted config', async () => {
		const config: AgentJsonConfig = {
			name: 'Support agent',
			model: '',
			instructions: '',
		};
		const service = createService(config);
		const writeFile = vi.fn();
		const context = {
			userId: 'user-1',
			agentBuilderService: service,
			agentBuilderTarget: { agentId: 'agent-1', projectId: 'project-1' },
			workspace: { filesystem: { writeFile } },
			logger: { debug: vi.fn(), warn: vi.fn() },
		} as unknown as InstanceAiContext;

		const result = await executeTool<{
			ok: boolean;
			filePath?: string;
			configHash?: string | null;
		}>(createReadAgentSourceTool(context), {}, {});

		expect(result).toMatchObject({
			ok: true,
			filePath: 'src/agents/agent-1.agent.ts',
			configHash: getAgentConfigHash(config),
		});
		expect(writeFile).toHaveBeenCalledWith(
			'src/agents/agent-1.agent.ts',
			'import { agent } from \'@n8n/workflow-sdk/agent\';\n\nexport default agent("Support agent");\n',
			{ recursive: true },
		);
	});
});
