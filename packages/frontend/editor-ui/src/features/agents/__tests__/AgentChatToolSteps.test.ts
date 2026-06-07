import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import AgentChatToolSteps from '../components/AgentChatToolSteps.vue';
import type { ToolCall } from '../composables/agentChatMessages';
import { TOOL_CALL_STATE } from '../constants';
import { DELEGATE_SUB_AGENT_TOOL_NAME } from '../utils/delegate-tool';
import { SEARCH_KNOWLEDGE_TOOL_NAME } from '../utils/toolDisplayName';
import { WRITE_TODOS_TOOL_NAME } from '../utils/write-todos-tool';

vi.mock('@n8n/design-system', () => ({
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
			if (key === 'agents.chat.writeTodos.label') return 'Task list';
			if (key === 'agents.chat.writeTodos.summary.one' && opts?.interpolate?.count) {
				return `${opts.interpolate.count} task`;
			}
			if (key === 'agents.chat.writeTodos.summary.other' && opts?.interpolate?.count) {
				return `${opts.interpolate.count} tasks`;
			}
			if (key === 'agents.chat.toolNames.searchKnowledge') return 'Search knowledge';
			if (key === 'agents.chat.toolStep.groupedCalls.other' && opts?.interpolate?.count) {
				return `${opts.interpolate.count} calls`;
			}
			const statusLabels: Record<string, string> = {
				'agents.chat.writeTodos.status.inProgress': 'In progress',
				'agents.chat.writeTodos.status.pending': 'Pending',
				'agents.chat.writeTodos.status.completed': 'Completed',
				'agents.chat.writeTodos.status.blocked': 'Blocked',
				'agents.chat.writeTodos.status.cancelled': 'Cancelled',
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

function mountSteps(toolCalls: ToolCall[]) {
	return mount(AgentChatToolSteps, {
		props: { toolCalls, projectId: 'project-1' },
	});
}

function searchKnowledgeCall(
	toolCallId: string,
	state: ToolCall['state'] = TOOL_CALL_STATE.DONE,
): ToolCall {
	return { tool: SEARCH_KNOWLEDGE_TOOL_NAME, toolCallId, state };
}

describe('AgentChatToolSteps', () => {
	it('groups consecutive search_knowledge calls into one visual row', () => {
		const wrapper = mountSteps([
			searchKnowledgeCall('sk-1'),
			searchKnowledgeCall('sk-2'),
			searchKnowledgeCall('sk-3'),
		]);

		expect(wrapper.findAll('li').length).toBe(1);
		expect(wrapper.text()).toContain('Search knowledge');
		expect(wrapper.find('[data-testid="tool-step-summary"]').text()).toContain('3 calls');
	});

	it('does not group search_knowledge calls separated by another tool', () => {
		const wrapper = mountSteps([
			searchKnowledgeCall('sk-1'),
			searchKnowledgeCall('sk-2'),
			{
				tool: 'search_nodes',
				toolCallId: 'nodes-1',
				state: TOOL_CALL_STATE.DONE,
			},
			searchKnowledgeCall('sk-3'),
			searchKnowledgeCall('sk-4'),
		]);

		expect(wrapper.findAll('li').length).toBe(3);
		const text = wrapper.text();
		expect((text.match(/Search knowledge/g) ?? []).length).toBe(2);
		expect(text).toContain('Search nodes');
		expect(wrapper.findAll('[data-testid="tool-step-summary"]').length).toBe(2);
	});

	it('does not show a count summary for a single search_knowledge call', () => {
		const wrapper = mountSteps([searchKnowledgeCall('sk-1')]);

		expect(wrapper.findAll('li').length).toBe(1);
		expect(wrapper.text()).toContain('Search knowledge');
		expect(wrapper.find('[data-testid="tool-step-summary"]').exists()).toBe(false);
	});

	it('uses the running indicator when a grouped search_knowledge run is still running', () => {
		const wrapper = mountSteps([
			searchKnowledgeCall('sk-1', TOOL_CALL_STATE.DONE),
			searchKnowledgeCall('sk-2', TOOL_CALL_STATE.RUNNING),
		]);

		expect(wrapper.find('[data-icon="spinner"]').exists()).toBe(true);
	});

	it('uses the error indicator when a grouped search_knowledge run contains an error', () => {
		const wrapper = mountSteps([
			searchKnowledgeCall('sk-1', TOOL_CALL_STATE.DONE),
			searchKnowledgeCall('sk-2', TOOL_CALL_STATE.ERROR),
		]);

		expect(wrapper.find('[data-icon="circle-x"]').exists()).toBe(true);
	});

	it('does not make generic tool steps expandable', () => {
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
		expect(wrapper.find('button').exists()).toBe(false);
		expect(wrapper.find('[data-test-id="tool-step-details"]').exists()).toBe(false);
	});

	it('expands write_todos output with label and plural summary', async () => {
		const wrapper = mountSteps([
			{
				tool: WRITE_TODOS_TOOL_NAME,
				toolCallId: 'tc-todos',
				state: TOOL_CALL_STATE.DONE,
				output: {
					status: 'ok',
					todoCount: 2,
					todos: [
						{ id: 'a', content: 'Research APIs', status: 'in_progress' },
						{ id: 'b', content: 'Write summary', status: 'pending' },
					],
				},
			},
		]);

		expect(wrapper.text()).toContain('Task list');
		expect(wrapper.find('[data-testid="tool-step-summary"]').text()).toContain('2 tasks');

		await wrapper.find('button').trigger('click');
		expect(wrapper.find('[data-test-id="tool-step-details"]').text()).toContain('Research APIs');
	});

	it('keeps delegate_subagent expandable behavior', async () => {
		const wrapper = mountSteps([
			{
				tool: DELEGATE_SUB_AGENT_TOOL_NAME,
				toolCallId: 'tc-delegate',
				state: TOOL_CALL_STATE.DONE,
				input: { subAgentId: 'inline', taskName: 'research_api' },
				output: { status: 'completed', answer: 'Child answer' },
			},
		]);

		expect(wrapper.text()).toContain('Sub-agent · Research api');

		await wrapper.find('button').trigger('click');
		expect(wrapper.find('[data-test-id="tool-step-details"]').text()).toBe('Child answer');
	});
});
