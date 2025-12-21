import { describe, it, expect, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import ChatMessage from './ChatMessage.vue';
import type { ChatMessage as ChatMessageType } from '../chat.types';
import { waitFor } from '@testing-library/vue';
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
});
