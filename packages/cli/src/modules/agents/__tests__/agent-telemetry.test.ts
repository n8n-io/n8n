import type { AgentJsonConfig } from '@n8n/api-types';

import {
	buildAgentCapabilityTelemetryProperties,
	buildAgentConfigurationTelemetry,
	buildAgentConfigurationTelemetryFromConfig,
	buildAgentTurnMetrics,
} from '../agent-telemetry';
import type { ProjectAgent } from '../entities/agent.entity';
import type { MessageRecord, TimelineEvent } from '../execution-recorder';
import { storedRunSource } from './test-utils/stored-agent-config';

function makeAgent(
	schema: AgentJsonConfig | null,
	overrides: Partial<ProjectAgent> = {},
): ProjectAgent {
	return {
		id: 'agent-1',
		schema,
		integrations: [],
		tools: {},
		skills: {},
		...overrides,
	} as ProjectAgent;
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
				agents: [{ agentId: 'agent-2', useWhen: 'Use for research tasks.' }],
			},
			config: {
				webSearch: { enabled: true },
			},
			memory: {
				enabled: true,
				storage: 'n8n',
				episodicMemory: { enabled: true, credential: 'memory-cred' },
			},
		};

		expect(
			buildAgentConfigurationTelemetry(
				storedRunSource(
					makeAgent(schema, { integrations: [{ type: 'linear', credentialId: 'linear-cred' }] }),
				),
			),
		).toEqual({
			model: 'anthropic/claude-sonnet-4-5',
			channels: ['linear', 'slack'],
			tool_types: ['custom', 'mcp', 'provider', 'subagent', 'web_search', 'workflow'],
			tool_count: 6,
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

	it('reports the ids of the attached skills on the capability profile', () => {
		const config: AgentJsonConfig = {
			name: 'Test Agent',
			model: 'anthropic/claude-sonnet-4-5',
			instructions: 'Be helpful',
			skills: [
				{ type: 'skill', id: 'skill_b' },
				{ type: 'skill', id: 'skill_a' },
			],
		};

		expect(buildAgentCapabilityTelemetryProperties(config, [])).toEqual(
			expect.objectContaining({ skill_count: 2, skill_ids: ['skill_a', 'skill_b'] }),
		);
		expect(buildAgentCapabilityTelemetryProperties(null, [])).toEqual(
			expect.objectContaining({ skill_count: 0, skill_ids: [] }),
		);
	});

	describe('buildAgentTurnMetrics', () => {
		const toolCall = (
			name: string,
			input: unknown,
			output: unknown,
			success = true,
		): TimelineEvent => ({
			type: 'tool-call',
			kind: 'tool',
			name,
			toolCallId: `call-${name}`,
			input,
			output,
			startTime: 0,
			endTime: 1,
			success,
		});

		const metricsFor = (timeline: TimelineEvent[]) =>
			buildAgentTurnMetrics({
				duration: 100,
				totalCost: 1,
				usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
				timeline,
			} as MessageRecord);

		it('counts each load_skill call that activated a skill', () => {
			expect(
				metricsFor([
					toolCall('load_skill', { skillId: 'skill_a' }, { success: true, skillId: 'skill_a' }),
					toolCall('load_skill', { name: 'Billing' }, { success: true, skillId: 'skill_b' }),
					toolCall('load_skill', { skillId: 'skill_a' }, { success: true, skillId: 'skill_a' }),
					toolCall('search', { query: 'x' }, { ok: true }),
				]),
			).toEqual({
				latency_ms: 100,
				cost: 1,
				token_count: 15,
				tool_call_count: 4,
				skill_load_count: 3,
				loaded_skill_ids: ['skill_a', 'skill_b'],
			});
		});

		it('takes the id from the input when the result is the skill text', () => {
			expect(
				metricsFor([
					toolCall(
						'load_skill',
						{ skillId: 'skill_a' },
						{ type: 'content', value: [{ type: 'text', text: 'Skill text' }] },
					),
				]),
			).toEqual(expect.objectContaining({ skill_load_count: 1, loaded_skill_ids: ['skill_a'] }));
		});

		it('counts a load of the main skill file, and a load by name without an id', () => {
			expect(
				metricsFor([
					toolCall(
						'load_skill',
						{ skillId: 'skill_a', filePath: 'SKILL.md' },
						{ success: true, skillId: 'skill_a' },
					),
					toolCall(
						'load_skill',
						{ name: 'Billing' },
						{ type: 'content', value: [{ type: 'text', text: 'Skill text' }] },
					),
				]),
			).toEqual(expect.objectContaining({ skill_load_count: 2, loaded_skill_ids: ['skill_a'] }));
		});

		it('does not count failed loads or linked file reads', () => {
			expect(
				metricsFor([
					toolCall('load_skill', { skillId: 'missing' }, { ok: false, success: false }),
					toolCall('load_skill', { skillId: 'skill_a' }, { success: true }, false),
					toolCall(
						'load_skill',
						{ skillId: 'skill_a', filePath: 'references/api.md' },
						{ ok: true, success: true, skillId: 'skill_a', filePath: 'references/api.md' },
					),
				]),
			).toEqual(expect.objectContaining({ skill_load_count: 0, loaded_skill_ids: [] }));
		});
	});
});
