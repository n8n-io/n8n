import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import AgentTimeline from '../components/AgentTimeline.vue';
import { ACTIVITY_INDICATOR_DELAY_MS } from '../agentTimeline.utils';
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

function agentNode(text: string): InstanceAiAgentNode {
	return {
		agentId: 'a1',
		status: 'active',
		toolCalls: [],
		children: [],
		timeline: [
			{ type: 'reasoning', responseId: 'r1', content: 'Checking the credential type.' },
			{ type: 'text', responseId: 'r1', content: text },
		],
	} as unknown as InstanceAiAgentNode;
}

function indicatorText(container: Element): string | undefined {
	return container
		.querySelector('[data-test-id="timeline-activity-indicator"]')
		?.textContent?.replace(/\s+/g, ' ')
		.trim();
}

describe('AgentTimeline activity indicator', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('surfaces a counting indicator when a committed answer settles the block mid-run', async () => {
		// INS-1224: the transcript claimed done while the composer stayed on stop.
		const { container } = renderComponent({ props: { agentNode: agentNode(PLAN) } });

		await vi.advanceTimersByTimeAsync(ACTIVITY_INDICATOR_DELAY_MS + 4_000);
		expect(indicatorText(container)).toBe('Thinking · 9s');
	});

	it('stays hidden while the run is only briefly quiet', async () => {
		// A run wrapping up after its last token would otherwise put "Thinking"
		// under every answer longer than the narration cap.
		const { container } = renderComponent({ props: { agentNode: agentNode(PLAN) } });

		await vi.advanceTimersByTimeAsync(ACTIVITY_INDICATOR_DELAY_MS - 1_000);
		expect(indicatorText(container)).toBeUndefined();
	});

	it('restarts the clock while text is still streaming into the tail entry', async () => {
		// Guards the progressToken wiring: the tail entry's identity never changes
		// as it grows, so without it the stall would be overstated by however long
		// the answer took to write.
		const { container, rerender } = renderComponent({ props: { agentNode: agentNode(PLAN) } });

		await vi.advanceTimersByTimeAsync(ACTIVITY_INDICATOR_DELAY_MS + 4_000);
		expect(indicatorText(container)).toBe('Thinking · 9s');

		await rerender({ agentNode: agentNode(`${PLAN} My plan for Code-node elimination:`) });
		expect(indicatorText(container)).toBeUndefined();

		await vi.advanceTimersByTimeAsync(ACTIVITY_INDICATOR_DELAY_MS);
		expect(indicatorText(container)).toBe('Thinking · 5s');
	});
});
