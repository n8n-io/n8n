import { describe, it, expect } from 'vitest';
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

	it('renders radio options for single-select question', () => {
		const { getByText } = render({ questions: [singleQuestion] });

		expect(getByText('Gmail')).toBeTruthy();
		expect(getByText('Outlook')).toBeTruthy();
		expect(getByText('SendGrid')).toBeTruthy();
	});

	it('filters out LLM "Other" option and renders frontend "Other" radio instead', () => {
		const questionWithOther: PlanMode.PlannerQuestion = {
			...singleQuestion,
			options: ['Gmail', 'Outlook', 'Other'],
		};
		const { getAllByRole } = render({ questions: [questionWithOther] });

		// LLM's "Other" is filtered out, but frontend always adds its own "Other" radio
		// So: Gmail + Outlook + frontend Other = 3 radios
		const radios = getAllByRole('radio');
		expect(radios).toHaveLength(3);
	});

	it('shows submit button on last question', () => {
		const { getByTestId } = render({ questions: [singleQuestion] });

		// Single question = last question, should show submit
		const button = getByTestId('plan-mode-questions-next');
		expect(button).toBeTruthy();
	});

	it('shows progress dots matching question count', () => {
		const multiQuestion: PlanMode.PlannerQuestion = {
			id: 'q2',
			question: 'What triggers?',
			type: 'multi',
			options: ['Schedule', 'Webhook'],
		};
		const { container } = render({
			questions: [singleQuestion, multiQuestion, textQuestion],
		});

		const dots = container.querySelectorAll('[class*="progressDot"]');
		expect(dots.length).toBe(3);
	});

	it('navigates to next question on Next click after selecting an option', async () => {
		const { getByText, getByTestId } = render({
			questions: [singleQuestion, textQuestion],
		});

		// Select an option first
		const gmailLabel = getByText('Gmail');
		await fireEvent.click(gmailLabel);

		// Click Next
		const nextButton = getByTestId('plan-mode-questions-next');
		await fireEvent.click(nextButton);

		// Should now show second question
		expect(getByText('Any other requirements?')).toBeTruthy();
	});

	it('emits submit with answers when completing last question', async () => {
		const { getByText, getByTestId, emitted } = render({
			questions: [singleQuestion],
		});

		// Select an option
		await fireEvent.click(getByText('Gmail'));

		// Click submit
		await fireEvent.click(getByTestId('plan-mode-questions-next'));

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

	it('disables buttons when disabled prop is true', () => {
		const { getByTestId } = render({
			questions: [singleQuestion],
			disabled: true,
		});

		const button = getByTestId('plan-mode-questions-next');
		expect(button.hasAttribute('disabled')).toBe(true);
	});

	it('shows Skip label when no answer is selected', () => {
		const { getByTestId } = render({
			questions: [singleQuestion, textQuestion],
		});

		const button = getByTestId('plan-mode-questions-next');
		expect(button.textContent?.trim()).toBe('Skip');
	});

	it('shows Next label after selecting an answer', async () => {
		const { getByText, getByTestId } = render({
			questions: [singleQuestion, textQuestion],
		});

		await fireEvent.click(getByText('Gmail'));

		const button = getByTestId('plan-mode-questions-next');
		expect(button.textContent?.trim()).toBe('Next');
	});

	it('allows skipping a question without answering and marks it as skipped', async () => {
		const { getByTestId, emitted } = render({
			questions: [singleQuestion],
		});

		// Click skip without selecting any option
		await fireEvent.click(getByTestId('plan-mode-questions-next'));

		expect(emitted().submit).toHaveLength(1);
		expect(emitted().submit[0]).toEqual([
			[
				expect.objectContaining({
					questionId: 'q1',
					skipped: true,
					selectedOptions: [],
				}),
			],
		]);
	});

	it('navigates to next question when skipping without an answer', async () => {
		const { getByText, getByTestId } = render({
			questions: [singleQuestion, textQuestion],
		});

		// Click Skip without answering
		await fireEvent.click(getByTestId('plan-mode-questions-next'));

		// Should now show second question
		expect(getByText('Any other requirements?')).toBeTruthy();
	});
});
