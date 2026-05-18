import type { IconName } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';
import { fireEvent } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import InstanceAiPromptSuggestionsV2 from './InstanceAiPromptSuggestionsV2.vue';

interface TestPromptSuggestion {
	id: string;
	icon: IconName;
	labelKey: BaseTextKey;
	promptKey: BaseTextKey;
}

const suggestions = [
	{
		id: 'build-workflow',
		icon: 'workflow',
		labelKey: 'instanceAi.emptyState.suggestions.buildWorkflow.label',
		promptKey: 'instanceAi.emptyState.suggestions.buildWorkflow.prompt',
	},
	{
		id: 'build-agent',
		icon: 'bot',
		labelKey: 'instanceAi.emptyState.suggestions.buildAgent.label',
		promptKey: 'instanceAi.emptyState.suggestions.buildAgent.prompt',
	},
	{
		id: 'find-automation-ideas',
		icon: 'lightbulb',
		labelKey: 'instanceAi.emptyState.suggestions.findAutomationIdeas.label',
		promptKey: 'instanceAi.emptyState.suggestions.findAutomationIdeas.prompt',
	},
	{
		id: 'monitor-competitors',
		icon: 'rss',
		labelKey: 'instanceAi.emptyState.quickExamples.monitorCompetitors.label',
		promptKey: 'instanceAi.emptyState.quickExamples.monitorCompetitors.prompt',
	},
	{
		id: 'automate-inbox',
		icon: 'inbox',
		labelKey: 'instanceAi.emptyState.quickExamples.automateInbox.label',
		promptKey: 'instanceAi.emptyState.quickExamples.automateInbox.prompt',
	},
	{
		id: 'answer-support-requests',
		icon: 'mail',
		labelKey: 'instanceAi.emptyState.quickExamples.answerSupportRequests.label',
		promptKey: 'instanceAi.emptyState.quickExamples.answerSupportRequests.prompt',
	},
	{
		id: 'answer-questions',
		icon: 'bot',
		labelKey: 'instanceAi.emptyState.quickExamples.analyseAdSpend.label',
		promptKey: 'instanceAi.emptyState.quickExamples.analyseAdSpend.prompt',
	},
	{
		id: 'monitor-inventory',
		icon: 'clipboard-list',
		labelKey: 'instanceAi.emptyState.quickExamples.getNewsSummary.label',
		promptKey: 'instanceAi.emptyState.quickExamples.getNewsSummary.prompt',
	},
] satisfies readonly TestPromptSuggestion[];

const renderComponent = createComponentRenderer(InstanceAiPromptSuggestionsV2, {
	props: {
		suggestions,
		disabled: false,
	},
});

describe('InstanceAiPromptSuggestionsV2', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders the first four prompt suggestions followed by the cycle button', () => {
		const { getAllByRole, getByLabelText } = renderComponent();

		const buttons = getAllByRole('button');

		expect(buttons).toHaveLength(5);
		expect(buttons.slice(0, 4).map((button) => button.textContent)).toEqual([
			'Build a workflow',
			'Build an agent',
			'Find inspiration',
			'Track competitor news',
		]);
		expect(buttons[4]).toBe(getByLabelText('Show more prompt suggestions'));
	});

	it('adds stagger indexes for enter and leave animations', () => {
		const { getAllByRole } = renderComponent();

		const buttons = getAllByRole('button');

		expect(buttons.map((button) => button.style.getPropertyValue('--suggestion-index'))).toEqual([
			'0',
			'1',
			'2',
			'3',
			'4',
		]);
		expect(buttons.map((button) => button.style.getPropertyValue('--suggestion-count'))).toEqual([
			'5',
			'5',
			'5',
			'5',
			'5',
		]);
	});

	it('cycles through prompt suggestions in groups of four and wraps', async () => {
		const { getAllByRole, getByLabelText } = renderComponent();

		await fireEvent.click(getByLabelText('Show more prompt suggestions'));

		expect(
			getAllByRole('button')
				.slice(0, 4)
				.map((button) => button.textContent),
		).toEqual([
			'Automate my inbox',
			'Summarize and route requests',
			'Answer questions with an agent',
			'Monitor inventory levels',
		]);

		await fireEvent.click(getByLabelText('Show more prompt suggestions'));

		expect(
			getAllByRole('button')
				.slice(0, 4)
				.map((button) => button.textContent),
		).toEqual(['Build a workflow', 'Build an agent', 'Find inspiration', 'Track competitor news']);
	});

	it('emits preview changes on focus and delayed hover, then clears on blur, leave, cycle, and insert', async () => {
		const { emitted, getByLabelText, getByTestId } = renderComponent();

		await fireEvent.focus(getByTestId('instance-ai-suggestion-build-workflow'));
		await fireEvent.blur(getByTestId('instance-ai-suggestion-build-workflow'));
		await fireEvent.mouseEnter(getByTestId('instance-ai-suggestion-build-agent'));
		await vi.advanceTimersByTimeAsync(299);

		expect(emitted()['preview-change']).toEqual([
			['instanceAi.emptyState.suggestions.buildWorkflow.prompt'],
			[null],
		]);

		await vi.advanceTimersByTimeAsync(1);
		await fireEvent.mouseLeave(getByTestId('instance-ai-suggestion-build-agent'));
		await fireEvent.click(getByLabelText('Show more prompt suggestions'));
		await fireEvent.focus(getByTestId('instance-ai-suggestion-answer-support-requests'));
		await fireEvent.click(getByTestId('instance-ai-suggestion-answer-support-requests'));

		expect(emitted()['preview-change']).toEqual([
			['instanceAi.emptyState.suggestions.buildWorkflow.prompt'],
			[null],
			['instanceAi.emptyState.suggestions.buildAgent.prompt'],
			[null],
			[null],
			['instanceAi.emptyState.quickExamples.answerSupportRequests.prompt'],
			[null],
		]);
	});

	it('emits the prompt insert payload with the absolute catalog position', async () => {
		const { emitted, getByLabelText, getByTestId } = renderComponent();

		await fireEvent.click(getByLabelText('Show more prompt suggestions'));
		await fireEvent.click(getByTestId('instance-ai-suggestion-answer-support-requests'));

		expect(emitted()['insert-suggestion']).toEqual([
			[
				{
					promptKey: 'instanceAi.emptyState.quickExamples.answerSupportRequests.prompt',
					suggestionId: 'answer-support-requests',
					suggestionKind: 'prompt',
					position: 6,
				},
			],
		]);
		expect(emitted()['submit-suggestion']).toBeUndefined();
	});
});
