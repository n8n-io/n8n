import {
	capabilityCountTelemetryProperties,
	type AgentCapabilityCounts,
} from '../agent-capabilities';

describe('capabilityCountTelemetryProperties', () => {
	const counts: AgentCapabilityCounts = {
		tool: 1,
		skill: 2,
		subAgent: 3,
		mcpServer: 4,
		vectorStore: 5,
		task: 6,
		channel: 7,
	};

	it('maps every count to its telemetry property name', () => {
		expect(capabilityCountTelemetryProperties(counts)).toEqual({
			capability_kinds: [
				'channel',
				'mcpServer',
				'skill',
				'subAgent',
				'task',
				'tool',
				'vectorStore',
			],
			capability_count: 28,
			tool_count: 1,
			skill_count: 2,
			sub_agent_count: 3,
			mcp_server_count: 4,
			vector_store_count: 5,
			task_count: 6,
			trigger_count: 7,
		});
	});

	it('reports unconfigured kinds as zero and leaves them out of the kinds list', () => {
		expect(capabilityCountTelemetryProperties({ ...counts, tool: 0, channel: 0 })).toMatchObject({
			capability_kinds: ['mcpServer', 'skill', 'subAgent', 'task', 'vectorStore'],
			capability_count: 20,
			tool_count: 0,
			trigger_count: 0,
		});
	});
});
