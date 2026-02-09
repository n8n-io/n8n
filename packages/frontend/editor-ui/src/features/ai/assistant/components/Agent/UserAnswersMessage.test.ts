import { describe, it, expect } from 'vitest';

import { renderComponent } from '@/__tests__/render';
import UserAnswersMessage from './UserAnswersMessage.vue';
import type { PlanMode } from '../../assistant.types';

const answeredQuestions: PlanMode.QuestionResponse[] = [
	{
		questionId: 'q1',
		question: 'Which email provider?',
		selectedOptions: ['Gmail'],
	},
	{
		questionId: 'q2',
		question: 'What trigger type?',
		selectedOptions: ['Schedule', 'Webhook'],
		customText: 'preferably every morning',
	},
];

function render(answers: PlanMode.QuestionResponse[]) {
	return renderComponent(UserAnswersMessage, { props: { answers } });
}

describe('UserAnswersMessage', () => {
	it('renders answered questions with their responses', () => {
		const { getByText } = render(answeredQuestions);

		expect(getByText('Which email provider?')).toBeTruthy();
		expect(getByText('Gmail')).toBeTruthy();
		expect(getByText('What trigger type?')).toBeTruthy();
		expect(getByText('Schedule, Webhook, preferably every morning')).toBeTruthy();
	});

	it('filters out skipped questions', () => {
		const withSkipped: PlanMode.QuestionResponse[] = [
			...answeredQuestions,
			{
				questionId: 'q3',
				question: 'Skipped question',
				selectedOptions: [],
				skipped: true,
			},
		];

		const { queryByText } = render(withSkipped);

		expect(queryByText('Skipped question')).toBeNull();
	});

	it('renders nothing when all questions are skipped', () => {
		const allSkipped: PlanMode.QuestionResponse[] = [
			{
				questionId: 'q1',
				question: 'Test?',
				selectedOptions: [],
				skipped: true,
			},
		];

		const { queryByTestId } = render(allSkipped);

		expect(queryByTestId('plan-mode-user-answers')).toBeNull();
	});

	it('renders the data-test-id on the container', () => {
		const { getByTestId } = render(answeredQuestions);
		expect(getByTestId('plan-mode-user-answers')).toBeTruthy();
	});

	it('handles answers with only custom text', () => {
		const customOnly: PlanMode.QuestionResponse[] = [
			{
				questionId: 'q1',
				question: 'Requirements?',
				selectedOptions: [],
				customText: 'I need error notifications',
			},
		];

		const { getByText } = render(customOnly);

		expect(getByText('Requirements?')).toBeTruthy();
		expect(getByText('I need error notifications')).toBeTruthy();
	});
});
