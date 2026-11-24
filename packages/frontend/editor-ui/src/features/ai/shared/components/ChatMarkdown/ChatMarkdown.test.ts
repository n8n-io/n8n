import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ChatMarkdown from './ChatMarkdown.vue';

describe('ChatMarkdown', () => {
	it('updates options and the single-pre class after mount', async () => {
		const wrapper = mount(ChatMarkdown, { props: { content: '$x$', options: { math: false } } });
		expect(wrapper.find('.katex').exists()).toBe(false);
		expect(wrapper.classes()).not.toContain('n8n-markdown--single-pre');

		await wrapper.setProps({ options: { math: true }, singlePre: true });
		expect(wrapper.find('.katex').exists()).toBe(true);
		expect(wrapper.classes()).toContain('n8n-markdown--single-pre');

		await wrapper.setProps({ options: { math: false }, singlePre: false });
		expect(wrapper.find('.katex').exists()).toBe(false);
		expect(wrapper.classes()).not.toContain('n8n-markdown--single-pre');
	});

	it.each([
		'planning-blueprint',
		'planned-task-follow-up',
		'background-task-completed',
		'running-tasks',
	])('filters matching %s blocks', (tag) => {
		const wrapper = mount(ChatMarkdown, {
			props: { content: `Before <${tag}>hidden</${tag}> After`, filterInternalBlocks: true },
		});
		expect(wrapper.text()).toBe('Before  After');
	});

	it('does not filter content between mismatched internal tags', () => {
		const wrapper = mount(ChatMarkdown, {
			props: {
				content: '<planning-blueprint>Keep this</running-tasks>',
				filterInternalBlocks: true,
			},
		});
		expect(wrapper.text()).toContain('Keep this');
	});
});
