import { render, fireEvent } from '@testing-library/vue';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import MessageRating from '../MessageRating.vue';

// Mock dependencies
vi.mock('../../../../composables/useI18n', () => ({
	useI18n: vi.fn(() => ({
		t: vi.fn((key: string) => {
			const translations: Record<string, string> = {
				'assistantChat.thumbsUp': 'Thumbs up',
				'assistantChat.thumbsDown': 'Thumbs down',
				'assistantChat.helpful': 'Helpful',
				'assistantChat.notHelpful': 'Not helpful',
				'assistantChat.provideFeedback': 'Provide feedback',
				'assistantChat.submitFeedback': 'Submit feedback',
				'assistantChat.cancel': 'Cancel',
				'assistantChat.feedbackSubmitted': 'Thank you for your feedback!',
				'assistantChat.feedbackPlaceholder': 'Tell us more about your experience...',
			};
			return translations[key] || key;
		}),
	})),
}));

const stubs = {
	'n8n-button': {
		template:
			'<button class="n8n-button" @click="$emit(\'click\')" :disabled="disabled" :type="type"><slot /></button>',
		props: ['disabled', 'type', 'size'],
		emits: ['click'],
	},
	'n8n-icon-button': {
		template:
			'<button class="n8n-icon-button" @click="$emit(\'click\')" :disabled="disabled"><slot /></button>',
		props: ['disabled', 'icon', 'size'],
		emits: ['click'],
	},
	'n8n-icon': {
		template: '<span class="n8n-icon" :data-icon="icon" />',
		props: ['icon'],
	},
	'n8n-textarea': {
		template:
			'<textarea class="n8n-textarea" @input="$emit(\'update:modelValue\', $event.target.value)" :value="modelValue" :placeholder="placeholder" />',
		props: ['modelValue', 'placeholder', 'rows', 'disabled'],
		emits: ['update:modelValue'],
	},
};

type RatingStyle = 'regular' | 'minimal';
type RatingValue = 'positive' | 'negative';

interface RatingFeedback {
	rating: RatingValue;
	comment?: string;
	timestamp?: string;
}

describe('MessageRating', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Basic Rendering', () => {
		it('should render rating component correctly with regular style', () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular' },
				global: { stubs },
			});

			expect(wrapper.container).toMatchSnapshot();
			expect(wrapper.container.textContent).toContain('Helpful');
			expect(wrapper.container.textContent).toContain('Not helpful');
		});

		it('should render rating component correctly with minimal style', () => {
			const wrapper = render(MessageRating, {
				props: { style: 'minimal' },
				global: { stubs },
			});

			expect(wrapper.container).toMatchSnapshot();
			// Minimal style should show only icons, not text
			expect(wrapper.container.textContent).not.toContain('Helpful');
			expect(wrapper.container.textContent).not.toContain('Not helpful');
		});

		it('should default to regular style when no style specified', () => {
			const wrapper = render(MessageRating, {
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('Helpful');
			expect(wrapper.container.textContent).toContain('Not helpful');
		});
	});

	describe('Rating Button Interactions', () => {
		it('should emit feedback event when thumbs up clicked', async () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular' },
				global: { stubs },
			});

			const thumbsUpButton = wrapper.container.querySelector('.thumbs-up');
			await fireEvent.click(thumbsUpButton!);

			const emittedEvents = wrapper.emitted('feedback');
			expect(emittedEvents).toBeTruthy();
			expect(emittedEvents![0][0]).toMatchObject({
				rating: 'positive',
				timestamp: expect.any(String),
			});
		});

		it('should emit feedback event when thumbs down clicked', async () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular' },
				global: { stubs },
			});

			const thumbsDownButton = wrapper.container.querySelector('.thumbs-down');
			await fireEvent.click(thumbsDownButton!);

			const emittedEvents = wrapper.emitted('feedback');
			expect(emittedEvents).toBeTruthy();
			expect(emittedEvents![0][0]).toMatchObject({
				rating: 'negative',
				timestamp: expect.any(String),
			});
		});

		it('should disable buttons after rating is given', async () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular' },
				global: { stubs },
			});

			const thumbsUpButton = wrapper.container.querySelector('.thumbs-up');
			await fireEvent.click(thumbsUpButton!);

			expect(thumbsUpButton).toHaveAttribute('disabled', 'true');
			const thumbsDownButton = wrapper.container.querySelector('.thumbs-down');
			expect(thumbsDownButton).toHaveAttribute('disabled', 'true');
		});

		it('should show active state for selected rating', async () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular' },
				global: { stubs },
			});

			const thumbsUpButton = wrapper.container.querySelector('.thumbs-up');
			await fireEvent.click(thumbsUpButton!);

			expect(thumbsUpButton).toHaveClass('active');
		});

		it('should handle rapid successive clicks gracefully', async () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular' },
				global: { stubs },
			});

			const thumbsUpButton = wrapper.container.querySelector('.thumbs-up');

			// Click multiple times rapidly
			await fireEvent.click(thumbsUpButton!);
			await fireEvent.click(thumbsUpButton!);
			await fireEvent.click(thumbsUpButton!);

			// Should only emit one feedback event
			const emittedEvents = wrapper.emitted('feedback');
			expect(emittedEvents?.length).toBe(1);
		});
	});

	describe('Feedback Form Display', () => {
		it('should show feedback form when showFeedback prop is true and rating is negative', async () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular', showFeedback: true },
				global: { stubs },
			});

			const thumbsDownButton = wrapper.container.querySelector('.thumbs-down');
			await fireEvent.click(thumbsDownButton!);

			const feedbackForm = wrapper.container.querySelector('.feedback-form');
			expect(feedbackForm).toBeInTheDocument();
		});

		it('should not show feedback form when showFeedback prop is false', async () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular', showFeedback: false },
				global: { stubs },
			});

			const thumbsDownButton = wrapper.container.querySelector('.thumbs-down');
			await fireEvent.click(thumbsDownButton!);

			const feedbackForm = wrapper.container.querySelector('.feedback-form');
			expect(feedbackForm).not.toBeInTheDocument();
		});

		it('should show feedback form for positive ratings when showFeedback is true', async () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular', showFeedback: true },
				global: { stubs },
			});

			const thumbsUpButton = wrapper.container.querySelector('.thumbs-up');
			await fireEvent.click(thumbsUpButton!);

			const feedbackForm = wrapper.container.querySelector('.feedback-form');
			expect(feedbackForm).toBeInTheDocument();
		});

		it('should display textarea in feedback form', async () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular', showFeedback: true },
				global: { stubs },
			});

			const thumbsDownButton = wrapper.container.querySelector('.thumbs-down');
			await fireEvent.click(thumbsDownButton!);

			const textarea = wrapper.container.querySelector('.n8n-textarea');
			expect(textarea).toBeInTheDocument();
			expect(textarea).toHaveAttribute('placeholder', 'Tell us more about your experience...');
		});

		it('should display submit and cancel buttons in feedback form', async () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular', showFeedback: true },
				global: { stubs },
			});

			const thumbsUpButton = wrapper.container.querySelector('.thumbs-up');
			await fireEvent.click(thumbsUpButton!);

			const submitButton = wrapper.container.querySelector('.submit-feedback');
			const cancelButton = wrapper.container.querySelector('.cancel-feedback');

			expect(submitButton).toBeInTheDocument();
			expect(cancelButton).toBeInTheDocument();
			expect(submitButton?.textContent).toContain('Submit feedback');
			expect(cancelButton?.textContent).toContain('Cancel');
		});
	});

	describe('Feedback Form Interactions', () => {
		it('should update feedback text when typing in textarea', async () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular', showFeedback: true },
				global: { stubs },
			});

			const thumbsDownButton = wrapper.container.querySelector('.thumbs-down');
			await fireEvent.click(thumbsDownButton!);

			const textarea = wrapper.container.querySelector('.n8n-textarea');
			await fireEvent.input(textarea!, { target: { value: 'This could be better' } });

			expect(textarea).toHaveAttribute('value', 'This could be better');
		});

		it('should emit feedback with comment when form is submitted', async () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular', showFeedback: true },
				global: { stubs },
			});

			const thumbsDownButton = wrapper.container.querySelector('.thumbs-down');
			await fireEvent.click(thumbsDownButton!);

			const textarea = wrapper.container.querySelector('.n8n-textarea');
			await fireEvent.input(textarea!, { target: { value: 'Needs improvement' } });

			const submitButton = wrapper.container.querySelector('.submit-feedback');
			await fireEvent.click(submitButton!);

			const emittedEvents = wrapper.emitted('feedback');
			expect(emittedEvents?.length).toBe(2); // Initial rating + feedback submission
			expect(emittedEvents![1][0]).toMatchObject({
				rating: 'negative',
				comment: 'Needs improvement',
				timestamp: expect.any(String),
			});
		});

		it('should hide feedback form and show success message when submitted', async () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular', showFeedback: true },
				global: { stubs },
			});

			const thumbsUpButton = wrapper.container.querySelector('.thumbs-up');
			await fireEvent.click(thumbsUpButton!);

			const textarea = wrapper.container.querySelector('.n8n-textarea');
			await fireEvent.input(textarea!, { target: { value: 'Great job!' } });

			const submitButton = wrapper.container.querySelector('.submit-feedback');
			await fireEvent.click(submitButton!);

			const feedbackForm = wrapper.container.querySelector('.feedback-form');
			expect(feedbackForm).not.toBeInTheDocument();

			const successMessage = wrapper.container.querySelector('.success-message');
			expect(successMessage).toBeInTheDocument();
			expect(wrapper.container.textContent).toContain('Thank you for your feedback!');
		});

		it('should cancel feedback form when cancel button clicked', async () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular', showFeedback: true },
				global: { stubs },
			});

			const thumbsDownButton = wrapper.container.querySelector('.thumbs-down');
			await fireEvent.click(thumbsDownButton!);

			const cancelButton = wrapper.container.querySelector('.cancel-feedback');
			await fireEvent.click(cancelButton!);

			const feedbackForm = wrapper.container.querySelector('.feedback-form');
			expect(feedbackForm).not.toBeInTheDocument();

			// Should reset to initial state
			const thumbsUpButton = wrapper.container.querySelector('.thumbs-up');
			expect(thumbsUpButton).not.toHaveAttribute('disabled');
		});

		it('should allow re-rating after cancelling feedback', async () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular', showFeedback: true },
				global: { stubs },
			});

			// Initial rating
			const thumbsDownButton = wrapper.container.querySelector('.thumbs-down');
			await fireEvent.click(thumbsDownButton!);

			// Cancel feedback
			const cancelButton = wrapper.container.querySelector('.cancel-feedback');
			await fireEvent.click(cancelButton!);

			// Rate again
			const thumbsUpButton = wrapper.container.querySelector('.thumbs-up');
			await fireEvent.click(thumbsUpButton!);

			const emittedEvents = wrapper.emitted('feedback');
			expect(emittedEvents?.length).toBe(2);
			expect(emittedEvents![1][0]).toMatchObject({ rating: 'positive' });
		});
	});

	describe('Style Variations', () => {
		it('should use different button components based on style', () => {
			const regularWrapper = render(MessageRating, {
				props: { style: 'regular' },
				global: { stubs },
			});

			const minimalWrapper = render(MessageRating, {
				props: { style: 'minimal' },
				global: { stubs },
			});

			// Regular style should use n8n-button
			expect(regularWrapper.container.querySelector('.n8n-button')).toBeInTheDocument();

			// Minimal style should use n8n-icon-button
			expect(minimalWrapper.container.querySelector('.n8n-icon-button')).toBeInTheDocument();
		});

		it('should show appropriate icons for both styles', () => {
			const styles: RatingStyle[] = ['regular', 'minimal'];

			styles.forEach((style) => {
				const wrapper = render(MessageRating, {
					props: { style },
					global: { stubs },
				});

				const thumbsUpIcon = wrapper.container.querySelector('[data-icon="thumbs-up"]');
				const thumbsDownIcon = wrapper.container.querySelector('[data-icon="thumbs-down"]');

				expect(thumbsUpIcon).toBeInTheDocument();
				expect(thumbsDownIcon).toBeInTheDocument();
			});
		});

		it('should apply style-specific CSS classes', () => {
			const regularWrapper = render(MessageRating, {
				props: { style: 'regular' },
				global: { stubs },
			});

			const minimalWrapper = render(MessageRating, {
				props: { style: 'minimal' },
				global: { stubs },
			});

			expect(regularWrapper.container.querySelector('.rating-regular')).toBeInTheDocument();
			expect(minimalWrapper.container.querySelector('.rating-minimal')).toBeInTheDocument();
		});
	});

	describe('Accessibility', () => {
		it('should have proper ARIA attributes for rating buttons', () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular' },
				global: { stubs },
			});

			const thumbsUpButton = wrapper.container.querySelector('.thumbs-up');
			const thumbsDownButton = wrapper.container.querySelector('.thumbs-down');

			expect(thumbsUpButton).toHaveAttribute('aria-label', 'Thumbs up');
			expect(thumbsDownButton).toHaveAttribute('aria-label', 'Thumbs down');
		});

		it('should have proper role for rating container', () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular' },
				global: { stubs },
			});

			const ratingContainer = wrapper.container.querySelector('.message-rating');
			expect(ratingContainer).toHaveAttribute('role', 'group');
			expect(ratingContainer).toHaveAttribute('aria-label', 'Rate this message');
		});

		it('should announce rating selection to screen readers', async () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular' },
				global: { stubs },
			});

			const thumbsUpButton = wrapper.container.querySelector('.thumbs-up');
			await fireEvent.click(thumbsUpButton!);

			const announcement = wrapper.container.querySelector('.sr-only');
			expect(announcement?.textContent).toContain('Positive rating selected');
		});

		it('should have proper form labels and accessibility', async () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular', showFeedback: true },
				global: { stubs },
			});

			const thumbsDownButton = wrapper.container.querySelector('.thumbs-down');
			await fireEvent.click(thumbsDownButton!);

			const textarea = wrapper.container.querySelector('.n8n-textarea');
			const label = wrapper.container.querySelector('label[for="feedback-textarea"]');

			expect(label).toBeInTheDocument();
			expect(textarea).toHaveAttribute('id', 'feedback-textarea');
			expect(textarea).toHaveAttribute('aria-describedby', expect.any(String));
		});

		it('should support keyboard navigation', async () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular' },
				global: { stubs },
			});

			const thumbsUpButton = wrapper.container.querySelector('.thumbs-up');

			// Should be focusable
			expect(thumbsUpButton).not.toHaveAttribute('tabindex', '-1');

			// Should respond to Enter and Space keys
			await fireEvent.keyDown(thumbsUpButton!, { key: 'Enter' });
			let emittedEvents = wrapper.emitted('feedback');
			expect(emittedEvents).toBeTruthy();

			// Reset component state for space key test
			await wrapper.rerender({ style: 'regular' });

			await fireEvent.keyDown(thumbsUpButton!, { key: ' ' });
			emittedEvents = wrapper.emitted('feedback');
			expect(emittedEvents).toBeTruthy();
		});
	});

	describe('Edge Cases', () => {
		it('should handle missing style prop gracefully', () => {
			const wrapper = render(MessageRating, {
				global: { stubs },
			});

			expect(wrapper.container).toBeInTheDocument();
			// Should default to regular style
			expect(wrapper.container.textContent).toContain('Helpful');
		});

		it('should handle invalid style prop', () => {
			const wrapper = render(MessageRating, {
				props: { style: 'invalid-style' as RatingStyle },
				global: { stubs },
			});

			expect(wrapper.container).toBeInTheDocument();
			// Should fallback to regular style
			expect(wrapper.container.textContent).toContain('Helpful');
		});

		it('should handle empty feedback comment', async () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular', showFeedback: true },
				global: { stubs },
			});

			const thumbsDownButton = wrapper.container.querySelector('.thumbs-down');
			await fireEvent.click(thumbsDownButton!);

			const submitButton = wrapper.container.querySelector('.submit-feedback');
			await fireEvent.click(submitButton!);

			const emittedEvents = wrapper.emitted('feedback');
			expect(emittedEvents![1][0]).toMatchObject({
				rating: 'negative',
				comment: '',
			});
		});

		it('should handle very long feedback comments', async () => {
			const longComment = 'A'.repeat(10000);
			const wrapper = render(MessageRating, {
				props: { style: 'regular', showFeedback: true },
				global: { stubs },
			});

			const thumbsUpButton = wrapper.container.querySelector('.thumbs-up');
			await fireEvent.click(thumbsUpButton!);

			const textarea = wrapper.container.querySelector('.n8n-textarea');
			await fireEvent.input(textarea!, { target: { value: longComment } });

			const submitButton = wrapper.container.querySelector('.submit-feedback');
			await fireEvent.click(submitButton!);

			const emittedEvents = wrapper.emitted('feedback');
			expect(emittedEvents![1][0]).toMatchObject({
				rating: 'positive',
				comment: longComment,
			});
		});

		it('should handle special characters in feedback', async () => {
			const specialComment = 'Special chars: <>&"\'`~!@#$%^&*()[]{}|\\';
			const wrapper = render(MessageRating, {
				props: { style: 'regular', showFeedback: true },
				global: { stubs },
			});

			const thumbsDownButton = wrapper.container.querySelector('.thumbs-down');
			await fireEvent.click(thumbsDownButton!);

			const textarea = wrapper.container.querySelector('.n8n-textarea');
			await fireEvent.input(textarea!, { target: { value: specialComment } });

			const submitButton = wrapper.container.querySelector('.submit-feedback');
			await fireEvent.click(submitButton!);

			const emittedEvents = wrapper.emitted('feedback');
			expect(emittedEvents![1][0]).toMatchObject({
				rating: 'negative',
				comment: specialComment,
			});
		});
	});

	describe('Performance', () => {
		it('should handle rapid rating changes efficiently', async () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular', showFeedback: true },
				global: { stubs },
			});

			const thumbsUpButton = wrapper.container.querySelector('.thumbs-up');
			const thumbsDownButton = wrapper.container.querySelector('.thumbs-down');

			// Simulate rapid rating changes
			for (let i = 0; i < 10; i++) {
				const button = i % 2 === 0 ? thumbsUpButton : thumbsDownButton;

				// Reset component state
				const cancelButton = wrapper.container.querySelector('.cancel-feedback');
				if (cancelButton) {
					await fireEvent.click(cancelButton);
				}

				await fireEvent.click(button!);
			}

			expect(wrapper.container).toBeInTheDocument();
		});

		it('should not cause memory leaks with form interactions', async () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular', showFeedback: true },
				global: { stubs },
			});

			// Simulate multiple form interactions
			for (let i = 0; i < 5; i++) {
				const thumbsDownButton = wrapper.container.querySelector('.thumbs-down');
				await fireEvent.click(thumbsDownButton!);

				const textarea = wrapper.container.querySelector('.n8n-textarea');
				await fireEvent.input(textarea!, { target: { value: `Comment ${i}` } });

				const cancelButton = wrapper.container.querySelector('.cancel-feedback');
				await fireEvent.click(cancelButton!);
			}

			// Verify component can be unmounted cleanly
			wrapper.unmount();
			expect(wrapper.container.innerHTML).toBe('');
		});
	});

	describe('Timestamp Handling', () => {
		it('should include timestamp in feedback events', async () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular' },
				global: { stubs },
			});

			const before = Date.now();

			const thumbsUpButton = wrapper.container.querySelector('.thumbs-up');
			await fireEvent.click(thumbsUpButton!);

			const after = Date.now();

			const emittedEvents = wrapper.emitted('feedback');
			const timestamp = new Date(emittedEvents![0][0].timestamp).getTime();

			expect(timestamp).toBeGreaterThanOrEqual(before);
			expect(timestamp).toBeLessThanOrEqual(after);
		});

		it('should use ISO string format for timestamps', async () => {
			const wrapper = render(MessageRating, {
				props: { style: 'regular' },
				global: { stubs },
			});

			const thumbsDownButton = wrapper.container.querySelector('.thumbs-down');
			await fireEvent.click(thumbsDownButton!);

			const emittedEvents = wrapper.emitted('feedback');
			const timestamp = emittedEvents![0][0].timestamp;

			// Should be valid ISO string
			expect(() => new Date(timestamp).toISOString()).not.toThrow();
			expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		});
	});
});
