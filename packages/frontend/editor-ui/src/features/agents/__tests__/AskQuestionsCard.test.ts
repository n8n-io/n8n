import { describe, expect, it } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import AskQuestionsCard from '../components/interactive/AskQuestionsCard.vue';
import type { InteractionQuestion } from '@n8n/api-types';

const singleQuestion: InteractionQuestion = {
	id: 'q1',
	question: 'Where should the agent post?',
	type: 'single',
	options: ['Slack', 'Discord'],
};

const textQuestion: InteractionQuestion = {
	id: 'q-text',
	question: 'Anything else?',
	type: 'text',
};

const renderComponent = createComponentRenderer(AskQuestionsCard);

/**
 * The wizard child (`InstanceAiQuestions.vue`) uses the instanceAi subtree's
 * `data-test-id` (hyphenated) convention, while this card and the rest of
 * `features/agents` use `data-testid`. Query via raw attribute selector
 * instead of `getByTestId`/`queryByTestId` so the assertions don't depend on
 * whichever attribute name the global test config happens to default to.
 */
function findByRawTestId(container: Element, id: string) {
	return container.querySelector<HTMLElement>(`[data-test-id="${id}"], [data-testid="${id}"]`);
}

describe('AskQuestionsCard', () => {
	it('renders the wizard (InstanceAiQuestions) for the live card and reports answers via submit', async () => {
		const { emitted, container } = renderComponent({
			props: { questions: [textQuestion] },
		});

		expect(findByRawTestId(container, 'ask-questions-card')).toBeTruthy();
		const submitButton = findByRawTestId(container, 'instance-ai-questions-next');
		expect(submitButton).toBeTruthy();

		// The final question submits immediately even with an empty answer
		// (matches InstanceAiQuestions.vue's own "skip if empty" behaviour).
		await fireEvent.click(submitButton!);

		expect(emitted().submit).toEqual([
			[
				{
					approved: true,
					answers: [{ questionId: 'q-text', selectedOptions: [], skipped: true }],
				},
			],
		]);
	});

	it('answers a single-select question by clicking an option', async () => {
		const { emitted, getByText } = renderComponent({
			props: { questions: [singleQuestion] },
		});

		await fireEvent.click(getByText('Slack'));

		// InstanceAiQuestions.vue delays single-choice auto-advance by 250ms so
		// the selection is visible before submitting.
		await waitFor(() => expect(emitted().submit).toBeTruthy());
		expect(emitted().submit).toEqual([
			[{ approved: true, answers: [{ questionId: 'q1', selectedOptions: ['Slack'] }] }],
		]);
	});

	it('replaces the wizard with the resolved answer for each question when disabled', () => {
		const { container, getByText } = renderComponent({
			props: {
				questions: [singleQuestion],
				disabled: true,
				resolvedValue: {
					answered: true,
					answers: [{ questionId: 'q1', selectedOptions: ['Slack'] }],
				},
			},
		});

		expect(findByRawTestId(container, 'instance-ai-questions-next')).toBeNull();
		expect(getByText(/Slack/)).toBeTruthy();
	});

	it('renders the skipped label when the resolvedValue reports no answers', () => {
		const { getByText } = renderComponent({
			props: {
				questions: [singleQuestion],
				disabled: true,
				resolvedValue: { answered: false },
			},
		});

		expect(getByText('Skipped')).toBeTruthy();
	});
});
