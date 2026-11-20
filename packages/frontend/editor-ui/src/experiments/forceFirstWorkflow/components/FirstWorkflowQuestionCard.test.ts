import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';

import type { QuestionId } from '../questions';
import FirstWorkflowQuestionCard from './FirstWorkflowQuestionCard.vue';

const renderComponent = createComponentRenderer(FirstWorkflowQuestionCard);

const renderCard = (options: { props: { questionId: QuestionId } & Record<string, unknown> }) =>
	renderComponent({ ...options, pinia: createTestingPinia() });

describe('FirstWorkflowQuestionCard', () => {
	it('shows the progress of the question', () => {
		const { getByText } = renderCard({ props: { questionId: 'provider' } });

		expect(getByText('Question 3 of 3')).toBeInTheDocument();
	});

	it('answers with the recommended choice when the user does not change it', async () => {
		const { getByTestId, emitted } = renderCard({ props: { questionId: 'format' } });

		await fireEvent.click(getByTestId('first-workflow-next'));

		expect(emitted('answer')).toEqual([[{ id: 'format', value: 'priority' }]]);
	});

	it('answers with the chosen option', async () => {
		const { getByTestId, emitted } = renderCard({ props: { questionId: 'provider' } });

		await fireEvent.click(getByTestId('first-workflow-option-outlook'));
		await fireEvent.click(getByTestId('first-workflow-next'));

		expect(emitted('answer')).toEqual([[{ id: 'provider', value: 'outlook' }]]);
	});

	it('offers Continue instead of Next on the last question', () => {
		const { getByTestId } = renderCard({ props: { questionId: 'provider' } });

		expect(getByTestId('first-workflow-next')).toHaveTextContent('Continue');
	});

	describe('navigation', () => {
		it('disables both arrows when there is nowhere to go', () => {
			const { getByTestId } = renderCard({ props: { questionId: 'format' } });

			expect(getByTestId('first-workflow-previous')).toBeDisabled();
			expect(getByTestId('first-workflow-following')).toBeDisabled();
		});

		it('asks to go back and forward when the arrows are enabled', async () => {
			const { getByTestId, emitted } = renderCard({
				props: { questionId: 'schedule', canGoBack: true, canGoForward: true },
			});

			await fireEvent.click(getByTestId('first-workflow-previous'));
			await fireEvent.click(getByTestId('first-workflow-following'));

			expect(emitted('back')).toHaveLength(1);
			expect(emitted('forward')).toHaveLength(1);
		});

		it('opens on the answer given before', async () => {
			const { getByTestId, emitted } = renderCard({
				props: { questionId: 'format', answer: { id: 'format', value: 'briefing' } },
			});

			await fireEvent.click(getByTestId('first-workflow-next'));

			expect(emitted('answer')).toEqual([[{ id: 'format', value: 'briefing' }]]);
		});

		it('opens on an earlier custom time and cadence', async () => {
			const { getByTestId, emitted } = renderCard({
				props: {
					questionId: 'schedule',
					answer: { id: 'schedule', hour: 7, minute: 45, weekdaysOnly: true },
				},
			});

			expect(getByTestId('first-workflow-custom-time-input')).toHaveValue('07:45');
			await fireEvent.click(getByTestId('first-workflow-next'));

			expect(emitted('answer')).toEqual([
				[{ id: 'schedule', hour: 7, minute: 45, weekdaysOnly: true }],
			]);
		});
	});

	describe('schedule', () => {
		it('answers with 8:00 every day by default', async () => {
			const { getByTestId, emitted } = renderCard({ props: { questionId: 'schedule' } });

			await fireEvent.click(getByTestId('first-workflow-next'));

			expect(emitted('answer')).toEqual([
				[{ id: 'schedule', hour: 8, minute: 0, weekdaysOnly: false }],
			]);
		});

		it('answers with the chosen time and cadence', async () => {
			const { getByTestId, emitted } = renderCard({ props: { questionId: 'schedule' } });

			await fireEvent.click(getByTestId('first-workflow-time-18-0'));
			await fireEvent.click(getByTestId('first-workflow-repeat-weekdays'));
			await fireEvent.click(getByTestId('first-workflow-next'));

			expect(emitted('answer')).toEqual([
				[{ id: 'schedule', hour: 18, minute: 0, weekdaysOnly: true }],
			]);
		});

		it('blocks Next until a custom time is entered, then answers with it', async () => {
			const { getByTestId, emitted } = renderCard({ props: { questionId: 'schedule' } });

			await fireEvent.click(getByTestId('first-workflow-time-custom'));
			expect(getByTestId('first-workflow-next')).toBeDisabled();

			await fireEvent.update(getByTestId('first-workflow-custom-time-input'), '07:45');
			await fireEvent.click(getByTestId('first-workflow-next'));

			expect(emitted('answer')).toEqual([
				[{ id: 'schedule', hour: 7, minute: 45, weekdaysOnly: false }],
			]);
		});
	});
});
