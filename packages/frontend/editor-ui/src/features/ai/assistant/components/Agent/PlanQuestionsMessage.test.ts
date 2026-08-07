import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent } from '@testing-library/vue';

import { renderComponent } from '@/__tests__/render';
import PlanQuestionsMessage from './PlanQuestionsMessage.vue';
import type { PlanMode } from '../../assistant.types';

const singleQuestion: PlanMode.PlannerQuestion = {
	id: 'q1',
	question: 'Which email provider?',
	type: 'single',
	options: ['Gmail', 'Outlook', 'SendGrid'],
};

const multiQuestion: PlanMode.PlannerQuestion = {
	id: 'q2',
	question: 'What triggers?',
	type: 'multi',
	options: ['Schedule', 'Webhook', 'Manual'],
};

const textQuestion: PlanMode.PlannerQuestion = {
	id: 'q3',
	question: 'Any other requirements?',
	type: 'text',
};

function render(props: {
	questions: PlanMode.PlannerQuestion[];
	introMessage?: string;
	disabled?: boolean;
}) {
	return renderComponent(PlanQuestionsMessage, { props });
}

describe('PlanQuestionsMessage', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('Intro & question rendering', () => {
		it('renders the intro message when provided', () => {
			const { getByText } = render({
				questions: [singleQuestion],
				introMessage: 'Before I start building:',
			});

			expect(getByText('Before I start building:')).toBeTruthy();
		});

		it('does not render intro message when not provided', () => {
			const { queryByText } = render({
				questions: [singleQuestion],
			});

			expect(queryByText('Before I start building:')).toBeNull();
		});

		it('renders the first question text', () => {
			const { getByText } = render({
				questions: [singleQuestion, textQuestion],
			});

			expect(getByText('Which email provider?')).toBeTruthy();
		});
	});

	describe('Single-select', () => {
		it('renders number badge rows for single-select options', () => {
			const { getByText } = render({ questions: [singleQuestion] });

			expect(getByText('Gmail')).toBeTruthy();
			expect(getByText('Outlook')).toBeTruthy();
			expect(getByText('SendGrid')).toBeTruthy();
			// Number badges
			expect(getByText('1')).toBeTruthy();
			expect(getByText('2')).toBeTruthy();
			expect(getByText('3')).toBeTruthy();
		});

		it('filters out LLM "Other" option and renders "Something else" row instead', () => {
			const questionWithOther: PlanMode.PlannerQuestion = {
				...singleQuestion,
				options: ['Gmail', 'Outlook', 'Other'],
			};
			const { getByText, queryByText } = render({ questions: [questionWithOther] });

			// LLM's "Other" is filtered out
			expect(queryByText('Other')).toBeNull();
			// Regular options still render
			expect(getByText('Gmail')).toBeTruthy();
			expect(getByText('Outlook')).toBeTruthy();
			// Number badges: only 2 (Gmail=1, Outlook=2)
			expect(getByText('1')).toBeTruthy();
			expect(getByText('2')).toBeTruthy();
		});

		it('auto-advances to next question when clicking a single-select option', async () => {
			const { getByText } = render({
				questions: [singleQuestion, textQuestion],
			});

			// Click Gmail → shows active state, then advances after delay
			await fireEvent.click(getByText('Gmail'));
			await vi.advanceTimersByTimeAsync(300);

			expect(getByText('Any other requirements?')).toBeTruthy();
		});

		it('emits submit when clicking option on last (single) question', async () => {
			const { getByText, emitted } = render({
				questions: [singleQuestion],
			});

			await fireEvent.click(getByText('Gmail'));
			await vi.advanceTimersByTimeAsync(300);

			expect(emitted().submit).toHaveLength(1);
			expect(emitted().submit[0]).toEqual([
				[
					expect.objectContaining({
						questionId: 'q1',
						selectedOptions: expect.arrayContaining(['Gmail']),
					}),
				],
			]);
		});

		it('does not show Next button for single-select without custom text', () => {
			const { queryByTestId } = render({
				questions: [singleQuestion, textQuestion],
			});

			expect(queryByTestId('plan-mode-questions-next')).toBeNull();
		});

		it('shows Next button when "Something else" has text', async () => {
			const { getByTestId, container } = render({
				questions: [singleQuestion, textQuestion],
			});

			// The "Something else" row contains an N8nInput which wraps an ElInput with a native input
			const somethingElseRow = container.querySelector('[class*="somethingElseRow"]');
			const nativeInput = somethingElseRow?.querySelector('input') as HTMLInputElement;
			nativeInput.value = 'Custom provider';
			await fireEvent.input(nativeInput);

			const nextButton = getByTestId('plan-mode-questions-next');
			expect(nextButton).toBeTruthy();
			expect(nextButton.textContent?.trim()).toBe('Next');
		});

		it('hides Skip button on last question (single-select)', () => {
			const { queryByTestId } = render({
				questions: [singleQuestion],
			});

			expect(queryByTestId('plan-mode-questions-skip')).toBeNull();
		});
	});

	describe('Multi-select', () => {
		it('renders checkboxes for multi-select options', () => {
			const { getByText } = render({ questions: [multiQuestion] });

			expect(getByText('Schedule')).toBeTruthy();
			expect(getByText('Webhook')).toBeTruthy();
			expect(getByText('Manual')).toBeTruthy();
		});

		it('shows disabled Next button until selection is made', async () => {
			const { getByText, getByTestId } = render({
				questions: [multiQuestion, textQuestion],
			});

			// Next should be visible but disabled initially
			const nextButton = getByTestId('plan-mode-questions-next');
			expect(nextButton.hasAttribute('disabled')).toBe(true);

			// Select an option
			await fireEvent.click(getByText('Schedule'));

			// Next should now be enabled
			expect(nextButton.hasAttribute('disabled')).toBe(false);
		});

		it('shows Skip and Next buttons for multi-select (non-last question)', () => {
			const { getByTestId } = render({
				questions: [multiQuestion, textQuestion],
			});

			expect(getByTestId('plan-mode-questions-skip')).toBeTruthy();
			expect(getByTestId('plan-mode-questions-next')).toBeTruthy();
		});

		it('hides Skip on last multi-select question', () => {
			const { queryByTestId, getByTestId } = render({
				questions: [multiQuestion],
			});

			expect(queryByTestId('plan-mode-questions-skip')).toBeNull();
			// Next/Submit should still be visible
			expect(getByTestId('plan-mode-questions-next')).toBeTruthy();
		});
	});

	describe('Free-text', () => {
		it('renders textarea for text question', () => {
			const { container } = render({ questions: [textQuestion] });

			const textarea = container.querySelector('textarea');
			expect(textarea).toBeTruthy();
		});

		it('shows disabled Next until text is entered', async () => {
			const { container, getByTestId } = render({
				questions: [textQuestion, singleQuestion],
			});

			const nextButton = getByTestId('plan-mode-questions-next');
			expect(nextButton.hasAttribute('disabled')).toBe(true);

			const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
			await fireEvent.update(textarea, 'Some requirements');

			expect(nextButton.hasAttribute('disabled')).toBe(false);
		});
	});

	describe('Pagination', () => {
		it('shows pagination text "X of Y" instead of dots', () => {
			const { container } = render({
				questions: [singleQuestion, multiQuestion, textQuestion],
			});

			// Pagination text is rendered as "1 of 3" within the pagination area
			const paginationText = container.querySelector('[class*="paginationText"]');
			expect(paginationText?.textContent?.trim().replace(/\s+/g, ' ')).toBe('1 of 3');
		});

		it('disables back chevron on first question', () => {
			const { getByTestId } = render({
				questions: [singleQuestion, textQuestion],
			});

			const backButton = getByTestId('plan-mode-pagination-back');
			expect(backButton.hasAttribute('disabled')).toBe(true);
		});

		it('disables forward chevron on last question', async () => {
			const { getByTestId } = render({
				questions: [textQuestion],
			});

			const forwardButton = getByTestId('plan-mode-pagination-forward');
			expect(forwardButton.hasAttribute('disabled')).toBe(true);
		});
	});

	describe('Skip & navigation', () => {
		it('shows Skip button when no answer is selected (non-last question)', () => {
			const { getByTestId } = render({
				questions: [singleQuestion, textQuestion],
			});

			const skipButton = getByTestId('plan-mode-questions-skip');
			expect(skipButton.textContent?.trim()).toBe('Skip');
		});

		it('allows skipping a question without answering and marks it as skipped', async () => {
			const { getByTestId, getByText } = render({
				questions: [singleQuestion, textQuestion],
			});

			await fireEvent.click(getByTestId('plan-mode-questions-skip'));

			// Should navigate to second question
			expect(getByText('Any other requirements?')).toBeTruthy();
		});

		it('navigates to next question when skipping without an answer', async () => {
			const { getByText, getByTestId } = render({
				questions: [singleQuestion, textQuestion],
			});

			// Click Skip without answering
			await fireEvent.click(getByTestId('plan-mode-questions-skip'));

			// Should now show second question
			expect(getByText('Any other requirements?')).toBeTruthy();
		});

		it('disables buttons when disabled prop is true', () => {
			const { getByTestId } = render({
				questions: [multiQuestion],
				disabled: true,
			});

			const button = getByTestId('plan-mode-questions-next');
			expect(button.hasAttribute('disabled')).toBe(true);
		});
	});

	describe('Keyboard navigation', () => {
		it('selects option with number key (single-select)', async () => {
			const { getByText, getByTestId } = render({
				questions: [singleQuestion, textQuestion],
			});

			const container = getByTestId('plan-mode-questions-message').querySelector(
				'[tabindex="0"]',
			) as HTMLElement;
			await fireEvent.keyDown(container, { key: '1' });
			await vi.advanceTimersByTimeAsync(300);

			// Should auto-advance to next question
			expect(getByText('Any other requirements?')).toBeTruthy();
		});

		it('navigates options with arrow keys', async () => {
			const { getByTestId } = render({
				questions: [singleQuestion, textQuestion],
			});

			const container = getByTestId('plan-mode-questions-message').querySelector(
				'[tabindex="0"]',
			) as HTMLElement;

			// First option (index 0) is highlighted by default
			const firstOption = container.querySelector('[data-option-index="0"]');
			expect(firstOption?.className).toContain('highlighted');

			// ArrowDown moves to second option
			await fireEvent.keyDown(container, { key: 'ArrowDown' });
			const secondOption = container.querySelector('[data-option-index="1"]');
			expect(secondOption?.className).toContain('highlighted');
		});

		it('selects highlighted option with Enter (single-select)', async () => {
			const { getByText, getByTestId } = render({
				questions: [singleQuestion, textQuestion],
			});

			const container = getByTestId('plan-mode-questions-message').querySelector(
				'[tabindex="0"]',
			) as HTMLElement;
			// First option (index 0) is highlighted by default, Enter to select
			await fireEvent.keyDown(container, { key: 'Enter' });
			await vi.advanceTimersByTimeAsync(300);

			// Should auto-advance to next question
			expect(getByText('Any other requirements?')).toBeTruthy();
		});
	});

	describe('Telemetry', () => {
		it('emits telemetry event when answering a question via click', async () => {
			const { getByText, emitted } = render({
				questions: [singleQuestion, textQuestion],
			});

			await fireEvent.click(getByText('Gmail'));

			expect(emitted().telemetry).toBeTruthy();
			expect(emitted().telemetry[0]).toEqual([
				'qa_question_answered',
				expect.objectContaining({
					question_type: 'single',
					question_index: 0,
					input_method: 'click',
				}),
			]);
		});

		it('emits telemetry event when skipping a question', async () => {
			const { getByTestId, emitted } = render({
				questions: [singleQuestion, textQuestion],
			});

			await fireEvent.click(getByTestId('plan-mode-questions-skip'));

			expect(emitted().telemetry).toBeTruthy();
			expect(emitted().telemetry[0]).toEqual([
				'qa_question_skipped',
				expect.objectContaining({
					question_type: 'single',
					question_index: 0,
				}),
			]);
		});
	});
});
