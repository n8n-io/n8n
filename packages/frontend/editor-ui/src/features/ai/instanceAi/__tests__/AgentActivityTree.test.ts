import { describe, it, expect, beforeEach } from 'vitest';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import { createTestingPinia } from '@pinia/testing';
import AgentActivityTree from '../components/AgentActivityTree.vue';
import type { InstanceAiAgentNode } from '@n8n/api-types';

const renderComponent = createThreadComponentRenderer(AgentActivityTree, {
	global: {
		stubs: {
			AgentTimeline: {
				template: '<div data-test-id="agent-timeline" />',
				props: ['agentNode'],
			},
			ResponseGroup: {
				template: '<div data-test-id="response-group" />',
				props: ['group', 'agentNode', 'isLast'],
			},
		},
	},
});

function makeAgentNode(overrides: Partial<InstanceAiAgentNode> = {}): InstanceAiAgentNode {
	return {
		agentId: 'agent-1',
		role: 'orchestrator',
		status: 'active',
		textContent: '',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
		...overrides,
	};
}

describe('AgentActivityTree', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
	});

	it('shows legacy top reasoning panel when reasoning exists without timeline entries', () => {
		const { getByText } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					reasoning: 'Old persisted reasoning',
					timeline: [{ type: 'tool-call', toolCallId: 'tc-1' }],
				}),
				isRoot: true,
			},
		});

		expect(getByText('Reasoning')).toBeInTheDocument();
	});

	it('hides legacy top reasoning panel when timeline has reasoning entries', () => {
		const { queryByText } = renderComponent({
			props: {
				agentNode: makeAgentNode({
					reasoning: 'Merged reasoning string',
					timeline: [{ type: 'reasoning', content: 'Interleaved block' }],
				}),
				isRoot: true,
			},
		});

		expect(queryByText('Reasoning')).not.toBeInTheDocument();
	});
});
