import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/vue';
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
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('keeps the text input between three and eight rows while editing', async () => {
		const originalGetComputedStyle = window.getComputedStyle;
		vi.spyOn(window, 'getComputedStyle').mockImplementation(function getComputedStyle(element) {
			const styles = originalGetComputedStyle(element);
			const originalGetPropertyValue = styles.getPropertyValue.bind(styles);
			vi.spyOn(styles, 'getPropertyValue').mockImplementation(function getPropertyValue(property) {
				if (property === 'box-sizing') return 'content-box';
				if (property.startsWith('padding-') || property.startsWith('border-')) return '0px';
				return originalGetPropertyValue(property);
			});
			return styles;
		});
		vi.spyOn(HTMLTextAreaElement.prototype, 'scrollHeight', 'get').mockImplementation(
			function getScrollHeight() {
				return Math.max(this.value.split('\n').length, 1) * 20;
			},
		);

		const { getByRole } = render([textQuestion]);
		const textarea = getByRole('textbox');

		await waitFor(() => {
			expect(textarea).toHaveStyle({ height: '60px', minHeight: '60px' });
		});

		const longText = Array.from({ length: 10 }, (_, index) => `Line ${index + 1}`).join('\n');
		await fireEvent.update(textarea, longText);

		await waitFor(() => {
		expect(textarea).toHaveStyle({ height: '160px', overflowY: 'auto' });
		});

		const editedText = longText.replace('Line 5', 'Edited line 5');
		await fireEvent.update(textarea, editedText);

		expect(textarea).toHaveValue(editedText);
		expect(textarea).toHaveStyle({ height: '160px', overflow: 'auto' });
	});

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

	it('submits the clicked option on the final single-select question', async () => {
		vi.useFakeTimers();
		const { emitted, getByText } = render([singleQuestion]);

		await fireEvent.click(getByText('Production'));
		vi.advanceTimersByTime(250);

		expect(emitted().submit).toEqual([
			[
				[
					{
						questionId: 'q-single',
						question: 'Which credential should I use?',
						selectedOptions: ['Production'],
						customText: '',
						skipped: false,
					},
				],
			],
		]);
	});

	it('keeps Submit disabled while an option is only highlighted, not selected', async () => {
		const { container, getByTestId } = render([singleQuestion]);

		const firstOption = container.querySelector('[data-option-index="0"]');
		expect(firstOption).not.toBeNull();
		await fireEvent.mouseEnter(firstOption as Element);

		expect(getByTestId('instance-ai-questions-next')).toHaveAttribute('disabled');
	});

	it('skips the final single-select question via the explicit Skip button', async () => {
		const { emitted, getByTestId } = render([singleQuestion]);

		expect(getByTestId('instance-ai-questions-next')).toHaveAttribute('disabled');

		await fireEvent.click(getByTestId('instance-ai-questions-skip'));

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

	it('skips the final empty multi-select question via the explicit Skip button', async () => {
		const { emitted, getByTestId } = render([multiQuestion]);

		expect(getByTestId('instance-ai-questions-next')).toHaveAttribute('disabled');

		await fireEvent.click(getByTestId('instance-ai-questions-skip'));

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

	it('advances past a blank non-final text question via Next and marks it skipped', async () => {
		vi.useFakeTimers();
		const { emitted, getByTestId, getByText } = render([textQuestion, singleQuestion]);

		const nextButton = getByTestId('instance-ai-questions-next');
		expect(nextButton).toHaveTextContent('Next');
		expect(nextButton).not.toHaveAttribute('disabled');

		await fireEvent.click(nextButton);

		await fireEvent.click(getByText('Staging'));
		vi.advanceTimersByTime(250);

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
					{
						questionId: 'q-single',
						question: 'Which credential should I use?',
						selectedOptions: ['Staging'],
						customText: '',
						skipped: false,
					},
				],
			],
		]);
	});
});
