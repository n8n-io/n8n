import { render, fireEvent } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';

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

// Mock vueuse composables for RestoreVersionLink
vi.mock('@vueuse/core', () => ({
	onClickOutside: vi.fn(),
	useElementBounding: vi.fn(() => ({
		bottom: { value: 100 },
		right: { value: 200 },
		width: { value: 150 },
	})),
}));

const stubs = {
	BaseMessage: {
		template: '<div data-test-id="base-message-stub"><slot /></div>',
		props: ['message', 'isFirstOfRole', 'user'],
	},
	BlinkingCursor: true,
	N8nButton: true,
	N8nIcon: true,
	RestoreVersionConfirm: {
		name: 'RestoreVersionConfirm',
		props: ['versionId', 'pruneTimeHours'],
		emits: ['confirm', 'cancel', 'showVersion'],
		template: `
			<div data-test-id="restore-version-confirm-stub">
				<button data-test-id="confirm-restore" @click="$emit('confirm')">Confirm</button>
				<button data-test-id="cancel-restore" @click="$emit('cancel')">Cancel</button>
				<button data-test-id="show-version" @click="$emit('showVersion', versionId)">Show</button>
			</div>
		`,
	},
	Teleport: {
		template: '<div data-test-id="teleport-stub"><slot /></div>',
	},
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

	describe('RestoreVersionLink integration', () => {
		it('should render RestoreVersionLink when user message has revertVersion', () => {
			const wrapper = render(TextMessage, {
				props: {
					message: createUserMessage({
						revertVersion: {
							id: 'version-123',
							createdAt: new Date().toISOString(),
						},
					}),
					isFirstOfRole: true,
				},
				global: { stubs, directives },
			});

			// RestoreVersionLink should be rendered (check for its structure)
			const restoreWrapper = wrapper.container.querySelector('[class*="restoreWrapper"]');
			expect(restoreWrapper).toBeTruthy();
		});

		it('should not render RestoreVersionLink when user message has no revertVersion', () => {
			const wrapper = render(TextMessage, {
				props: {
					message: createUserMessage(),
					isFirstOfRole: true,
				},
				global: { stubs, directives },
			});

			const restoreWrapper = wrapper.container.querySelector('[class*="restoreWrapper"]');
			expect(restoreWrapper).toBeFalsy();
		});

		it('should not render RestoreVersionLink for assistant messages even with revertVersion', () => {
			const wrapper = render(TextMessage, {
				props: {
					message: createAssistantMessage({
						revertVersion: {
							id: 'version-123',
							createdAt: new Date().toISOString(),
						},
					}),
					isFirstOfRole: true,
				},
				global: { stubs, directives },
			});

			const restoreWrapper = wrapper.container.querySelector('[class*="restoreWrapper"]');
			expect(restoreWrapper).toBeFalsy();
		});

		it('should pass streaming prop to RestoreVersionLink', () => {
			const wrapper = render(TextMessage, {
				props: {
					message: createUserMessage({
						revertVersion: {
							id: 'version-123',
							createdAt: new Date().toISOString(),
						},
					}),
					isFirstOfRole: true,
					streaming: true,
				},
				global: { stubs, directives },
			});

			// When streaming, the restore button should be disabled
			const button = wrapper.container.querySelector('[class*="restoreWrapper"] button[disabled]');
			expect(button).toBeTruthy();
		});

		it('should pass pruneTimeHours prop to RestoreVersionLink', async () => {
			const wrapper = render(TextMessage, {
				props: {
					message: createUserMessage({
						revertVersion: {
							id: 'version-123',
							createdAt: new Date().toISOString(),
						},
					}),
					isFirstOfRole: true,
					pruneTimeHours: 72,
				},
				global: { stubs, directives },
			});

			// Click to open the confirm dialog
			const restoreButton = wrapper.container.querySelector('[class*="restoreWrapper"] button');
			expect(restoreButton).toBeTruthy();
			await fireEvent.click(restoreButton!);
			await nextTick();

			// Verify the confirm dialog is shown
			expect(wrapper.queryByTestId('restore-version-confirm-stub')).toBeTruthy();
		});

		it('should emit restoreConfirm with versionId and messageId when confirm is triggered', async () => {
			const wrapper = render(TextMessage, {
				props: {
					message: createUserMessage({
						id: 'msg-abc',
						revertVersion: {
							id: 'version-xyz',
							createdAt: new Date().toISOString(),
						},
					}),
					isFirstOfRole: true,
				},
				global: { stubs, directives },
			});

			// Open the confirm dialog
			const restoreButton = wrapper.container.querySelector('[class*="restoreWrapper"] button');
			await fireEvent.click(restoreButton!);
			await nextTick();

			// Click confirm
			const confirmButton = wrapper.getByTestId('confirm-restore');
			await fireEvent.click(confirmButton);
			await nextTick();

			expect(wrapper.emitted()).toHaveProperty('restoreConfirm');
			expect(wrapper.emitted().restoreConfirm[0]).toEqual(['version-xyz', 'msg-abc']);
		});

		it('should emit restoreCancel when cancel is triggered', async () => {
			const wrapper = render(TextMessage, {
				props: {
					message: createUserMessage({
						revertVersion: {
							id: 'version-123',
							createdAt: new Date().toISOString(),
						},
					}),
					isFirstOfRole: true,
				},
				global: { stubs, directives },
			});

			// Open the confirm dialog
			const restoreButton = wrapper.container.querySelector('[class*="restoreWrapper"] button');
			await fireEvent.click(restoreButton!);
			await nextTick();

			// Click cancel
			const cancelButton = wrapper.getByTestId('cancel-restore');
			await fireEvent.click(cancelButton);
			await nextTick();

			expect(wrapper.emitted()).toHaveProperty('restoreCancel');
		});

		it('should emit showVersion with versionId when show version is triggered', async () => {
			const wrapper = render(TextMessage, {
				props: {
					message: createUserMessage({
						revertVersion: {
							id: 'version-show-test',
							createdAt: new Date().toISOString(),
						},
					}),
					isFirstOfRole: true,
				},
				global: { stubs, directives },
			});

			// Open the confirm dialog
			const restoreButton = wrapper.container.querySelector('[class*="restoreWrapper"] button');
			await fireEvent.click(restoreButton!);
			await nextTick();

			// Click show version
			const showButton = wrapper.getByTestId('show-version');
			await fireEvent.click(showButton);
			await nextTick();

			expect(wrapper.emitted()).toHaveProperty('showVersion');
			expect(wrapper.emitted().showVersion[0]).toEqual(['version-show-test']);
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
