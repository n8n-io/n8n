import { describe, it, expect, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import AgentTimeline from '../components/AgentTimeline.vue';
import type { InstanceAiAgentNode } from '@n8n/api-types';

const renderComponent = createThreadComponentRenderer(AgentTimeline, {
	global: {
		stubs: {
			InstanceAiMarkdown: { template: '<span>{{ content }}</span>', props: ['content'] },
		},
	},
});

/** Answer-length narration — past TAIL_NARRATION_MAX_LENGTH, so it promotes out. */
const PLAN = 'I found your new BigQuery credential and got the Supabase node definitions. '.repeat(
	4,
);

function agentNode(status: 'active' | 'completed'): InstanceAiAgentNode {
	return {
		agentId: 'a1',
		status,
		toolCalls: [],
		children: [],
		timeline: [
			{ type: 'reasoning', responseId: 'r1', content: 'Checking the credential type.' },
			{ type: 'text', responseId: 'r1', content: PLAN },
		],
	} as unknown as InstanceAiAgentNode;
}

describe('AgentTimeline activity indicator', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
	});

	it('shows typing dots when a committed answer settles the block mid-run', () => {
		/** INS-1224: the transcript claimed done while the composer stayed on stop. */
		const { container } = renderComponent({ props: { agentNode: agentNode('active') } });

		expect(container.querySelector('[data-test-id="ai-typing-indicator"]')).toBeTruthy();
	});

	it('hides typing dots when the run is complete', () => {
		const { container } = renderComponent({ props: { agentNode: agentNode('completed') } });

		expect(container.querySelector('[data-test-id="ai-typing-indicator"]')).toBeNull();
	});
});
