import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import ChatMessage from './ChatMessage.vue';
import type { ChatMessage as ChatMessageType } from '../chat.types';
import { waitFor, within } from '@testing-library/vue';
import { createMockMessage } from '../__test__/data';

const mockCopy = vi.fn();
vi.mock('@vueuse/core', async () => {
	const actual = await vi.importActual('@vueuse/core');
	return {
		...actual,
		useClipboard: () => ({
			copy: mockCopy,
			copied: { value: false },
			isSupported: { value: true },
			text: { value: '' },
		}),
	};
});

const renderComponent = createComponentRenderer(ChatMessage);

describe('ChatMessage', () => {
	let pinia: ReturnType<typeof createTestingPinia>;

	beforeEach(() => {
		pinia = createTestingPinia();
		mockCopy.mockClear();
	});

	it('should render syntax highlighting for code blocks', async () => {
		const message: ChatMessageType = createMockMessage({
			type: 'ai',
			content: '```javascript\nconst foo = "bar";\nfunction test() {\n  return true;\n}\n```',
		});

		const { container } = renderComponent({
			props: {
				message,
				compact: false,
				isEditing: false,
				hasSessionStreaming: false,
				cachedAgentDisplayName: null,
				cachedAgentIcon: null,
				containerWidth: 100,
			},
			pinia,
		});

		// Wait for highlight.js to load and apply syntax highlighting
		await waitFor(() => {
			const highlightedElements = container.querySelectorAll('.hljs-keyword');

			expect(highlightedElements.length).toBeGreaterThan(0);
		});
	});

	it('should allow to copy code block contents', async () => {
		const codeContent = 'const foo = "bar";\nfunction test() {\n  return true;\n}';
		const message: ChatMessageType = createMockMessage({
			type: 'ai',
			content: `\`\`\`javascript\n${codeContent}\n\`\`\``,
		});

		const rendered = renderComponent({
			props: {
				message,
				compact: false,
				isEditing: false,
				hasSessionStreaming: false,
				cachedAgentDisplayName: null,
				cachedAgentIcon: null,
				containerWidth: 100,
			},
			pinia,
		});

		const preElement = (await rendered.findByText(/function/)).closest('pre')!;

		preElement.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));

		(await within(preElement).findByRole('button', { name: /copy/i })).click();

		expect(mockCopy).toHaveBeenCalledWith(codeContent);
	});
});
