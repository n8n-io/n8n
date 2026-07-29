import { describe, expect, it } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiQuestions, { type QuestionItem } from '../components/InstanceAiQuestions.vue';

const textQuestion: QuestionItem = {
	id: 'q-text',
	question: 'Leave blank for no filter',
	type: 'text',
};

const singleQuestion: QuestionItem = {
	id: 'q-single',
	question: 'Which credential should I use?',
	type: 'single',
	options: ['Production', 'Staging'],
};

const multiQuestion: QuestionItem = {
	id: 'q-multi',
	question: 'Which fields should I include?',
	type: 'multi',
	options: ['Name', 'Email', 'Phone'],
};

const renderComponent = createComponentRenderer(InstanceAiQuestions);

function render(questions: QuestionItem[]) {
	return renderComponent({
		props: {
			questions,
		},
	});
}

describe('InstanceAiQuestions', () => {
	it('submits the final empty text question as skipped', async () => {
		const { emitted, getByTestId } = render([textQuestion]);

		const submitButton = getByTestId('instance-ai-questions-next');

		expect(submitButton).toHaveTextContent('Submit');
		expect(submitButton).not.toHaveAttribute('disabled');

		await fireEvent.click(submitButton);

		expect(emitted().submit).toEqual([
			[
				[
					{
						questionId: 'q-text',
						question: 'Leave blank for no filter',
						selectedOptions: [],
						customText: '',
						skipped: true,
					},
				],
			],
		]);
	});

	it('shows enabled Submit for the final empty single-select question', async () => {
		const { emitted, getByTestId, queryByTestId } = render([singleQuestion]);

		expect(queryByTestId('instance-ai-questions-skip')).toBeNull();

		const submitButton = getByTestId('instance-ai-questions-next');

		expect(submitButton).toHaveTextContent('Submit');
		expect(submitButton).not.toHaveAttribute('disabled');

		await fireEvent.click(submitButton);

		expect(emitted().submit).toEqual([
			[
				[
					{
						questionId: 'q-single',
						question: 'Which credential should I use?',
						selectedOptions: [],
						customText: '',
						skipped: true,
					},
				],
			],
		]);
	});

	it('submits the final empty multi-select question as skipped', async () => {
		const { emitted, getByTestId, queryByTestId } = render([multiQuestion]);

		expect(queryByTestId('instance-ai-questions-skip')).toBeNull();

		const submitButton = getByTestId('instance-ai-questions-next');

		expect(submitButton).toHaveTextContent('Submit');
		expect(submitButton).not.toHaveAttribute('disabled');

		await fireEvent.click(submitButton);

		expect(emitted().submit).toEqual([
			[
				[
					{
						questionId: 'q-multi',
						question: 'Which fields should I include?',
						selectedOptions: [],
						customText: '',
						skipped: true,
					},
				],
			],
		]);
	});

	it('keeps an empty non-final text question skippable but not nextable', () => {
		const { getByTestId } = render([textQuestion, singleQuestion]);

		const nextButton = getByTestId('instance-ai-questions-next');

		expect(getByTestId('instance-ai-questions-skip')).toBeInTheDocument();
		expect(nextButton).toHaveTextContent('Next');
		expect(nextButton).toHaveAttribute('disabled');
	});
});
