import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import AgentTimeline from '../components/AgentTimeline.vue';
import type { InstanceAiAgentNode } from '@n8n/api-types';
import { ACTIVITY_INDICATOR_DELAY_MS } from '../agentTimeline.utils';

const TYPING_INDICATOR = '[data-test-id="ai-typing-indicator"]';

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
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows typing dots after a long silence when a committed answer settles the block mid-run', async () => {
		/** INS-1224: the transcript claimed done while the composer stayed on stop. */
		const { container } = renderComponent({ props: { agentNode: agentNode('active') } });

		await vi.advanceTimersByTimeAsync(ACTIVITY_INDICATOR_DELAY_MS);
		expect(container.querySelector(TYPING_INDICATOR)).toBeTruthy();
	});

	it('hides typing dots through a short silence', async () => {
		const { container } = renderComponent({ props: { agentNode: agentNode('active') } });

		await vi.advanceTimersByTimeAsync(ACTIVITY_INDICATOR_DELAY_MS - 1_000);
		expect(container.querySelector(TYPING_INDICATOR)).toBeNull();
	});

	it('hides typing dots again when the run advances', async () => {
		const node = agentNode('active');
		const { container, rerender } = renderComponent({ props: { agentNode: node } });

		await vi.advanceTimersByTimeAsync(ACTIVITY_INDICATOR_DELAY_MS);
		expect(container.querySelector(TYPING_INDICATOR)).toBeTruthy();

		const advanced = {
			...node,
			timeline: [...node.timeline, { type: 'text', responseId: 'r1', content: PLAN }],
		} as unknown as InstanceAiAgentNode;
		await rerender({ agentNode: advanced });
		expect(container.querySelector(TYPING_INDICATOR)).toBeNull();
	});

	it('hides typing dots when the run is complete', async () => {
		const { container } = renderComponent({ props: { agentNode: agentNode('completed') } });

		await vi.advanceTimersByTimeAsync(ACTIVITY_INDICATOR_DELAY_MS);
		expect(container.querySelector(TYPING_INDICATOR)).toBeNull();
	});
});
