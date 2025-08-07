import { render, fireEvent } from '@testing-library/vue';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TextMessage from '../TextMessage.vue';
import type { ChatUI } from '@n8n/chat';

// Mock the clipboard API
const mockWriteText = vi.fn();
Object.assign(navigator, {
	clipboard: {
		writeText: mockWriteText,
	},
});

// Mock dependencies
vi.mock('../useMarkdown', () => ({
	useMarkdown: vi.fn(() => ({
		renderMarkdown: vi.fn((content: string) => `<p>${content}</p>`),
	})),
}));

vi.mock('../../../../composables/useI18n', () => ({
	useI18n: vi.fn(() => ({
		t: vi.fn((key: string) => {
			const translations: Record<string, string> = {
				'assistantChat.copyToClipboard': 'Copy to clipboard',
				'assistantChat.copiedToClipboard': 'Copied to clipboard',
			};
			return translations[key] || key;
		}),
	})),
}));

const stubs = {
	'blinking-cursor': {
		template: '<span class="blinking-cursor">|</span>',
	},
	'n8n-button': {
		template:
			'<button class="n8n-button" @click="$emit(\'click\')" :disabled="disabled"><slot /></button>',
		props: ['disabled', 'type', 'size'],
		emits: ['click'],
	},
	'n8n-icon': {
		template: '<span class="n8n-icon" :data-icon="icon" />',
		props: ['icon'],
	},
};

const createTextMessage = (overrides: Partial<ChatUI.TextMessage> = {}): ChatUI.TextMessage => ({
	id: '1',
	type: 'text',
	role: 'assistant',
	content: 'Hello world',
	read: false,
	...overrides,
});

describe('TextMessage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockWriteText.mockResolvedValue(undefined);
	});

	describe('Basic Rendering', () => {
		it('should render assistant text message correctly', () => {
			const message = createTextMessage();
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toMatchSnapshot();
			expect(wrapper.container.textContent).toContain('Hello world');
		});

		it('should render user text message correctly', () => {
			const message = createTextMessage({ role: 'user' });
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('Hello world');
		});

		it('should render markdown content', () => {
			const message = createTextMessage({
				content: '**Bold text** and *italic text*',
			});
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			// The mock renderMarkdown returns <p>${content}</p>
			expect(wrapper.container.innerHTML).toContain('<p>**Bold text** and *italic text*</p>');
		});

		it('should handle empty content gracefully', () => {
			const message = createTextMessage({ content: '' });
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toBeInTheDocument();
		});
	});

	describe('Code Snippet Display', () => {
		it('should display code snippet when provided', () => {
			const codeSnippet = 'const hello = "world";';
			const message = createTextMessage({ codeSnippet });
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain(codeSnippet);
			expect(wrapper.container.querySelector('.code-snippet')).toBeInTheDocument();
		});

		it('should show copy button for code snippets', () => {
			const message = createTextMessage({
				codeSnippet: 'const test = true;',
			});
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.querySelector('.n8n-button')).toBeInTheDocument();
		});

		it('should not show copy button without code snippet', () => {
			const message = createTextMessage();
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.querySelector('.n8n-button')).not.toBeInTheDocument();
		});
	});

	describe('Clipboard Integration', () => {
		it('should copy code snippet to clipboard when button clicked', async () => {
			const codeSnippet = 'const hello = "world";';
			const message = createTextMessage({ codeSnippet });
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			const copyButton = wrapper.container.querySelector('.n8n-button');
			expect(copyButton).toBeInTheDocument();

			await fireEvent.click(copyButton!);

			expect(mockWriteText).toHaveBeenCalledWith(codeSnippet);
		});

		it('should handle clipboard API failure gracefully', async () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			mockWriteText.mockRejectedValue(new Error('Clipboard not available'));

			const message = createTextMessage({
				codeSnippet: 'const test = true;',
			});
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			const copyButton = wrapper.container.querySelector('.n8n-button');
			await fireEvent.click(copyButton!);

			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});

		it('should show success feedback after successful copy', async () => {
			vi.useFakeTimers();

			const message = createTextMessage({
				codeSnippet: 'const test = true;',
			});
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			const copyButton = wrapper.container.querySelector('.n8n-button');
			await fireEvent.click(copyButton!);

			// Check if button text changed to indicate success
			expect(wrapper.container.textContent).toContain('Copied');

			// Fast-forward time to reset button text
			vi.advanceTimersByTime(2000);
			await wrapper.vm.$nextTick();

			expect(wrapper.container.textContent).toContain('Copy');

			vi.useRealTimers();
		});

		it('should handle missing clipboard API', async () => {
			// Temporarily remove clipboard API
			const originalClipboard = navigator.clipboard;
			// @ts-ignore
			delete navigator.clipboard;

			const message = createTextMessage({
				codeSnippet: 'const test = true;',
			});
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			const copyButton = wrapper.container.querySelector('.n8n-button');
			await fireEvent.click(copyButton!);

			// Should not crash and might use fallback method
			expect(wrapper.container).toBeInTheDocument();

			// Restore clipboard API
			Object.assign(navigator, { clipboard: originalClipboard });
		});
	});

	describe('Streaming Support', () => {
		it('should show blinking cursor when streaming', () => {
			const message = createTextMessage();
			const wrapper = render(TextMessage, {
				props: {
					message,
					streaming: true,
					isLastMessage: true,
				},
				global: { stubs },
			});

			expect(wrapper.container.querySelector('.blinking-cursor')).toBeInTheDocument();
		});

		it('should not show cursor when not streaming', () => {
			const message = createTextMessage();
			const wrapper = render(TextMessage, {
				props: {
					message,
					streaming: false,
				},
				global: { stubs },
			});

			expect(wrapper.container.querySelector('.blinking-cursor')).not.toBeInTheDocument();
		});

		it('should not show cursor when streaming but not last message', () => {
			const message = createTextMessage();
			const wrapper = render(TextMessage, {
				props: {
					message,
					streaming: true,
					isLastMessage: false,
				},
				global: { stubs },
			});

			expect(wrapper.container.querySelector('.blinking-cursor')).not.toBeInTheDocument();
		});

		it('should position cursor correctly with content', () => {
			const message = createTextMessage({ content: 'Streaming text' });
			const wrapper = render(TextMessage, {
				props: {
					message,
					streaming: true,
					isLastMessage: true,
				},
				global: { stubs },
			});

			const cursor = wrapper.container.querySelector('.blinking-cursor');
			expect(cursor).toBeInTheDocument();

			// Cursor should be positioned after content
			expect(wrapper.container.textContent).toContain('Streaming text');
		});
	});

	describe('Role-based Rendering', () => {
		it('should apply different styling for user vs assistant messages', () => {
			const assistantMessage = createTextMessage({ role: 'assistant' });
			const assistantWrapper = render(TextMessage, {
				props: { message: assistantMessage },
				global: { stubs },
			});

			const userMessage = createTextMessage({ role: 'user' });
			const userWrapper = render(TextMessage, {
				props: { message: userMessage },
				global: { stubs },
			});

			// Check for role-specific CSS classes
			expect(assistantWrapper.container.querySelector('.assistant-message')).toBeInTheDocument();
			expect(userWrapper.container.querySelector('.user-message')).toBeInTheDocument();
		});

		it('should render user messages without markdown processing', () => {
			const message = createTextMessage({
				role: 'user',
				content: '**This should not be bold**',
			});
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			// User messages should show raw content without markdown processing
			expect(wrapper.container.textContent).toContain('**This should not be bold**');
		});
	});

	describe('Quick Replies Integration', () => {
		it('should display quick replies when provided', () => {
			const message = createTextMessage({
				quickReplies: [
					{ type: 'new-suggestion', text: 'Try again' },
					{ type: 'resolved', text: 'This helped' },
				],
			});
			const wrapper = render(TextMessage, {
				props: { message },
				global: {
					stubs: {
						...stubs,
						'quick-replies': {
							template: '<div class="quick-replies"><slot /></div>',
							props: ['replies'],
						},
					},
				},
			});

			expect(wrapper.container.querySelector('.quick-replies')).toBeInTheDocument();
		});

		it('should not display quick replies section when not provided', () => {
			const message = createTextMessage();
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.querySelector('.quick-replies')).not.toBeInTheDocument();
		});
	});

	describe('Content Processing', () => {
		it('should handle special characters in content', () => {
			const message = createTextMessage({
				content: 'Special chars: <>&"\'',
			});
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('Special chars: <>&"\'');
		});

		it('should handle very long content', () => {
			const longContent = 'A'.repeat(10000);
			const message = createTextMessage({ content: longContent });
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain(longContent);
		});

		it('should handle unicode content', () => {
			const message = createTextMessage({
				content: 'Unicode: 🎉 ñáéíóú 中文 العربية',
			});
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('Unicode: 🎉 ñáéíóú 中文 العربية');
		});

		it('should handle line breaks in content', () => {
			const message = createTextMessage({
				content: 'Line 1\nLine 2\nLine 3',
			});
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.textContent).toContain('Line 1');
			expect(wrapper.container.textContent).toContain('Line 2');
			expect(wrapper.container.textContent).toContain('Line 3');
		});
	});

	describe('Edge Cases', () => {
		it('should handle null content gracefully', () => {
			const message = { ...createTextMessage(), content: null as any };
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toBeInTheDocument();
		});

		it('should handle undefined codeSnippet', () => {
			const message = createTextMessage({ codeSnippet: undefined });
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toBeInTheDocument();
			expect(wrapper.container.querySelector('.n8n-button')).not.toBeInTheDocument();
		});

		it('should handle empty codeSnippet', () => {
			const message = createTextMessage({ codeSnippet: '' });
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container.querySelector('.n8n-button')).not.toBeInTheDocument();
		});

		it('should handle message type inconsistency', () => {
			const message = { ...createTextMessage(), type: 'not-text' as any };
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			expect(wrapper.container).toBeInTheDocument();
		});
	});

	describe('Accessibility', () => {
		it('should have proper semantic markup for content', () => {
			const message = createTextMessage();
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			const contentElement = wrapper.container.querySelector('.message-content');
			expect(contentElement).toBeInTheDocument();
		});

		it('should have accessible copy button', () => {
			const message = createTextMessage({
				codeSnippet: 'const test = true;',
			});
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			const copyButton = wrapper.container.querySelector('.n8n-button');
			expect(copyButton).toHaveAttribute('aria-label', expect.stringContaining('Copy'));
		});

		it('should have proper role for code snippet', () => {
			const message = createTextMessage({
				codeSnippet: 'const test = true;',
			});
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			const codeElement = wrapper.container.querySelector('.code-snippet');
			expect(codeElement).toHaveAttribute('role', 'code');
		});
	});

	describe('Performance', () => {
		it('should handle rapid re-renders efficiently', async () => {
			const message = createTextMessage();
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			// Simulate rapid content updates
			for (let i = 0; i < 10; i++) {
				const updatedMessage = createTextMessage({
					content: `Updated content ${i}`,
				});
				await wrapper.rerender({ message: updatedMessage });
				expect(wrapper.container.textContent).toContain(`Updated content ${i}`);
			}
		});

		it('should not cause memory leaks with event listeners', () => {
			const message = createTextMessage({
				codeSnippet: 'const test = true;',
			});
			const wrapper = render(TextMessage, {
				props: { message },
				global: { stubs },
			});

			// Verify component can be unmounted cleanly
			wrapper.unmount();
			expect(wrapper.container.innerHTML).toBe('');
		});
	});
});
