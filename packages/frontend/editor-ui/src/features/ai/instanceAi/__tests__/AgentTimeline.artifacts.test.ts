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

	describe('Agents the orchestrator builds itself', () => {
		const inThreadNode = {
			agentId: 'root',
			role: 'orchestrator',
			status: 'completed',
			textContent: '',
			reasoning: '',
			toolCalls: [
				{
					toolCallId: 'tc-select',
					toolName: 'agent_builder_select_agent',
					args: {},
					isLoading: false,
					result: {
						ok: true,
						agentId: 'agent-new',
						projectId: 'project-1',
						agentChange: 'created',
					},
				},
				{
					toolCallId: 'tc-write',
					toolName: 'agent_builder_write_config',
					args: {},
					isLoading: false,
					result: {
						ok: true,
						configMutated: true,
						agentId: 'agent-new',
						agentName: 'Support triage',
						projectId: 'project-1',
					},
				},
			],
			children: [],
			timeline: [
				{ type: 'tool-call', responseId: 'r1', toolCallId: 'tc-select' },
				{ type: 'tool-call', responseId: 'r1', toolCallId: 'tc-write' },
				{ type: 'text', responseId: 'r1', content: 'Done.' },
			],
		} as unknown as InstanceAiAgentNode;

		it('shows one card for the built Agent in the full view', () => {
			const { container } = renderComponent({ props: { agentNode: inThreadNode } });

			const names = cardNames(container);
			expect(names).toHaveLength(1);
			expect(names[0]).toContain('Support triage');
		});

		it('shows no card while the run is still building the Agent', () => {
			const { container } = renderComponent({
				props: { agentNode: { ...inThreadNode, status: 'active' } },
			});

			expect(cardNames(container)).toEqual([]);
		});

		it('shows a card for a created Agent when the run fails before it writes a config', () => {
			const failedNode = {
				...inThreadNode,
				status: 'error',
				toolCalls: inThreadNode.toolCalls.slice(0, 1),
				timeline: inThreadNode.timeline.slice(0, 1),
			} as InstanceAiAgentNode;

			const { container } = renderComponent({ props: { agentNode: failedNode } });

			expect(cardNames(container)).toHaveLength(1);
		});

		it('shows a card for an Agent that a questions-only finish setup changed', () => {
			const finishSetupNode = {
				...inThreadNode,
				toolCalls: [
					{
						toolCallId: 'tc-finish',
						toolName: 'agent_builder_finish_setup',
						args: {},
						isLoading: false,
						confirmation: { requestId: 'req-1', inputType: 'questions', questions: [] },
						result: {
							completed: true,
							configMutated: true,
							agentId: 'agent-new',
							agentName: 'Support triage',
							projectId: 'project-1',
						},
					},
				],
				timeline: [
					{ type: 'tool-call', responseId: 'r1', toolCallId: 'tc-finish' },
					{ type: 'text', responseId: 'r2', content: 'Done.' },
				],
			} as unknown as InstanceAiAgentNode;

			const { container } = renderComponent({ props: { agentNode: finishSetupNode } });

			const names = cardNames(container);
			expect(names).toHaveLength(1);
			expect(names[0]).toContain('Support triage');
		});

		it('hides the card on the page of the Agent it built', () => {
			const { container } = renderComponent({
				props: { agentNode: inThreadNode },
				global: {
					provide: {
						[INSTANCE_AI_EMBED_SUBJECT_KEY]: computed(() => ({
							type: 'agent' as const,
							id: 'agent-new',
							projectId: 'project-1',
						})),
					},
				},
			});

			expect(cardNames(container)).toEqual([]);
		});
	});
});
