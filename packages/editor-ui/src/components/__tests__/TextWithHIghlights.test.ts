import { shallowMount } from '@vue/test-utils';
import TextWithHighlights from '@/components/TextWithHighlights.vue';

describe('TextWithHighlights', () => {
	it('highlights the search text in the content', () => {
		const wrapper = shallowMount(TextWithHighlights, {
			props: {
				content: 'Test content',
				search: 'Test',
			},
		});

		expect(wrapper.html()).toContain('<mark>Test</mark>');
		expect(wrapper.html()).toContain('<span> content</span>');
	});

	it('renders correctly when search is not set', () => {
		const wrapper = shallowMount(TextWithHighlights, {
			props: {
				content: 'Test content',
			},
		});

		expect(wrapper.html()).toEqual('<span>Test content</span>');
		expect(wrapper.html()).not.toContain('<mark>');
	});

	it('renders correctly numbers when search is not set', () => {
		const wrapper = shallowMount(TextWithHighlights, {
			props: {
				content: 1,
			},
		});

		expect(wrapper.html()).toEqual('<span>1</span>');
		expect(wrapper.html()).not.toContain('<mark>');
	});

	it('renders correctly objects when search is not set', () => {
		const wrapper = shallowMount(TextWithHighlights, {
			props: {
				content: { hello: 'world' },
			},
		});

		expect(wrapper.html()).toEqual('<span>{\n  "hello": "world"\n}</span>');
		expect(wrapper.html()).not.toContain('<mark>');
	});

	it('renders correctly objects ignoring search', () => {
		const wrapper = shallowMount(TextWithHighlights, {
			props: {
				content: { hello: 'world' },
				search: 'yo',
			},
		});

		expect(wrapper.html()).toEqual('<span>{\n  "hello": "world"\n}</span>');
		expect(wrapper.html()).not.toContain('<mark>');
	});

	it('highlights the search text in middle of the content', () => {
		const wrapper = shallowMount(TextWithHighlights, {
			props: {
				content: 'Test content hello world',
				search: 'con',
			},
		});

		expect(wrapper.html()).toEqual(
			'<span><span>Test </span><mark>con</mark><span>tent hello world</span></span>',
		);
	});

	it('handles special regex characters in search correctly', () => {
		const wrapper = shallowMount(TextWithHighlights, {
			props: {
				content: 'Test content (hello) world',
				search: '(hello)',
			},
		});

		expect(wrapper.html()).toEqual(
			'<span><span>Test content </span><mark>(hello)</mark><span> world</span></span>',
		);
	});

	it('searches for special regex characters correctly', () => {
		const wrapper = shallowMount(TextWithHighlights, {
			props: {
				// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
				content: 'Test content ()^${}[] world',
				// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
				search: '()^${}[]',
			},
		});

		expect(wrapper.html()).toEqual(
			// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
			'<span><span>Test content </span><mark>()^${}[]</mark><span> world</span></span>',
		);
	});
});
