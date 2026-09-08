import { describe, it, expect, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import AgentTimeline from '../components/AgentTimeline.vue';
import type { InstanceAiAgentNode, InstanceAiVerificationClaim } from '@n8n/api-types';

const renderComponent = createThreadComponentRenderer(AgentTimeline, {
	global: {
		stubs: {
			InstanceAiMarkdown: { template: '<span>{{ content }}</span>', props: ['content'] },
		},
	},
});

const claim: InstanceAiVerificationClaim = {
	level: 'partial',
	plannedNodeCount: 11,
	reachedNodeCount: 4,
	nodesNotReached: ['Send Email', 'Log Row'],
	simulatedNodes: [{ nodeName: 'Create Event', reason: 'Creates a record' }],
	pinnedNodes: [],
	unprovenTargets: [],
	publishReady: false,
	liveTestRecommended: true,
};

function agentNode(timeline: InstanceAiAgentNode['timeline']): InstanceAiAgentNode {
	return {
		agentId: 'a1',
		status: 'completed',
		toolCalls: [],
		children: [],
		timeline,
	} as unknown as InstanceAiAgentNode;
}

describe('AgentTimeline verification verdict', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
	});

	it('renders the verdict card from a timeline entry', () => {
		const { getByTestId, getByText } = renderComponent({
			props: {
				agentNode: agentNode([
					{ type: 'verification-verdict', responseId: 'verdict-disclosure:wi_1:t1', claim },
				]),
			},
		});

		expect(getByTestId('instance-ai-verification-verdict')).toBeInTheDocument();
		expect(getByText('Not fully verified')).toBeInTheDocument();
	});

	it('keeps the verdict out of the thinking block so it cannot read as narration', () => {
		const { getByTestId, container } = renderComponent({
			props: {
				agentNode: agentNode([
					{ type: 'reasoning', responseId: 'r1', content: 'Checking coverage.' },
					{ type: 'verification-verdict', responseId: 'verdict-disclosure:wi_1:t1', claim },
				]),
			},
		});

		const card = getByTestId('instance-ai-verification-verdict');
		expect(card).toBeInTheDocument();
		// A standalone block, so it is a sibling of the thinking block, not inside it.
		expect(container.querySelector('[data-test-id="thinking-block"]')?.contains(card)).not.toBe(
			true,
		);
	});

	it('renders the verdict after the text that precedes it', () => {
		const { container } = renderComponent({
			props: {
				agentNode: agentNode([
					{ type: 'text', responseId: 'r1', content: 'Here is what I built.' },
					{ type: 'verification-verdict', responseId: 'verdict-disclosure:wi_1:t1', claim },
				]),
			},
		});

		const html = container.innerHTML;
		expect(html.indexOf('Here is what I built.')).toBeLessThan(
			html.indexOf('instance-ai-verification-verdict'),
		);
	});
});
