import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import ChatMessage from './ChatMessage.vue';
import type { ChatMessage as ChatMessageType } from '../chat.types';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createMockMessage } from '../__test__/data';

const renderComponent = createComponentRenderer(ChatMessage);

describe('ChatMessage', () => {
	let pinia: ReturnType<typeof createTestingPinia>;

	beforeEach(() => {
		pinia = createTestingPinia();
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
		const user = userEvent.setup();
		const mockCopy = vi.spyOn(navigator.clipboard, 'writeText');

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

		await user.click(await rendered.findByRole('button', { name: 'Copy code' }));

		/** Fenced code includes the newline before the closing fence. */
		expect(mockCopy).toHaveBeenCalledWith(`${codeContent}\n`);
		expect(await rendered.findByRole('button', { name: 'Copied to clipboard' })).toBeVisible();
	});

	it('should render footnote references as pill spans and hide the definition block', async () => {
		const footnoteContent = 'Akhenaten - Wikipedia.pdf, page 3';
		const message: ChatMessageType = createMockMessage({
			type: 'ai',
			content: [
				{
					type: 'text',
					content: `Akhenaten ruled Egypt[^1].\n\n[^1]: ${footnoteContent}`,
				},
			],
		});

		const { container } = renderComponent({
			props: {
				message,
				compact: false,
				isEditing: false,
				isEditSubmitting: false,
				hasSessionStreaming: false,
				cachedAgentDisplayName: null,
				cachedAgentIcon: null,
				acceptedMimeTypes: '',
			},
			pinia,
		});

		await waitFor(() => {
			const footnoteSpan = container.querySelector(`span[title="${footnoteContent}"]`);
			expect(footnoteSpan).not.toBeNull();
			// Text is truncated: short last word ('3') falls through to fixed-suffix,
			// preserving the file extension and page context
			expect(footnoteSpan?.textContent).toBe('Akhenaten - W…pdf, page 3');
			expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
		});
	});

	it('should strip orphaned footnote references that have no matching definition', async () => {
		const message: ChatMessageType = createMockMessage({
			type: 'ai',
			content: [
				{
					type: 'text',
					content: 'Text with orphaned[^missing] reference.',
				},
			],
		});

		const { container } = renderComponent({
			props: {
				message,
				compact: false,
				isEditing: false,
				isEditSubmitting: false,
				hasSessionStreaming: false,
				cachedAgentDisplayName: null,
				cachedAgentIcon: null,
				acceptedMimeTypes: '',
			},
			pinia,
		});

		await waitFor(() => {
			expect(container.textContent).not.toContain('[^missing]');
		});
	});
});
