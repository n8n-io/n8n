import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import AgentChatToolSteps from '../components/AgentChatToolSteps.vue';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import { TOOL_CALL_STATE } from '../constants';
import { DELEGATE_SUB_AGENT_TOOL_NAME } from '../utils/delegate-tool';
import { WRITE_TODOS_TOOL_NAME } from '../utils/write-todos-tool';

vi.mock('@n8n/design-system', () => ({
	N8nAiActivityStep: {
		props: ['label', 'hasContent', 'loading', 'error', 'hideErrorCallout'],
		data: () => ({ isOpen: false }),
		computed: {
			labelParts(this: { label: string }): string[] {
				return this.label.split(' · ');
			},
		},
		template: `
			<div>
				<button v-if="hasContent" type="button" @click="isOpen = !isOpen">
					{{ labelParts[0] }}
				</button>
				<span v-else>{{ labelParts[0] }}</span>
				<template v-for="part in labelParts.slice(1)" :key="part">
					<span> · </span>
					<span data-testid="tool-step-summary">{{ part }}</span>
				</template>
				<div v-if="error && !hideErrorCallout" data-test-id="tool-step-error">{{ error }}</div>
				<div v-if="isOpen"><slot /></div>
			</div>
		`,
	},
	N8nAiActivityStepGroup: {
		props: ['label', 'size', 'loading'],
		template: '<div data-test-id="n8n-ai-activity-step-group"><slot /></div>',
	},
	N8nButton: {
		props: ['size', 'variant'],
		emits: ['click'],
		template:
			'<button type="button" @click.stop="$emit(\'click\')"><slot name="icon" /><slot /></button>',
	},
	N8nCallout: {
		props: ['theme'],
		template: '<div><slot /><slot name="trailingContent" /></div>',
	},
	N8nIcon: {
		template: '<i :data-icon="icon" />',
		props: ['icon', 'size', 'spin'],
	},
	N8nMarkdownEditor: {
		template: '<div data-test-id="tool-step-details">{{ modelValue }}</div>',
		props: ['modelValue', 'readonly', 'variant', 'showToolbar', 'maxHeight'],
	},
	N8nTooltip: { template: '<div><slot /></div>', props: ['content', 'placement'] },
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, opts?: { interpolate?: { name?: string; count?: string } }) => {
			if (key === 'agents.chat.delegate.label' && opts?.interpolate?.name) {
				return `Sub-agent · ${opts.interpolate.name}`;
			}
			if (key === 'agents.chat.delegate.labelFallback') return 'Sub-agent';
			if (key === 'agents.chat.writeTodos.label') return 'Task list';
			if (key === 'agents.chat.writeTodos.summary.one' && opts?.interpolate?.count) {
				return `${opts.interpolate.count} task`;
			}
			if (key === 'agents.chat.writeTodos.summary.other' && opts?.interpolate?.count) {
				return `${opts.interpolate.count} tasks`;
			}
			if (key === 'agents.chat.writeTodos.summary.done') return 'done';
			const statusLabels: Record<string, string> = {
				'agents.chat.difficulty.low': 'Low',
				'agents.chat.difficulty.medium': 'Medium',
				'agents.chat.difficulty.high': 'High',
				'agents.chat.writeTodos.status.inProgress': 'In progress',
				'agents.chat.writeTodos.status.pending': 'Pending',
				'agents.chat.writeTodos.status.completed': 'Completed',
				'agents.chat.writeTodos.status.blocked': 'Blocked',
				'agents.chat.writeTodos.status.cancelled': 'Cancelled',
				'agents.chat.writeTodos.hint.difficulty': 'Difficulty',
				'agents.chat.writeTodos.hint.subAgent': 'Sub-agent',
				'agents.chat.writeTodos.hint.expectedOutput': 'Expected output',
			};
			return statusLabels[key] ?? key;
		},
	}),
}));

vi.mock('../composables/useSubAgentNames', () => ({
	useSubAgentNames: () => ({ subAgentNameById: { value: new Map() } }),
}));

function mountSteps(
	toolCalls: ToolCall[],
	extra: { canFixWithAssistant?: boolean; executionId?: string } = {},
) {
	return mount(AgentChatToolSteps, {
		props: { toolCalls, projectId: 'project-1', ...extra },
	});
}

describe('AgentChatToolSteps', () => {
	it('makes generic tool steps with output data expandable', async () => {
		const wrapper = mountSteps([
			{
				tool: 'search_nodes',
				toolCallId: 'tc-1',
				state: TOOL_CALL_STATE.DONE,
				output: { nodes: ['Slack'] },
			},
		]);

		expect(wrapper.text()).toContain('Search nodes');
		expect(wrapper.find('[data-testid="tool-step-summary"]').exists()).toBe(false);
		expect(wrapper.find('button').exists()).toBe(true);

		await wrapper.find('button').trigger('click');
		expect(wrapper.text()).toContain('Slack');
	});

	it('does not make generic tool steps without data expandable', () => {
		const wrapper = mountSteps([
			{
				tool: 'search_nodes',
				toolCallId: 'tc-2',
				state: TOOL_CALL_STATE.DONE,
			},
		]);

		expect(wrapper.text()).toContain('Search nodes');
		expect(wrapper.find('button').exists()).toBe(false);
	});

	it('shows Fix with Assistant only for errored tools when handoff is enabled', async () => {
		const errored: ToolCall = {
			tool: 'search_nodes',
			toolCallId: 'tc-err',
			state: TOOL_CALL_STATE.ERROR,
			output: 'Tool failed',
		};

		const withoutFix = mountSteps([errored]);
		expect(withoutFix.find('[data-test-id="agent-chat-tool-fix-with-assistant"]').exists()).toBe(
			false,
		);

		const withoutExecutionId = mountSteps([errored], { canFixWithAssistant: true });
		expect(
			withoutExecutionId.find('[data-test-id="agent-chat-tool-fix-with-assistant"]').exists(),
		).toBe(false);

		const doneTool = mountSteps(
			[{ ...errored, state: TOOL_CALL_STATE.DONE, toolCallId: 'tc-ok' }],
			{ canFixWithAssistant: true, executionId: 'exec-1' },
		);
		expect(doneTool.find('[data-test-id="agent-chat-tool-fix-with-assistant"]').exists()).toBe(
			false,
		);

		const withFix = mountSteps([errored], {
			canFixWithAssistant: true,
			executionId: 'exec-1',
		});
		expect(
			withFix.find('[data-test-id="agent-chat-tool-fix-with-assistant-callout"]').exists(),
		).toBe(true);
		await withFix.find('[data-test-id="agent-chat-tool-fix-with-assistant"]').trigger('click');
		expect(withFix.emitted('fixWithAssistant')?.length).toBeGreaterThanOrEqual(1);
	});

	it('shows a generic error when the failed tool output is empty', () => {
		const wrapper = mountSteps([
			{
				tool: 'search_nodes',
				toolCallId: 'tc-err',
				state: TOOL_CALL_STATE.ERROR,
				output: {},
			},
		]);

		expect(wrapper.find('[data-test-id="tool-step-error"]').text()).toBe(
			'agents.chat.toolError.generic',
		);
		expect(wrapper.text()).not.toContain('{}');
	});

	it('shows Fix with Assistant outside the tool group when a multi-tool turn has an error', () => {
		const wrapper = mountSteps(
			[
				{
					tool: 'search_nodes',
					toolCallId: 'tc-ok',
					state: TOOL_CALL_STATE.DONE,
					output: { nodes: ['Slack'] },
				},
				{
					tool: 'search_nodes',
					toolCallId: 'tc-err',
					state: TOOL_CALL_STATE.ERROR,
					output: 'Tool failed',
				},
			],
			{ canFixWithAssistant: true, executionId: 'exec-1' },
		);

		expect(wrapper.find('[data-test-id="agent-chat-tool-fix-with-assistant"]').exists()).toBe(true);

		const group = wrapper.find('[data-test-id="n8n-ai-activity-step-group"]');
		expect(group.exists()).toBe(true);
		expect(group.find('[data-test-id="agent-chat-tool-fix-with-assistant-callout"]').exists()).toBe(
			false,
		);
		expect(
			wrapper.find('[data-test-id="agent-chat-tool-fix-with-assistant-callout"]').exists(),
		).toBe(true);
	});

	it('shows incomplete task count in write_todos summary', async () => {
		const wrapper = mountSteps([
			{
				tool: WRITE_TODOS_TOOL_NAME,
				toolCallId: 'tc-todos',
				state: TOOL_CALL_STATE.DONE,
				output: {
					status: 'ok',
					todoCount: 3,
					todos: [
						{ id: 'a', content: 'Research APIs', status: 'in_progress', difficulty: 'high' },
						{ id: 'b', content: 'Write summary', status: 'pending', difficulty: 'medium' },
						{ id: 'c', content: 'Ship release', status: 'completed', difficulty: 'low' },
					],
				},
			},
		]);

		expect(wrapper.text()).toContain('Task list');
		expect(wrapper.text()).toContain('·');
		expect(wrapper.find('[data-testid="tool-step-summary"]').text()).toContain('2 tasks');
		expect(wrapper.find('[data-testid="tool-step-summary"]').text()).not.toContain('3 tasks');

		await wrapper.find('button').trigger('click');
		expect(wrapper.find('[data-test-id="tool-step-details"]').text()).toContain('Research APIs');
	});

	it('shows done summary when all write_todos tasks are completed', async () => {
		const wrapper = mountSteps([
			{
				tool: WRITE_TODOS_TOOL_NAME,
				toolCallId: 'tc-todos-done',
				state: TOOL_CALL_STATE.DONE,
				output: {
					status: 'ok',
					todoCount: 2,
					todos: [
						{ id: 'a', content: 'Research APIs', status: 'completed', difficulty: 'high' },
						{ id: 'b', content: 'Write summary', status: 'completed', difficulty: 'medium' },
					],
				},
			},
		]);

		expect(wrapper.text()).toContain('Task list');
		expect(wrapper.text()).toContain('·');
		expect(wrapper.find('[data-testid="tool-step-summary"]').text()).toContain('done');

		await wrapper.find('button').trigger('click');
		expect(wrapper.find('[data-test-id="tool-step-details"]').text()).toContain('Research APIs');
		expect(wrapper.find('[data-test-id="tool-step-details"]').text()).toContain('Write summary');
	});

	it('keeps delegate_subagent expandable behavior', async () => {
		const wrapper = mountSteps([
			{
				tool: DELEGATE_SUB_AGENT_TOOL_NAME,
				toolCallId: 'tc-delegate',
				state: TOOL_CALL_STATE.DONE,
				input: { subAgentId: 'inline', taskName: 'research_api', difficulty: 'high' },
				output: {
					status: 'completed',
					answer: 'Child answer',
					model: 'anthropic/claude-haiku-4-5',
				},
			},
		]);

		expect(wrapper.text()).toContain('Sub-agent');
		expect(wrapper.text()).toContain('·');
		const metadata = wrapper
			.findAll('[data-testid="tool-step-summary"]')
			.map((item) => item.text());
		expect(metadata).toEqual(['Research api', 'High']);

		await wrapper.find('button').trigger('click');
		expect(wrapper.find('[data-test-id="tool-step-details"]').text()).toBe('Child answer');
	});
});
