import { describe, it, expect, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import type { AppBlueprint, InstanceAiAgentNode } from '@n8n/api-types';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import AgentTimeline from '../components/AgentTimeline.vue';

const renderComponent = createThreadComponentRenderer(AgentTimeline, {
	global: {
		stubs: {
			ThinkingBlock: { template: '<div />' },
			AgentSection: { template: '<div />' },
			TimelineTextSegment: { template: '<div />' },
			InstanceAiAppBlueprint: {
				props: ['blueprint'],
				template: '<div data-test-id="blueprint-card">{{ blueprint.description }}</div>',
			},
		},
	},
});

const blueprint = (description: string): AppBlueprint => ({
	name: 'Review desk',
	namespace: 'review-desk',
	visibility: 'project',
	description,
	theme: 'light',
});

const blueprintCall = (id: string, description: string, result?: unknown) => ({
	toolCallId: id,
	toolName: 'apps',
	args: { action: 'create', blueprint: blueprint(description) },
	isLoading: result === undefined,
	...(result === undefined ? {} : { result }),
	confirmation: {
		requestId: `req-${id}`,
		severity: 'info',
		message: 'Review the blueprint',
		inputType: 'app-blueprint',
		appBlueprint: blueprint(description),
	},
});

/** The user asked for a change on the first card. The agent answered with a second card. */
const node = {
	agentId: 'root',
	role: 'orchestrator',
	status: 'active',
	textContent: '',
	reasoning: '',
	toolCalls: [
		blueprintCall('tc-1', 'First plan', {
			approved: false,
			revisionRequested: true,
			feedback: 'Make the drafts a chart',
		}),
		blueprintCall('tc-2', 'Second plan'),
	],
	children: [],
	timeline: [
		{ type: 'tool-call', responseId: 'r1', toolCallId: 'tc-1' },
		{ type: 'tool-call', responseId: 'r2', toolCallId: 'tc-2' },
	],
} as unknown as InstanceAiAgentNode;

describe('AgentTimeline plan revisions', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
	});

	it('collapses a revised blueprint card to the change and keeps only the latest card', () => {
		const { getAllByTestId, getByTestId } = renderComponent({ props: { agentNode: node } });

		expect(getByTestId('instance-ai-app-blueprint-revised')).toHaveTextContent(
			'Plan revised: Make the drafts a chart',
		);
		const cards = getAllByTestId('blueprint-card');
		expect(cards).toHaveLength(1);
		expect(cards[0]).toHaveTextContent('Second plan');
	});
});
