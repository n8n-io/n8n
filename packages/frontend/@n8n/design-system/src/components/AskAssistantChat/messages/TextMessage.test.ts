import { render } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';

import TextMessage from './TextMessage.vue';
import type { ChatUI } from '../../../types/assistant';

// Mock i18n to return keys instead of translated text
vi.mock('@n8n/design-system/composables/useI18n', () => ({
	useI18n: () => ({
		t: (key: string) => key,
	}),
}));

// Mock useMarkdown
vi.mock('./useMarkdown', () => ({
	useMarkdown: () => ({
		renderMarkdown: (content: string) => `<p>${content}</p>`,
	}),
}));

const stubs = {
	BaseMessage: {
		template: '<div data-test-id="base-message-stub"><slot /></div>',
		props: ['message', 'isFirstOfRole', 'user'],
	},
	BlinkingCursor: true,
	N8nButton: true,
	N8nIcon: true,
};

const directives = {
	n8nHtml: (el: HTMLElement, binding: { value: string }) => {
		el.innerHTML = binding.value;
	},
};

beforeEach(() => {
	setActivePinia(createPinia());
});

describe('TextMessage', () => {
	const createUserMessage = (
		overrides: Partial<ChatUI.TextMessage> = {},
	): ChatUI.TextMessage & { id: string; read: boolean } => ({
		id: 'msg-1',
		type: 'text',
		role: 'user',
		content: 'Test user message content',
		read: true,
		...overrides,
	});

	const createAssistantMessage = (
		overrides: Partial<ChatUI.TextMessage> = {},
	): ChatUI.TextMessage & { id: string; read: boolean } => ({
		id: 'msg-1',
		type: 'text',
		role: 'assistant',
		content: 'Test assistant message content',
		read: true,
		...overrides,
	});

	describe('basic rendering', () => {
		it('should render user message correctly', () => {
			const wrapper = render(TextMessage, {
				props: {
					message: createUserMessage(),
					isFirstOfRole: true,
				},
				global: { stubs, directives },
			});

			expect(wrapper.getByTestId('base-message-stub')).toBeTruthy();
			expect(wrapper.container.textContent).toContain('Test user message content');
		});

		it('should render assistant message correctly', () => {
			const wrapper = render(TextMessage, {
				props: {
					message: createAssistantMessage(),
					isFirstOfRole: true,
				},
				global: { stubs, directives },
			});

			expect(wrapper.container.textContent).toContain('Test assistant message content');
		});

		it('should apply userMessage class for user role', () => {
			const wrapper = render(TextMessage, {
				props: {
					message: createUserMessage(),
					isFirstOfRole: true,
				},
				global: { stubs, directives },
			});

			const textMessage = wrapper.container.querySelector('[class*="userMessage"]');
			expect(textMessage).toBeTruthy();
		});
	});

	describe('user message expand/collapse', () => {
		it('should not show expand button for short messages', () => {
			const wrapper = render(TextMessage, {
				props: {
					message: createUserMessage({ content: 'Short message' }),
					isFirstOfRole: true,
				},
				global: { stubs, directives },
			});

			const showMoreButton = wrapper.container.querySelector('[class*="showMoreButton"]');
			expect(showMoreButton).toBeFalsy();
		});
	});

	describe('code snippet rendering', () => {
		it('should render code snippet when provided', () => {
			const wrapper = render(TextMessage, {
				props: {
					message: createAssistantMessage({
						codeSnippet: 'const x = 1;',
					}),
					isFirstOfRole: true,
				},
				global: { stubs, directives },
			});

			expect(wrapper.getByTestId('assistant-code-snippet')).toBeTruthy();
		});

		it('should not render code snippet when not provided', () => {
			const wrapper = render(TextMessage, {
				props: {
					message: createAssistantMessage(),
					isFirstOfRole: true,
				},
				global: { stubs, directives },
			});

			expect(wrapper.queryByTestId('assistant-code-snippet')).toBeFalsy();
		});
	});

	describe('streaming indicator', () => {
		it('should show blinking cursor for streaming assistant messages that are last', () => {
			const wrapper = render(TextMessage, {
				props: {
					message: createAssistantMessage(),
					isFirstOfRole: true,
					streaming: true,
					isLastMessage: true,
				},
				global: { stubs, directives },
			});

			// BlinkingCursor should be rendered (stubbed as true, so just check it's there)
			const html = wrapper.html();
			expect(html).toContain('blinking-cursor');
		});

		it('should not show blinking cursor for user messages', () => {
			const wrapper = render(TextMessage, {
				props: {
					message: createUserMessage(),
					isFirstOfRole: true,
					streaming: true,
					isLastMessage: true,
				},
				global: { stubs, directives },
			});

			// BlinkingCursor should not be rendered for user messages
			const html = wrapper.html();
			expect(html).not.toContain('blinking-cursor');
		});

		it('should not show blinking cursor when not streaming', () => {
			const wrapper = render(TextMessage, {
				props: {
					message: createAssistantMessage(),
					isFirstOfRole: true,
					streaming: false,
					isLastMessage: true,
				},
				global: { stubs, directives },
			});

			const html = wrapper.html();
			expect(html).not.toContain('blinking-cursor');
		});
	});

	describe('focused nodes chips', () => {
		it('should render focused nodes fallback when focusedNodeNames are provided and slot is not filled', () => {
			const wrapper = render(TextMessage, {
				props: {
					message: createUserMessage({
						focusedNodeNames: ['HTTP Request', 'Set Node'],
					}),
					isFirstOfRole: true,
				},
				global: { stubs, directives },
			});

			expect(wrapper.getByTestId('message-focused-nodes')).toBeTruthy();
			expect(wrapper.container.textContent).toContain("Focusing on 'HTTP Request', 'Set Node'");
		});

		it('should not render focused nodes wrapper when focusedNodeNames is empty', () => {
			const wrapper = render(TextMessage, {
				props: {
					message: createUserMessage({ focusedNodeNames: [] }),
					isFirstOfRole: true,
				},
				global: { stubs, directives },
			});

			expect(wrapper.queryByTestId('message-focused-nodes')).toBeFalsy();
		});

		it('should not render focused nodes wrapper when focusedNodeNames is undefined', () => {
			const wrapper = render(TextMessage, {
				props: {
					message: createUserMessage(),
					isFirstOfRole: true,
				},
				global: { stubs, directives },
			});

			expect(wrapper.queryByTestId('message-focused-nodes')).toBeFalsy();
		});

		it('should render focused nodes inside the user message container', () => {
			const wrapper = render(TextMessage, {
				props: {
					message: createUserMessage({
						focusedNodeNames: ['Node 1'],
					}),
					isFirstOfRole: true,
				},
				global: { stubs, directives },
			});

			const userContainer = wrapper.container.querySelector('[class*="userMessageContainer"]');
			const focusedNodes = wrapper.getByTestId('message-focused-nodes');
			expect(userContainer?.contains(focusedNodes)).toBe(true);
		});
	});

	describe('custom color', () => {
		it('should apply custom color to assistant text', () => {
			const wrapper = render(TextMessage, {
				props: {
					message: createAssistantMessage(),
					isFirstOfRole: true,
					color: 'red',
				},
				global: { stubs, directives },
			});

			const assistantText = wrapper.container.querySelector('[class*="assistantText"]');
			expect(assistantText?.getAttribute('style')).toContain('color: red');
		});

		it('should not apply style when color is not provided', () => {
			const wrapper = render(TextMessage, {
				props: {
					message: createAssistantMessage(),
					isFirstOfRole: true,
				},
				global: { stubs, directives },
			});

			const assistantText = wrapper.container.querySelector('[class*="assistantText"]');
			expect(assistantText?.getAttribute('style')).toBeFalsy();
		});
	});
});
