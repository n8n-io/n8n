import { render, fireEvent } from '@testing-library/vue';
import Feedback from '@/components/Feedback.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

describe('Feedback', () => {
	it('should emit update:modelValue event with positive feedback', async () => {
		const { getByTestId, emitted } = render(Feedback);

		await fireEvent.click(getByTestId('feedback-button-positive'));

		expect(emitted()).toHaveProperty('update:modelValue');
		expect(emitted()['update:modelValue'][0]).toEqual(['positive']);
	});

	it('should emit update:modelValue event with negative feedback', async () => {
		const { getByTestId, emitted } = render(Feedback);

		await fireEvent.click(getByTestId('feedback-button-negative'));

		expect(emitted()).toHaveProperty('update:modelValue');
		expect(emitted()['update:modelValue'][0]).toEqual(['negative']);
	});

	it('should display positive feedback message when modelValue is positive', () => {
		const { getByText } = render(Feedback, {
			props: {
				modelValue: 'positive',
			},
		});

		expect(getByText(/feedback.positive/i)).toBeInTheDocument();
	});

	it('should display negative feedback message when modelValue is negative', () => {
		const { getByText } = render(Feedback, {
			props: {
				modelValue: 'negative',
			},
		});

		expect(getByText(/feedback.negative/i)).toBeInTheDocument();
	});
});
