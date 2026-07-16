import { mount } from '@vue/test-utils';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import MarkdownRenderer from '../components/MarkdownRenderer.vue';

// jsdom does not implement layout, but it does build the DOM tree from the
// markdown-it output, which is all we need to assert on.
describe('MarkdownRenderer', () => {
	beforeEach(() => {
		// MarkdownRenderer uses highlight.js; guard against any global leakage.
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('keeps normal prose in paragraphs and does not force bullets on every line', () => {
		const prose = [
			'Here are the important sections of the response.',
			'',
			'The quarterly revenue grew by 12% compared to last year.',
			'Customer retention improved significantly across all tiers.',
			'',
			'Let me know if you need more detail.',
		].join('\n');

		const wrapper = mount(MarkdownRenderer, {
			props: { text: prose },
		});

		// No bullet list should be produced for plain prose.
		expect(wrapper.find('ul').exists()).toBe(false);
		expect(wrapper.find('ol').exists()).toBe(false);

		// The prose should still be rendered as a paragraph.
		expect(wrapper.find('p').exists()).toBe(true);
		expect(wrapper.text()).toContain('quarterly revenue grew by 12%');
	});

	it('still renders explicitly formatted markdown lists as bullet points', () => {
		const list = ['Real bullet list:', '', '- First item', '- Second item', '- Third item'].join(
			'\n',
		);

		const wrapper = mount(MarkdownRenderer, {
			props: { text: list },
		});

		const ul = wrapper.find('ul');
		expect(ul.exists()).toBe(true);
		expect(ul.findAll('li')).toHaveLength(3);
	});

	it('escapes raw HTML instead of injecting it', () => {
		const wrapper = mount(MarkdownRenderer, {
			props: { text: 'Hello <img src=x onerror=alert(1)> world' },
		});

		expect(wrapper.find('img').exists()).toBe(false);
		expect(wrapper.text()).toContain('<img src=x onerror=alert(1)>');
	});

	it('does not insert hard breaks for single newlines in prose', () => {
		const wrapper = mount(MarkdownRenderer, {
			props: { text: 'Line one\nLine two in the same paragraph' },
		});

		expect(wrapper.find('br').exists()).toBe(false);
		expect(wrapper.text()).toContain('Line one');
		expect(wrapper.text()).toContain('Line two in the same paragraph');
	});
});
