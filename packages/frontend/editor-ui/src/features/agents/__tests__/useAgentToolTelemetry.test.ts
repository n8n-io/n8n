import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useAgentToolTelemetry } from '../composables/useAgentToolTelemetry';
import type { AgentJsonToolRef } from '../types';

const trackMock = vi.fn();

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

function nodeRef(overrides: Partial<AgentJsonToolRef['node']> = {}): AgentJsonToolRef {
	return {
		type: 'node',
		name: 'Slack',
		requireApproval: false,
		node: { nodeType: 'n8n-nodes-base.slack', nodeTypeVersion: 1, ...overrides },
	};
}

describe('useAgentToolTelemetry', () => {
	beforeEach(() => {
		trackMock.mockReset();
	});

	it('fires "User started adding agent tool" with tool_type and source: manual', () => {
		const t = useAgentToolTelemetry('agent-42');
		t.trackAddStarted('node');

		expect(trackMock).toHaveBeenCalledWith('User started adding agent tool', {
			tool_type: 'node',
			source: 'manual',
			agent_id: 'agent-42',
		});
	});

	it('fires "User added agent tool" with node_type + has_approval for node refs', () => {
		const t = useAgentToolTelemetry('agent-42');
		t.trackAdded(nodeRef());

		expect(trackMock).toHaveBeenCalledWith('User added agent tool', {
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

		expect(trackMock).toHaveBeenCalledWith('User added agent tool', {
			tool_type: 'workflow',
			has_approval: true,
			workflow: 'Daily digest',
			agent_id: 'agent-42',
		});
	});

	it('fires "User edited agent tool" with identity props', () => {
		const t = useAgentToolTelemetry('agent-42');
		t.trackEdited(nodeRef());

		expect(trackMock).toHaveBeenCalledWith('User edited agent tool', {
			tool_type: 'node',
			node_type: 'n8n-nodes-base.slack',
			agent_id: 'agent-42',
		});
	});

	it('fires "User removed agent tool" with identity props', () => {
		const t = useAgentToolTelemetry('agent-42');
		t.trackRemoved({ type: 'workflow', workflow: 'Daily digest' });

		expect(trackMock).toHaveBeenCalledWith('User removed agent tool', {
			tool_type: 'workflow',
			workflow: 'Daily digest',
			agent_id: 'agent-42',
		});
	});

	it('omits agent_id when not provided', () => {
		const t = useAgentToolTelemetry();
		t.trackAddStarted('node');

		expect(trackMock).toHaveBeenCalledWith('User started adding agent tool', {
			tool_type: 'node',
			source: 'manual',
		});
	});
});
