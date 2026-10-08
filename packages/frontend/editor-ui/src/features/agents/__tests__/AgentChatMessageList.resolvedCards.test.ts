import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import { makeProposal } from '@/features/ai/instanceAi/components/automation/__tests__/automationProposalFixtures';
import { rebuildInteractiveFromHistory } from '@/features/ai/shared/agentsChat/messageMappers';
import type { ChatMessage, ToolCall } from '@/features/ai/shared/agentsChat/types';
import AgentChatMessageList from '../components/AgentChatMessageList.vue';

vi.mock('@n8n/design-system', () => ({
	N8nButton: { template: '<button v-bind="$attrs"><slot /></button>' },
	N8nCallout: { template: '<div v-bind="$attrs"><slot /></div>' },
	N8nIcon: { template: '<i />' },
	N8nIconButton: { template: '<button v-bind="$attrs" />' },
	N8nText: { template: '<span v-bind="$attrs"><slot /></span>' },
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/features/agents/components/AgentMarkdownChunk.vue', () => ({
	default: { template: '<div data-testid="markdown-chunk">{{ source }}</div>', props: ['source'] },
}));

vi.mock('@/features/agents/components/AgentChatToolSteps.vue', () => ({
	default: { template: '<div data-testid="tool-steps" />', props: ['toolCalls'] },
}));

vi.mock('@/features/agents/components/interactive/InteractiveCard.vue', () => ({
	default: {
		template: '<div data-testid="interactive-card">{{ payload.toolCallId }}</div>',
		props: ['payload'],
	},
}));

vi.mock('@/features/agents/components/AgentChatMessageActions.vue', () => ({
	default: { template: '<div />', props: ['content'] },
}));

/** The suspend payload of `propose_automation`, as the server sends it. */
const automationSuspend = {
	requestId: 'req-auto',
	message: 'Want "Morning digest" to run automatically?',
	severity: 'info',
	capability: true,
	automationProposal: makeProposal(),
};

const TURN_ON = { kind: 'capabilityDecision', approved: true, values: { activate: true } };
const TOOL_RESULT = { workflowId: 'wf-1', url: '/workflow/wf-1', active: true, kept: true };

/** An answered call. Its output is the answer in the live chat, and the result after a reload. */
function answeredCall(tool: string, suspendPayload: unknown, output: unknown): ToolCall {
	return { tool, toolCallId: `tc-${tool}`, state: 'done', suspendPayload, output, input: {} };
}

function renderedCards(calls: ToolCall[]): string[] {
	const message: ChatMessage = {
		id: 'assistant-1',
		role: 'assistant',
		content: 'Done.',
		toolCalls: calls,
		interactives: calls.flatMap((call) => rebuildInteractiveFromHistory(call) ?? []),
		status: 'success',
	};
	const wrapper = mount(AgentChatMessageList, {
		props: { messages: [message], messagingState: 'idle' },
	});
	return wrapper.findAll('[data-testid="interactive-card"]').map((card) => card.text());
}

describe('AgentChatMessageList — answered Assistant cards', () => {
	it('keeps an automation card that the user answered in this session', () => {
		const call = answeredCall('propose_automation', automationSuspend, TURN_ON);

		expect(renderedCards([call])).toEqual(['tc-propose_automation']);
	});

	it('hides the automation card after a reload, when its value is the tool result', () => {
		const call = answeredCall('propose_automation', automationSuspend, TOOL_RESULT);

		expect(renderedCards([call])).toEqual([]);
	});

	it('still hides other answered Assistant cards, also capability cards', () => {
		const questions = answeredCall(
			'ask-user',
			{ requestId: 'req-q', message: 'Which one?', inputType: 'questions', questions: [] },
			{ kind: 'questions', answers: [] },
		);
		const capability = answeredCall(
			'executions',
			{ requestId: 'req-run', message: 'Run it?', severity: 'info', capability: true },
			{ kind: 'capabilityDecision', approved: true },
		);

		expect(renderedCards([questions, capability])).toEqual([]);
	});
});
