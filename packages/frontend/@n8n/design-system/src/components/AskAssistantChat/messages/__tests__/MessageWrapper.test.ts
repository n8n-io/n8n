import { render, fireEvent } from '@testing-library/vue';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import MessageWrapper from '../MessageWrapper.vue';
import type { ChatUI } from '@n8n/chat';

// Mock dependencies
vi.mock('../../../../composables/useI18n', () => ({
	useI18n: vi.fn(() => ({
		t: vi.fn((key: string) => key),
	})),
}));

const stubs = {
	'base-message': {
		template: '<div class="base-message"><slot /></div>',
		props: ['message', 'isFirstOfRole', 'user', 'showRating', 'ratingStyle'],
		emits: ['feedback'],
	},
	'text-message': {
		template: '<div class="text-message" />',
		props: ['message', 'streaming', 'isLastMessage'],
	},
	'block-message': {
		template: '<div class="block-message" />',
		props: ['message', 'streaming', 'isLastMessage'],
	},
	'code-diff-message': {
		template: '<div class="code-diff-message" />',
		props: ['message'],
		emits: ['codeReplace', 'codeUndo'],
	},
	'error-message': {
		template: '<div class="error-message" />',
		props: ['message'],
	},
	'event-message': {
		template: '<div class="event-message" />',
		props: ['message'],
	},
	'tool-message': {
		template: '<div class="tool-message" />',
		props: ['message', 'showProgressLogs'],
	},
};

const mockUser = {
	firstName: 'John',
	lastName: 'Doe',
};

const createMessage = (
	type: string,
	overrides: Partial<ChatUI.AssistantMessage> = {},
): ChatUI.AssistantMessage => ({
	id: '1',
	type: type as any,
	role: 'assistant',
	content: 'Test content',
	read: false,
	...overrides,
});

describe('MessageWrapper', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Component Selection', () => {
		it('should render TextMessage for text type', () => {
			const message = createMessage('text');
			const wrapper = render(MessageWrapper, {
				props: {
					message,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.querySelector('.text-message')).toBeInTheDocument();
			expect(wrapper.container.querySelector('.base-message')).toBeInTheDocument();
		});

		it('should render BlockMessage for block type', () => {
			const message = createMessage('block', {
				title: 'Block Title',
			});
			const wrapper = render(MessageWrapper, {
				props: {
					message,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.querySelector('.block-message')).toBeInTheDocument();
		});

		it('should render CodeDiffMessage for code-diff type', () => {
			const message = createMessage('code-diff', {
				description: 'Code changes',
				codeDiff: '@@ -1 +1 @@\n-old\n+new',
			});
			const wrapper = render(MessageWrapper, {
				props: {
					message,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.querySelector('.code-diff-message')).toBeInTheDocument();
		});

		it('should render ErrorMessage for error type', () => {
			const message = createMessage('error');
			const wrapper = render(MessageWrapper, {
				props: {
					message,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.querySelector('.error-message')).toBeInTheDocument();
		});

		it('should render EventMessage for event type', () => {
			const message = createMessage('event', {
				eventName: 'end-session',
			});
			const wrapper = render(MessageWrapper, {
				props: {
					message,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.querySelector('.event-message')).toBeInTheDocument();
		});

		it('should render ToolMessage for tool type', () => {
			const message = createMessage('tool', {
				toolName: 'test_tool',
				status: 'completed',
			});
			const wrapper = render(MessageWrapper, {
				props: {
					message,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.querySelector('.tool-message')).toBeInTheDocument();
		});

		it('should render nothing for unsupported message types', () => {
			const message = createMessage('agent-suggestion');
			const wrapper = render(MessageWrapper, {
				props: {
					message,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.querySelector('.base-message')).toBeInTheDocument();
			expect(wrapper.container.querySelector('.text-message')).not.toBeInTheDocument();
			expect(wrapper.container.querySelector('.block-message')).not.toBeInTheDocument();
		});

		it('should render nothing for workflow-updated type', () => {
			const message = createMessage('workflow-updated');
			const wrapper = render(MessageWrapper, {
				props: {
					message,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.querySelector('.base-message')).toBeInTheDocument();
			expect(wrapper.container.querySelector('.text-message')).not.toBeInTheDocument();
		});
	});

	describe('Props Forwarding', () => {
		it('should forward base props to BaseMessage', () => {
			const message = createMessage('text');
			const wrapper = render(MessageWrapper, {
				props: {
					message,
					isFirstOfRole: true,
					user: mockUser,
					showRating: true,
					ratingStyle: 'minimal',
				},
				global: {
					stubs: {
						...stubs,
						'base-message': {
							template:
								'<div class="base-message" :data-first-of-role="isFirstOfRole" :data-show-rating="showRating" :data-rating-style="ratingStyle"><slot /></div>',
							props: ['message', 'isFirstOfRole', 'user', 'showRating', 'ratingStyle'],
						},
					},
				},
			});

			const baseMessage = wrapper.container.querySelector('.base-message');
			expect(baseMessage).toHaveAttribute('data-first-of-role', 'true');
			expect(baseMessage).toHaveAttribute('data-show-rating', 'true');
			expect(baseMessage).toHaveAttribute('data-rating-style', 'minimal');
		});

		it('should forward streaming and isLastMessage to text messages', () => {
			const message = createMessage('text');
			const wrapper = render(MessageWrapper, {
				props: {
					message,
					isFirstOfRole: true,
					streaming: true,
					isLastMessage: true,
				},
				global: {
					stubs: {
						...stubs,
						'text-message': {
							template:
								'<div class="text-message" :data-streaming="streaming" :data-is-last="isLastMessage" />',
							props: ['message', 'streaming', 'isLastMessage'],
						},
					},
				},
			});

			const textMessage = wrapper.container.querySelector('.text-message');
			expect(textMessage).toHaveAttribute('data-streaming', 'true');
			expect(textMessage).toHaveAttribute('data-is-last', 'true');
		});

		it('should forward showProgressLogs to tool messages', () => {
			const message = createMessage('tool', {
				toolName: 'test_tool',
				status: 'running',
			});
			const wrapper = render(MessageWrapper, {
				props: {
					message,
					isFirstOfRole: true,
					showProgressLogs: true,
				},
				global: {
					stubs: {
						...stubs,
						'tool-message': {
							template: '<div class="tool-message" :data-show-progress="showProgressLogs" />',
							props: ['message', 'showProgressLogs'],
						},
					},
				},
			});

			const toolMessage = wrapper.container.querySelector('.tool-message');
			expect(toolMessage).toHaveAttribute('data-show-progress', 'true');
		});
	});

	describe('Event Forwarding', () => {
		it('should forward feedback events from BaseMessage', async () => {
			const message = createMessage('text');
			const wrapper = render(MessageWrapper, {
				props: {
					message,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			const baseMessage = wrapper.container.querySelector('.base-message');
			const feedbackData = { rating: 'positive' };

			await fireEvent(baseMessage!, new CustomEvent('feedback', { detail: feedbackData }));

			const emittedEvents = wrapper.emitted('feedback');
			expect(emittedEvents).toBeTruthy();
		});

		it('should forward codeReplace events from CodeDiffMessage', async () => {
			const message = createMessage('code-diff', {
				codeDiff: '@@ -1 +1 @@\n-old\n+new',
			});
			const wrapper = render(MessageWrapper, {
				props: {
					message,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			const codeDiffMessage = wrapper.container.querySelector('.code-diff-message');
			await fireEvent(codeDiffMessage!, new CustomEvent('codeReplace'));

			const emittedEvents = wrapper.emitted('codeReplace');
			expect(emittedEvents).toBeTruthy();
		});

		it('should forward codeUndo events from CodeDiffMessage', async () => {
			const message = createMessage('code-diff', {
				codeDiff: '@@ -1 +1 @@\n-old\n+new',
			});
			const wrapper = render(MessageWrapper, {
				props: {
					message,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			const codeDiffMessage = wrapper.container.querySelector('.code-diff-message');
			await fireEvent(codeDiffMessage!, new CustomEvent('codeUndo'));

			const emittedEvents = wrapper.emitted('codeUndo');
			expect(emittedEvents).toBeTruthy();
		});
	});

	describe('Edge Cases', () => {
		it('should handle message with unknown type gracefully', () => {
			const message = createMessage('unknown-type');
			const wrapper = render(MessageWrapper, {
				props: {
					message,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.querySelector('.base-message')).toBeInTheDocument();
			expect(wrapper.container.textContent).toBe(''); // No specific component rendered
		});

		it('should handle message without type property', () => {
			const message = {
				id: '1',
				role: 'assistant',
				content: 'Test',
				read: false,
			} as ChatUI.AssistantMessage;

			const wrapper = render(MessageWrapper, {
				props: {
					message,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.querySelector('.base-message')).toBeInTheDocument();
		});

		it('should handle null/undefined streaming props', () => {
			const message = createMessage('text');
			const wrapper = render(MessageWrapper, {
				props: {
					message,
					isFirstOfRole: true,
					streaming: null,
					isLastMessage: undefined,
				},
				global: {
					stubs,
				},
			});

			expect(wrapper.container.querySelector('.text-message')).toBeInTheDocument();
		});
	});

	describe('Component Integration', () => {
		it('should maintain proper component hierarchy', () => {
			const message = createMessage('text');
			const wrapper = render(MessageWrapper, {
				props: {
					message,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			const baseMessage = wrapper.container.querySelector('.base-message');
			const textMessage = wrapper.container.querySelector('.text-message');

			expect(baseMessage).toBeInTheDocument();
			expect(textMessage).toBeInTheDocument();
			expect(baseMessage).toContainElement(textMessage);
		});

		it('should pass all required props to child components', () => {
			const message = createMessage('block', {
				title: 'Test Title',
				content: 'Test Content',
			});

			const wrapper = render(MessageWrapper, {
				props: {
					message,
					isFirstOfRole: false,
					streaming: true,
					isLastMessage: false,
				},
				global: {
					stubs: {
						...stubs,
						'base-message': {
							template:
								'<div class="base-message" :data-message-id="message.id" :data-first="isFirstOfRole"><slot /></div>',
							props: ['message', 'isFirstOfRole', 'user', 'showRating', 'ratingStyle'],
						},
						'block-message': {
							template:
								'<div class="block-message" :data-title="message.title" :data-streaming="streaming" />',
							props: ['message', 'streaming', 'isLastMessage'],
						},
					},
				},
			});

			const baseMessage = wrapper.container.querySelector('.base-message');
			const blockMessage = wrapper.container.querySelector('.block-message');

			expect(baseMessage).toHaveAttribute('data-message-id', '1');
			expect(baseMessage).toHaveAttribute('data-first', 'false');
			expect(blockMessage).toHaveAttribute('data-title', 'Test Title');
			expect(blockMessage).toHaveAttribute('data-streaming', 'true');
		});
	});

	describe('Conditional Rendering Logic', () => {
		it('should render appropriate component based on message type switching', async () => {
			const message = createMessage('text');
			const wrapper = render(MessageWrapper, {
				props: {
					message,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			// Initial render - text message
			expect(wrapper.container.querySelector('.text-message')).toBeInTheDocument();
			expect(wrapper.container.querySelector('.error-message')).not.toBeInTheDocument();

			// Update to error message
			const errorMessage = createMessage('error');
			await wrapper.rerender({
				message: errorMessage,
				isFirstOfRole: true,
			});

			expect(wrapper.container.querySelector('.text-message')).not.toBeInTheDocument();
			expect(wrapper.container.querySelector('.error-message')).toBeInTheDocument();
		});

		it('should handle rapid message type changes', async () => {
			const initialMessage = createMessage('text');
			const wrapper = render(MessageWrapper, {
				props: {
					message: initialMessage,
					isFirstOfRole: true,
				},
				global: {
					stubs,
				},
			});

			const messageTypes = ['block', 'error', 'event', 'tool', 'text'];

			for (const type of messageTypes) {
				const newMessage = createMessage(type);
				await wrapper.rerender({
					message: newMessage,
					isFirstOfRole: true,
				});

				expect(wrapper.container.querySelector(`.${type}-message`)).toBeInTheDocument();
			}
		});
	});
});
