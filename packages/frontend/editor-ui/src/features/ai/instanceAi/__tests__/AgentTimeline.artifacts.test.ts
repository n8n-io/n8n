import { describe, it, expect, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { computed } from 'vue';
import type { InstanceAiAgentNode } from '@n8n/api-types';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import AgentTimeline from '../components/AgentTimeline.vue';
import { INSTANCE_AI_EMBED_SUBJECT_KEY } from '../embed/instanceAiEmbed.types';

const renderComponent = createThreadComponentRenderer(AgentTimeline, {
	global: {
		stubs: {
			ThinkingBlock: { template: '<div />' },
			AgentSection: { template: '<div />' },
			TimelineTextSegment: { template: '<div />' },
		},
	},
});

const embedSubject = computed(() => ({
	type: 'agent' as const,
	id: 'agent-current',
	projectId: 'project-1',
}));

/** The orchestrator builds a workflow itself, then a builder child saves the current agent. */
const rootNode = {
	agentId: 'root',
	role: 'orchestrator',
	status: 'completed',
	textContent: '',
	reasoning: '',
	toolCalls: [
		{
			toolCallId: 'tc-build',
			toolName: 'workflow_builder_build_workflow',
			args: {},
			isLoading: false,
			result: { success: true, workflowId: 'wf-1', workflowName: 'Simple Hello World' },
		},
	],
	children: [
		{
			agentId: 'child-1',
			role: 'agent-builder',
			status: 'completed',
			textContent: '',
			reasoning: '',
			toolCalls: [],
			children: [],
			timeline: [],
			targetResource: { type: 'agent', id: 'agent-current', name: 'Current Agent' },
			agentChange: 'updated',
		},
	],
	timeline: [
		{ type: 'tool-call', responseId: 'r1', toolCallId: 'tc-build' },
		{ type: 'child', responseId: 'r2', agentId: 'child-1' },
		{ type: 'text', responseId: 'r2', content: 'Done.' },
	],
} as unknown as InstanceAiAgentNode;

function cardNames(container: Element): string[] {
	return [...container.querySelectorAll('[data-test-id="instance-ai-artifact-card"]')].map(
		(card) => card.textContent?.trim() ?? '',
	);
}

describe('AgentTimeline artifact cards', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
	});

	it('shows a card for a workflow the agent built itself and hides the embed subject', () => {
		const { container } = renderComponent({
			props: { agentNode: rootNode },
			global: { provide: { [INSTANCE_AI_EMBED_SUBJECT_KEY]: embedSubject } },
		});

		const names = cardNames(container);
		expect(names).toHaveLength(1);
		expect(names[0]).toContain('Simple Hello World');
	});

	it('keeps the full view unchanged outside the embedded panel', () => {
		const { container } = renderComponent({ props: { agentNode: rootNode } });

		const names = cardNames(container);
		expect(names).toHaveLength(1);
		expect(names[0]).toContain('Current Agent');
	});
});
