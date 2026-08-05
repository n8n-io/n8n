import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { useAgentToolTelemetry } from '../composables/useAgentToolTelemetry';
import type { AgentJsonToolRef } from '../types';

const trackMock = vi.fn();

vi.mock('@n8n/composables/useTelemetry', () => ({
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

	it('fires "User edited agent tool" with identity props', () => {
		const t = useAgentToolTelemetry('agent-42');
		t.trackEdited(nodeRef());

		expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_EDITED_AGENT_TOOL, {
			tool_type: 'node',
			node_type: 'n8n-nodes-base.slack',
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
