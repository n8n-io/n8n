import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import MessageWithButtons from '../components/MessageWithButtons.vue';
import { waitFor } from '@testing-library/vue';

vi.mock('../components/MarkdownRenderer.vue', () => ({
	default: {
		name: 'MarkdownRenderer',
		template: '<div>{{ text }}</div>',
		props: ['text'],
	},
}));

const buttons = [
	{ text: 'Confirm', link: '/api/confirm', type: 'primary' as const },
	{ text: 'Cancel', link: '/api/cancel', type: 'secondary' as const },
];

describe('MessageWithButtons', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
		Object.defineProperty(window, 'location', {
			value: new URL('http://localhost:5678/chat'),
			writable: true,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders and fetches when the link is on the same origin', async () => {
		vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

		const wrapper = mount(MessageWithButtons, {
			props: { text: 'Please confirm', buttons },
		});

		expect(wrapper.findAll('button')).toHaveLength(2);

		await wrapper.findAll('button')[0].trigger('click');

		await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/confirm'));
	});

	it('does not render a button when the link points to a different origin', () => {
		const externalButtons = [
			{ text: 'Go', link: 'https://other-domain/approve', type: 'primary' as const },
		];

		const wrapper = mount(MessageWithButtons, {
			props: { text: 'Click me', buttons: externalButtons },
		});

		expect(wrapper.find('button').exists()).toBe(false);
		expect(fetch).not.toHaveBeenCalled();
	});

	it('does not render a button for an absolute URL on a different host with the same port', () => {
		const externalButtons = [
			{ text: 'Go', link: 'http://other-host:5678/api/confirm', type: 'primary' as const },
		];

		const wrapper = mount(MessageWithButtons, {
			props: { text: 'Click me', buttons: externalButtons },
		});

		expect(wrapper.find('button').exists()).toBe(false);
		expect(fetch).not.toHaveBeenCalled();
	});

	it('renders only same-origin buttons when the list contains mixed URLs', () => {
		const mixedButtons = [
			{ text: 'Safe', link: '/api/confirm', type: 'primary' as const },
			{ text: 'Unsafe', link: 'https://evil.example.com/steal', type: 'secondary' as const },
		];

		const wrapper = mount(MessageWithButtons, {
			props: { text: 'Choose', buttons: mixedButtons },
		});

		const rendered = wrapper.findAll('button');
		expect(rendered).toHaveLength(1);
		expect(rendered[0].text()).toBe('Safe');
	});
});
