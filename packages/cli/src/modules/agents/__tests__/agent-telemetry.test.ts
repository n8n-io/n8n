import type { AgentJsonConfig } from '@n8n/api-types';

import {
	buildAgentConfigurationTelemetry,
	buildAgentConfigurationTelemetryFromConfig,
} from '../agent-telemetry';
import type { Agent } from '../entities/agent.entity';

function makeAgent(schema: AgentJsonConfig | null, overrides: Partial<Agent> = {}): Agent {
	return {
		id: 'agent-1',
		schema,
		integrations: [],
		tools: {},
		skills: {},
		...overrides,
	} as Agent;
}

describe('agent telemetry', () => {
	it('derives safe configuration dimensions from an agent entity', () => {
		const schema: AgentJsonConfig = {
			name: 'Test Agent',
			model: 'anthropic/claude-sonnet-4-5',
			instructions: 'Be helpful',
			integrations: [{ type: 'slack', credentialId: 'slack-cred' }],
			tools: [
				{ type: 'custom', id: 'private_tool_name' },
				{ type: 'workflow', workflow: 'workflow-1' },
			],
			skills: [{ type: 'skill', id: 'private_skill_name' }],
			mcpServers: [
				{
					name: 'github',
					url: 'https://mcp.example.test',
					transport: 'streamableHttp',
					authentication: 'none',
				},
			],
			providerTools: {
				'openai.web_search': { enabled: true },
			},
			subAgents: {
				agents: [{ agentId: 'agent-2' }],
			},
			config: {
				webSearch: { enabled: true },
				nodeTools: { enabled: true },
			},
			memory: {
				enabled: true,
				storage: 'n8n',
				episodicMemory: { enabled: true, credential: 'memory-cred' },
			},
		};

		expect(
			buildAgentConfigurationTelemetry(
				makeAgent(schema, { integrations: [{ type: 'linear', credentialId: 'linear-cred' }] }),
			),
		).toEqual({
			model: 'anthropic/claude-sonnet-4-5',
			channels: ['linear', 'slack'],
			tool_types: ['custom', 'mcp', 'node_tools', 'provider', 'subagent', 'web_search', 'workflow'],
			tool_count: 7,
			num_skills: 1,
			memory_type: 'n8n_observational_episodic',
		});
	});

	it('uses empty dimensions for missing optional config', () => {
		expect(buildAgentConfigurationTelemetryFromConfig(null)).toEqual({
			model: null,
			channels: [],
			tool_types: [],
			tool_count: 0,
			num_skills: 0,
			memory_type: 'none',
		});
	});
});
