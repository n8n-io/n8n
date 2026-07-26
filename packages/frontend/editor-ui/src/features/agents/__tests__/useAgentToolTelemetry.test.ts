import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { useAgentToolTelemetry } from '../composables/useAgentToolTelemetry';
import type { AgentJsonMcpServerConfig, AgentJsonToolRef } from '../types';

const trackMock = vi.fn();

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

function nodeRef(
	overrides: Partial<Extract<AgentJsonToolRef, { type: 'node' }>['node']> = {},
): Extract<AgentJsonToolRef, { type: 'node' }> {
	return {
		type: 'node',
		name: 'Slack',
		requireApproval: false,
		node: {
			nodeType: 'n8n-nodes-base.slack',
			nodeTypeVersion: 1,
			nodeParameters: {},
			...overrides,
		},
	};
}

describe('useAgentToolTelemetry', () => {
	beforeEach(() => {
		trackMock.mockReset();
	});

	it('fires "User started adding agent tool" with tool_type and source: manual', () => {
		const t = useAgentToolTelemetry('agent-42');
		t.trackAddStarted('node');

		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_STARTED_ADDING_AGENT_TOOL, {
			tool_type: 'node',
			source: 'manual',
			agent_id: 'agent-42',
		});
	});

	it('fires "User added agent tool" with node_type + has_approval for node refs', () => {
		const t = useAgentToolTelemetry('agent-42');
		t.trackAdded(nodeRef());

		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_ADDED_AGENT_TOOL, {
			tool_type: 'node',
			has_approval: false,
			node_type: 'n8n-nodes-base.slack',
			agent_id: 'agent-42',
		});
	});

	it('fires "User added agent tool" with workflow + has_approval for workflow refs', () => {
		const t = useAgentToolTelemetry('agent-42');
		const ref: AgentJsonToolRef = {
			type: 'workflow',
			workflow: 'Daily digest',
			name: 'Daily digest',
			requireApproval: true,
		};
		t.trackAdded(ref);

		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_ADDED_AGENT_TOOL, {
			tool_type: 'workflow',
			has_approval: true,
			workflow: 'Daily digest',
			agent_id: 'agent-42',
		});
	});

	it('fires "User added agent tool" with MCP server details', () => {
		const t = useAgentToolTelemetry('agent-42');
		const server: AgentJsonMcpServerConfig = {
			name: 'github',
			url: 'https://mcp.github.com',
			transport: 'streamableHttp',
			authentication: 'none',
		};
		t.trackAddedMcpServer(server);

		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_ADDED_AGENT_TOOL, {
			tool_type: 'mcpServer',
			has_approval: false,
			server_name: 'github',
			authentication: 'none',
			agent_id: 'agent-42',
		});
	});

	it('fires "User edited agent tool" with identity props', () => {
		const t = useAgentToolTelemetry('agent-42');
		t.trackEdited(nodeRef());

		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_EDITED_AGENT_TOOL, {
			tool_type: 'node',
			node_type: 'n8n-nodes-base.slack',
			agent_id: 'agent-42',
		});
	});

	it('fires "User removed agent tool" with identity props', () => {
		const t = useAgentToolTelemetry('agent-42');
		t.trackRemoved({ type: 'workflow', workflow: 'Daily digest' });

		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_REMOVED_AGENT_TOOL, {
			tool_type: 'workflow',
			workflow: 'Daily digest',
			agent_id: 'agent-42',
		});
	});

	it('omits agent_id when not provided', () => {
		const t = useAgentToolTelemetry();
		t.trackAddStarted('node');

		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_STARTED_ADDING_AGENT_TOOL, {
			tool_type: 'node',
			source: 'manual',
		});
	});
});
