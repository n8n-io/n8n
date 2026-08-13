import { render } from '@testing-library/vue';
import { mount } from '@vue/test-utils';
import { vi } from 'vitest';
import { h, nextTick, ref } from 'vue';

import ChatMessage from './ChatMessage.vue';

function mockRange(width?: number) {
	const selectNodeContents = vi.fn();
	const getBoundingClientRect = vi.fn(() =>
		width === undefined ? undefined : ({ width } as DOMRect),
	);

	vi.spyOn(document, 'createRange').mockReturnValue({
		selectNodeContents,
		getBoundingClientRect,
	} as unknown as Range);

	return { selectNodeContents, getBoundingClientRect };
}

describe('N8nChatMessage', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should render and shrink-wrap a user message', () => {
		const range = mockRange(120);
		const { container, getByText } = render(ChatMessage, {
			props: { role: 'user' },
			slots: { default: 'Build a workflow' },
		});

		const message = container.firstElementChild;
		const bubble = container.querySelector<HTMLElement>('.userBubble');

		expect(getByText('Build a workflow')).toBeInTheDocument();
		expect(message).toHaveClass('userMessage');
		expect(bubble).toHaveStyle({ width: '120px', boxSizing: 'content-box' });
		expect(range.selectNodeContents).toHaveBeenCalledWith(bubble);
	});

	it('should render an assistant message without measuring it', () => {
		const range = mockRange(120);
		const { container, getByText } = render(ChatMessage, {
			props: { role: 'assistant' },
			slots: { default: 'How can I help?' },
		});

		expect(getByText('How can I help?')).toBeInTheDocument();
		expect(container.firstElementChild).toHaveClass('assistantMessage');
		expect(container.querySelector('.assistantContent')).toBeInTheDocument();
		expect(range.getBoundingClientRect).not.toHaveBeenCalled();
	});

	it('should update the user bubble width when its content changes', async () => {
		const widths = [80, 160];
		const getBoundingClientRect = vi.fn(() => ({ width: widths.shift() }) as DOMRect);
		vi.spyOn(document, 'createRange').mockReturnValue({
			selectNodeContents: vi.fn(),
			getBoundingClientRect,
		} as unknown as Range);
		const content = ref('Short message');
		const wrapper = mount(ChatMessage, {
			props: { role: 'user' },
			slots: { default: () => h('span', content.value) },
		});

		expect(wrapper.get('.userBubble').attributes('style')).toContain('width: 80px');

		content.value = 'A longer message';
		await nextTick();

		expect(wrapper.get('.userBubble').attributes('style')).toContain('width: 160px');
		expect(getBoundingClientRect).toHaveBeenCalledTimes(2);
	});

	it('should render actions only when the actions slot is provided', () => {
		const withoutActions = render(ChatMessage, {
			props: { role: 'assistant' },
			slots: { default: 'Message' },
		});

		expect(withoutActions.queryByRole('button')).not.toBeInTheDocument();

		const withActions = render(ChatMessage, {
			props: { role: 'assistant' },
			slots: { default: 'Message', actions: '<button>Copy</button>' },
		});

		expect(withActions.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
	});

	it('should render when layout bounds are unavailable', () => {
		mockRange();

		expect(() =>
			render(ChatMessage, {
				props: { role: 'user' },
				slots: { default: 'Message' },
			}),
		).not.toThrow();
	});
});
