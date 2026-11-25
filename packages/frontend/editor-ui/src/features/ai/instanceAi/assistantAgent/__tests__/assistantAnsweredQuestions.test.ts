import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AnsweredQuestions from '@/features/ai/instanceAi/components/AnsweredQuestions.vue';
import { findToolResultRenderer } from '@/features/ai/shared/agentsChat/interactionRegistry';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';

import { assistantAnsweredQuestionsExtension } from '../assistantAnsweredQuestions';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

function toolCall(overrides: Partial<ToolCall> = {}): ToolCall {
	return {
		tool: 'ask_user',
		toolCallId: 'call-1',
		input: {},
		suspendPayload: {
			requestId: 'request-1',
			message: 'Which trigger?',
			severity: 'info',
			inputType: 'questions',
			questions: [
				{ id: 'q1', question: 'Which trigger?', type: 'single', options: ['Manual', 'Schedule'] },
				{ id: 'q2', question: 'Which name?', type: 'text' },
			],
		},
		output: {
			answered: true,
			answers: [
				{ questionId: 'q1', selectedOptions: ['Manual'] },
				{ questionId: 'q2', selectedOptions: [], skipped: true },
			],
		},
		state: 'done',
		...overrides,
	};
}

describe('assistantAnsweredQuestionsExtension', () => {
	it('renders a finished call that asked questions', () => {
		expect(findToolResultRenderer(toolCall(), [assistantAnsweredQuestionsExtension])).toEqual({
			key: 'assistant_answered_questions',
			component: assistantAnsweredQuestionsExtension.resultComponent,
		});
	});

	it('keeps a call that still waits for the answers as a card', () => {
		const waiting = toolCall({ state: 'suspended', output: undefined });
		expect(findToolResultRenderer(waiting, [assistantAnsweredQuestionsExtension])).toBeUndefined();
	});

	it('keeps a call that asked no questions as a step', () => {
		const approval = toolCall({
			suspendPayload: { requestId: 'request-1', message: 'Delete it?', severity: 'destructive' },
			output: { approved: true },
		});
		expect(findToolResultRenderer(approval, [assistantAnsweredQuestionsExtension])).toBeUndefined();
	});
});

describe('AnsweredQuestions', () => {
	it('shows each question with its answer, and marks a skipped question', () => {
		const wrapper = mount(AnsweredQuestions, { props: { toolCall: toolCall() } });

		const bubble = wrapper.find('[data-test-id="instance-ai-answered-questions"]');
		expect(bubble.text()).toContain('Which trigger?');
		expect(bubble.text()).toContain('Manual');
		expect(bubble.text()).toContain('Which name?');
		expect(bubble.text()).toContain('aiAssistant.builder.planMode.answers.skipped');
	});
});
