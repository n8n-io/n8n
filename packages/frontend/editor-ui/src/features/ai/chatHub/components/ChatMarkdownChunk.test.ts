import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ChatMarkdownChunk from './ChatMarkdownChunk.vue';
import ChatMarkdown from '@/features/ai/shared/components/ChatMarkdown/ChatMarkdown.vue';
import ChatButtons from './ChatButtons.vue';

describe('ChatMarkdownChunk', () => {
	it.each(['pill', 'normal'] as const)(
		'uses shared markdown with %s footnotes',
		(footnoteStyle) => {
			const wrapper = mount(ChatMarkdownChunk, {
				props: {
					source: { type: 'text', content: '$x$ [^1]' },
					singlePre: true,
					footnoteStyle,
				},
				global: { stubs: { ChatMarkdown: true } },
			});

			expect(wrapper.getComponent(ChatMarkdown).props()).toMatchObject({
				content: '$x$ [^1]',
				singlePre: true,
				options: { math: true, footnotes: footnoteStyle },
			});
		},
	);

	it('keeps buttons with shared markdown', () => {
		const wrapper = mount(ChatMarkdownChunk, {
			props: {
				source: { type: 'with-buttons', content: 'Choose', buttons: [] },
				isButtonsDisabled: true,
			},
			global: { stubs: { ChatMarkdown: true, ChatButtons: true } },
		});

		expect(wrapper.getComponent(ChatMarkdown).props('content')).toBe('Choose');
		expect(wrapper.getComponent(ChatButtons).props('isDisabled')).toBe(true);
	});
});
