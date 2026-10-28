import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ChatHubMarkdownChunk from './ChatHubMarkdownChunk.vue';
import ChatMarkdown from '@/features/ai/shared/components/ChatMarkdown/ChatMarkdown.vue';
import ChatHubButtons from './ChatHubButtons.vue';

describe('ChatHubMarkdownChunk', () => {
	it.each(['pill', 'normal'] as const)(
		'uses shared markdown with %s footnotes',
		(footnoteStyle) => {
			const wrapper = mount(ChatHubMarkdownChunk, {
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
		const wrapper = mount(ChatHubMarkdownChunk, {
			props: {
				source: { type: 'with-buttons', content: 'Choose', buttons: [], blockUserInput: false },
				isButtonsDisabled: true,
			},
			global: { stubs: { ChatMarkdown: true, ChatHubButtons: true } },
		});

		expect(wrapper.getComponent(ChatMarkdown).props('content')).toBe('Choose');
		expect(wrapper.getComponent(ChatHubButtons).props('isDisabled')).toBe(true);
	});
});
