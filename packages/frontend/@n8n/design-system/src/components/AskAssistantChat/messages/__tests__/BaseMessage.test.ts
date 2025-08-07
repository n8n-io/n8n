import { render, fireEvent } from '@testing-library/vue';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import BaseMessage from '../BaseMessage.vue';
import type { ChatUI } from '@n8n/chat';

// Mock dependencies
vi.mock('../../../../composables/useI18n', () => ({
	useI18n: vi.fn(() => ({
		t: vi.fn((key: string) => key),
	})),
}));

const stubs = {
	'n8n-avatar': {
		template: '<div class="n8n-avatar" :data-first-name="firstName" :data-last-name="lastName" />',
		props: ['firstName', 'lastName'],
	},
	'assistant-avatar': {
		template: '<div class="assistant-avatar" />',
	},
	'message-rating': {
		template: '<div class="message-rating" @feedback="$emit(\'feedback\', $event)" />',
		emits: ['feedback'],
	},
};

const mockUser = {
	firstName: 'John',
	lastName: 'Doe',
};

const mockTextMessage: ChatUI.AssistantMessage = {
	id: '1',
	type: 'text',
	role: 'assistant',
	content: 'Hello world',
	read: false,
};

const mockUserMessage: ChatUI.AssistantMessage = {
	id: '2',
	type: 'text',
	role: 'user',
	content: 'Hello assistant',
	read: false,
};

describe('BaseMessage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Basic Rendering', () => {
		it('should render correctly with minimal props', () => {
			const wrapper = render(BaseMessage, {
				props: {
					message: mockTextMessage,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container).toMatchSnapshot();
		});

		it('should render user message correctly', () => {
			const wrapper = render(BaseMessage, {
				props: {
					message: mockUserMessage,
					isFirstOfRole: true,
					user: mockUser,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container).toMatchSnapshot();
		});

		it('should render with slot content', () => {
			const wrapper = render(BaseMessage, {
				props: {
					message: mockTextMessage,
					isFirstOfRole: true,
				},
				slots: {
					default: '<div class="slot-content">Test content</div>',
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.querySelector('.slot-content')).toBeInTheDocument();
		});
	});

	describe('Avatar Display', () => {
		it('should display assistant avatar for assistant messages', () => {
			const wrapper = render(BaseMessage, {
				props: {
					message: mockTextMessage,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.querySelector('.assistant-avatar')).toBeInTheDocument();
		});

		it('should display user avatar for user messages', () => {
			const wrapper = render(BaseMessage, {
				props: {
					message: mockUserMessage,
					isFirstOfRole: true,
					user: mockUser,
				},
				global: {
					stubs,
				},
			});

			const userAvatar = wrapper.container.querySelector('.n8n-avatar');
			expect(userAvatar).toBeInTheDocument();
			expect(userAvatar).toHaveAttribute('data-first-name', 'John');
			expect(userAvatar).toHaveAttribute('data-last-name', 'Doe');
		});

		it('should not display avatar when isFirstOfRole is false', () => {
			const wrapper = render(BaseMessage, {
				props: {
					message: mockTextMessage,
					isFirstOfRole: false,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.querySelector('.assistant-avatar')).not.toBeInTheDocument();
		});
	});

	describe('Role Name Display', () => {
		it('should show "Assistant" for assistant messages when isFirstOfRole is true', () => {
			const wrapper = render(BaseMessage, {
				props: {
					message: mockTextMessage,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.textContent).toContain('Assistant');
		});

		it('should show user name for user messages when isFirstOfRole is true', () => {
			const wrapper = render(BaseMessage, {
				props: {
					message: mockUserMessage,
					isFirstOfRole: true,
					user: mockUser,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.textContent).toContain('John Doe');
		});

		it('should show default "You" when user name not provided', () => {
			const wrapper = render(BaseMessage, {
				props: {
					message: mockUserMessage,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.textContent).toContain('You');
		});

		it('should not show role name when isFirstOfRole is false', () => {
			const wrapper = render(BaseMessage, {
				props: {
					message: mockTextMessage,
					isFirstOfRole: false,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.textContent).not.toContain('Assistant');
		});
	});

	describe('Rating Integration', () => {
		it('should show rating for assistant messages with showRating prop', () => {
			const wrapper = render(BaseMessage, {
				props: {
					message: mockTextMessage,
					isFirstOfRole: true,
					showRating: true,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.querySelector('.message-rating')).toBeInTheDocument();
		});

		it('should not show rating for user messages', () => {
			const wrapper = render(BaseMessage, {
				props: {
					message: mockUserMessage,
					isFirstOfRole: true,
					user: mockUser,
					showRating: true,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.querySelector('.message-rating')).not.toBeInTheDocument();
		});

		it('should not show rating when showRating is false', () => {
			const wrapper = render(BaseMessage, {
				props: {
					message: mockTextMessage,
					isFirstOfRole: true,
					showRating: false,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.querySelector('.message-rating')).not.toBeInTheDocument();
		});

		it('should forward feedback event from rating component', async () => {
			const wrapper = render(BaseMessage, {
				props: {
					message: mockTextMessage,
					isFirstOfRole: true,
					showRating: true,
				},
				global: {
					stubs,
				},
			});

			const ratingComponent = wrapper.container.querySelector('.message-rating');
			expect(ratingComponent).toBeInTheDocument();

			const feedbackData = { rating: 'positive', comment: 'Good response' };
			await fireEvent(ratingComponent!, new CustomEvent('feedback', { detail: feedbackData }));

			const emittedEvents = wrapper.emitted('feedback');
			expect(emittedEvents).toBeTruthy();
		});

		it('should pass rating style to rating component', () => {
			const wrapper = render(BaseMessage, {
				props: {
					message: mockTextMessage,
					isFirstOfRole: true,
					showRating: true,
					ratingStyle: 'minimal',
				},
				global: {
					stubs: {
						...stubs,
						'message-rating': {
							template: '<div class="message-rating" :data-style="style" />',
							props: ['style'],
						},
					},
				},
			});

			const ratingComponent = wrapper.container.querySelector('.message-rating');
			expect(ratingComponent).toHaveAttribute('data-style', 'minimal');
		});
	});

	describe('CSS Classes and Styling', () => {
		it('should apply role-specific CSS classes', () => {
			const assistantWrapper = render(BaseMessage, {
				props: {
					message: mockTextMessage,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			expect(assistantWrapper.container.querySelector('.message')).toHaveClass('assistant');

			const userWrapper = render(BaseMessage, {
				props: {
					message: mockUserMessage,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			expect(userWrapper.container.querySelector('.message')).toHaveClass('user');
		});

		it('should apply first-of-role CSS class correctly', () => {
			const firstWrapper = render(BaseMessage, {
				props: {
					message: mockTextMessage,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			expect(firstWrapper.container.querySelector('.message')).toHaveClass('first-of-role');

			const notFirstWrapper = render(BaseMessage, {
				props: {
					message: mockTextMessage,
					isFirstOfRole: false,
				},
				global: {
					stubs,
				},
			});

			expect(notFirstWrapper.container.querySelector('.message')).not.toHaveClass('first-of-role');
		});
	});

	describe('Edge Cases', () => {
		it('should handle message without type gracefully', () => {
			const malformedMessage = {
				id: '1',
				role: 'assistant',
				content: 'Test',
				read: false,
			} as ChatUI.AssistantMessage;

			const wrapper = render(BaseMessage, {
				props: {
					message: malformedMessage,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container).toBeInTheDocument();
		});

		it('should handle user with partial name', () => {
			const partialUser = { firstName: 'John' };
			const wrapper = render(BaseMessage, {
				props: {
					message: mockUserMessage,
					isFirstOfRole: true,
					user: partialUser,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.textContent).toContain('John');
		});

		it('should handle user with only lastName', () => {
			const partialUser = { lastName: 'Doe' };
			const wrapper = render(BaseMessage, {
				props: {
					message: mockUserMessage,
					isFirstOfRole: true,
					user: partialUser,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.textContent).toContain('Doe');
		});

		it('should handle empty user object', () => {
			const emptyUser = {};
			const wrapper = render(BaseMessage, {
				props: {
					message: mockUserMessage,
					isFirstOfRole: true,
					user: emptyUser,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.textContent).toContain('You');
		});
	});

	describe('Accessibility', () => {
		it('should have proper semantic structure', () => {
			const wrapper = render(BaseMessage, {
				props: {
					message: mockTextMessage,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			const messageElement = wrapper.container.querySelector('.message');
			expect(messageElement).toBeInTheDocument();
			expect(messageElement).toHaveAttribute('role', 'article');
		});

		it('should have proper aria-label for assistant messages', () => {
			const wrapper = render(BaseMessage, {
				props: {
					message: mockTextMessage,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			const messageElement = wrapper.container.querySelector('.message');
			expect(messageElement).toHaveAttribute(
				'aria-label',
				expect.stringContaining('Assistant message'),
			);
		});

		it('should have proper aria-label for user messages', () => {
			const wrapper = render(BaseMessage, {
				props: {
					message: mockUserMessage,
					isFirstOfRole: true,
					user: mockUser,
				},
				global: {
					stubs,
				},
			});

			const messageElement = wrapper.container.querySelector('.message');
			expect(messageElement).toHaveAttribute('aria-label', expect.stringContaining('Your message'));
		});
	});
});
