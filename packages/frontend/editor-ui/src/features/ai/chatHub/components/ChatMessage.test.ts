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
			content: [
				{
					type: 'text',
					content: '```javascript\nconst foo = "bar";\nfunction test() {\n  return true;\n}\n```',
				},
			],
		});

		const { container } = renderComponent({
			props: {
				message,
				compact: false,
				isEditing: false,
				hasSessionStreaming: false,
				cachedAgentDisplayName: null,
				cachedAgentIcon: null,
			},
			pinia,
		});

		// Wait for highlight.js to load and apply syntax highlighting
		await waitFor(() => {
			const highlightedElements = container.querySelectorAll('.hljs-keyword');

			expect(highlightedElements.length).toBeGreaterThan(0);
		});
	});

	it('should render KaTeX inline math expressions', async () => {
		const message: ChatMessageType = createMockMessage({
			type: 'ai',
			content: [
				{
					type: 'text',
					content: 'The quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$',
				},
			],
		});

		const { container } = renderComponent({
			props: {
				message,
				compact: false,
				isEditing: false,
				hasSessionStreaming: false,
				cachedAgentDisplayName: null,
				cachedAgentIcon: null,
			},
			pinia,
		});

		await waitFor(() => {
			const katexElements = container.querySelectorAll('.katex');
			expect(katexElements.length).toBeGreaterThan(0);
		});
	});

	it('should render KaTeX block math expressions', async () => {
		const message: ChatMessageType = createMockMessage({
			type: 'ai',
			content: [{ type: 'text', content: '$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$' }],
		});

		const { container } = renderComponent({
			props: {
				message,
				compact: false,
				isEditing: false,
				hasSessionStreaming: false,
				cachedAgentDisplayName: null,
				cachedAgentIcon: null,
			},
			pinia,
		});

		await waitFor(() => {
			const katexDisplayElements = container.querySelectorAll('.katex-display');
			expect(katexDisplayElements.length).toBeGreaterThan(0);
		});
	});

	it('should allow to copy code block contents', async () => {
		const codeContent = 'const foo = "bar";\nfunction test() {\n  return true;\n}';
		const message: ChatMessageType = createMockMessage({
			type: 'ai',
			content: [{ type: 'text', content: `\`\`\`javascript\n${codeContent}\n\`\`\`` }],
		});

		const rendered = renderComponent({
			props: {
				message,
				compact: false,
				isEditing: false,
				hasSessionStreaming: false,
				cachedAgentDisplayName: null,
				cachedAgentIcon: null,
			},
			pinia,
		});

		const preElement = (await rendered.findByText(/function/)).closest('pre')!;

		preElement.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));

		(await within(preElement).findByRole('button', { name: /copy/i })).click();

		expect(mockCopy).toHaveBeenCalledWith(codeContent);
	});
});
