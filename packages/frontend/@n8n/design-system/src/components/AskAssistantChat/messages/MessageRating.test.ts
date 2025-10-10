import { render, fireEvent, waitFor } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';

import MessageRating from './MessageRating.vue';

const stubs = ['N8nButton', 'N8nIconButton', 'N8nInput'];

// Mock i18n to return keys instead of translated text
vi.mock('@n8n/design-system/composables/useI18n', () => ({
	useI18n: () => ({
		t: (key: string) => key,
	}),
}));

beforeEach(() => {
	setActivePinia(createPinia());
});

describe('MessageRating', () => {
	it('should render correctly with default props', () => {
		const wrapper = render(MessageRating, {
			global: { stubs },
		});

		expect(
			wrapper.container.querySelector('[data-test-id="message-thumbs-up-button"]'),
		).toBeTruthy();
		expect(
			wrapper.container.querySelector('[data-test-id="message-thumbs-down-button"]'),
		).toBeTruthy();
		expect(wrapper.html()).toMatchSnapshot();
	});

	describe('rating interactions', () => {
		it('should emit feedback when thumbs up is clicked', async () => {
			const wrapper = render(MessageRating, {
				global: { stubs },
			});

			const upButton = wrapper.container.querySelector('[data-test-id="message-thumbs-up-button"]');
			await fireEvent.click(upButton!);

			expect(wrapper.emitted()).toHaveProperty('feedback');
			expect(wrapper.emitted().feedback[0]).toEqual([{ rating: 'up' }]);
		});

		it('should emit feedback when thumbs down is clicked', async () => {
			const wrapper = render(MessageRating, {
				global: { stubs },
			});

			const downButton = wrapper.container.querySelector(
				'[data-test-id="message-thumbs-down-button"]',
			);
			await fireEvent.click(downButton!);

			expect(wrapper.emitted()).toHaveProperty('feedback');
			expect(wrapper.emitted().feedback[0]).toEqual([{ rating: 'down' }]);
		});

		it('should hide rating buttons and show success after thumbs up when showFeedback is false', async () => {
			const wrapper = render(MessageRating, {
				props: { showFeedback: false },
				global: { stubs },
			});

			const upButton = wrapper.container.querySelector('[data-test-id="message-thumbs-up-button"]');
			await fireEvent.click(upButton!);
			await nextTick();

			expect(
				wrapper.container.querySelector('[data-test-id="message-thumbs-up-button"]'),
			).toBeFalsy();
			expect(
				wrapper.container.querySelector('[data-test-id="message-thumbs-down-button"]'),
			).toBeFalsy();
			expect(wrapper.getByText('assistantChat.builder.success')).toBeTruthy();
		});

		it('should hide rating buttons and show feedback form after thumbs down when showFeedback is true', async () => {
			const wrapper = render(MessageRating, {
				props: { showFeedback: true },
				global: { stubs },
			});

			const downButton = wrapper.container.querySelector(
				'[data-test-id="message-thumbs-down-button"]',
			);
			await fireEvent.click(downButton!);
			await nextTick();

			expect(
				wrapper.container.querySelector('[data-test-id="message-thumbs-up-button"]'),
			).toBeFalsy();
			expect(
				wrapper.container.querySelector('[data-test-id="message-thumbs-down-button"]'),
			).toBeFalsy();
			expect(
				wrapper.container.querySelector('[data-test-id="message-feedback-input"]'),
			).toBeTruthy();
			expect(
				wrapper.container.querySelector('[data-test-id="message-submit-feedback-button"]'),
			).toBeTruthy();
		});

		it('should show success immediately after thumbs down when showFeedback is false', async () => {
			const wrapper = render(MessageRating, {
				props: { showFeedback: false },
				global: { stubs },
			});

			const downButton = wrapper.container.querySelector(
				'[data-test-id="message-thumbs-down-button"]',
			);
			await fireEvent.click(downButton!);
			await nextTick();

			expect(
				wrapper.container.querySelector('[data-test-id="message-feedback-input"]'),
			).toBeFalsy();
			expect(wrapper.getByText('assistantChat.builder.success')).toBeTruthy();
		});
	});

	describe('feedback form interactions', () => {
		it('should submit feedback and show success', async () => {
			const wrapper = render(MessageRating, {
				props: { showFeedback: true },
				global: { stubs: ['N8nButton', 'N8nIconButton'] }, // Don't stub n8n-input
			});

			const downButton = wrapper.container.querySelector(
				'[data-test-id="message-thumbs-down-button"]',
			);
			await fireEvent.click(downButton!);
			await nextTick();

			// Find the actual textarea element within the N8nInput component
			const textarea = wrapper.container.querySelector(
				'textarea[data-test-id="message-feedback-input"]',
			);
			await fireEvent.update(textarea!, 'This is my feedback about the response');
			await nextTick();

			const submitButton = wrapper.container.querySelector(
				'[data-test-id="message-submit-feedback-button"]',
			);
			await fireEvent.click(submitButton!);
			await nextTick();

			expect(wrapper.emitted().feedback).toHaveLength(2);
			expect(wrapper.emitted().feedback[1]).toEqual([
				{ feedback: 'This is my feedback about the response' },
			]);
			expect(
				wrapper.container.querySelector('[data-test-id="message-feedback-input"]'),
			).toBeFalsy();
			expect(wrapper.getByText('assistantChat.builder.success')).toBeTruthy();
		});

		it('should cancel feedback and return to rating buttons', async () => {
			const wrapper = render(MessageRating, {
				props: { showFeedback: true },
				global: { stubs },
			});

			const downButton = wrapper.container.querySelector(
				'[data-test-id="message-thumbs-down-button"]',
			);
			await fireEvent.click(downButton!);
			await nextTick();

			const cancelButton = wrapper.container.querySelector(
				'n8n-button-stub[label="generic.cancel"]',
			);
			await fireEvent.click(cancelButton!);
			await nextTick();

			expect(
				wrapper.container.querySelector('[data-test-id="message-feedback-input"]'),
			).toBeFalsy();
			expect(
				wrapper.container.querySelector('[data-test-id="message-thumbs-up-button"]'),
			).toBeTruthy();
			expect(
				wrapper.container.querySelector('[data-test-id="message-thumbs-down-button"]'),
			).toBeTruthy();
		});

		it('should focus feedback input after thumbs down in regular mode', async () => {
			const wrapper = render(MessageRating, {
				props: { showFeedback: true, style: 'regular' },
				global: { stubs },
			});

			const downButton = wrapper.container.querySelector(
				'[data-test-id="message-thumbs-down-button"]',
			);
			await fireEvent.click(downButton!);

			await waitFor(() => {
				const feedbackInput = wrapper.container.querySelector(
					'[data-test-id="message-feedback-input"]',
				);
				expect(feedbackInput).toBeTruthy();
			});
		});

		it('should clear feedback text when cancelling', async () => {
			const wrapper = render(MessageRating, {
				props: { showFeedback: true },
				global: { stubs },
			});

			const downButton = wrapper.container.querySelector(
				'[data-test-id="message-thumbs-down-button"]',
			);
			await fireEvent.click(downButton!);
			await nextTick();

			const cancelButton = wrapper.container.querySelector(
				'n8n-button-stub[label="generic.cancel"]',
			);
			await fireEvent.click(cancelButton!);
			await nextTick();

			const downButtonAgain = wrapper.container.querySelector(
				'[data-test-id="message-thumbs-down-button"]',
			);
			await fireEvent.click(downButtonAgain!);
			await nextTick();

			const feedbackInputAfter = wrapper.container.querySelector(
				'[data-test-id="message-feedback-input"]',
			);
			expect(feedbackInputAfter?.getAttribute('modelvalue')).toBe('');
		});
	});
});
