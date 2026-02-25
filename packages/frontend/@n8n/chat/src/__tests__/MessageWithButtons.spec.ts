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

	it('fetches when the link is on the same origin', async () => {
		vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

		const wrapper = mount(MessageWithButtons, {
			props: { text: 'Please confirm', buttons },
		});

		await wrapper.findAll('button')[0].trigger('click');

		await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/confirm'));
	});

	it('does not fetch when the link points to a different origin', async () => {
		vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

		const externalButtons = [
			{ text: 'Go', link: 'https://other-domain/approve', type: 'primary' as const },
		];

		const wrapper = mount(MessageWithButtons, {
			props: { text: 'Click me', buttons: externalButtons },
		});

		await wrapper.find('button').trigger('click');
		await new Promise((r) => setTimeout(r, 0));

		expect(fetch).not.toHaveBeenCalled();
	});

	it('does not fetch for an absolute URL on a different domain even with same path', async () => {
		vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

		const externalButtons = [
			{ text: 'Go', link: 'http://other-host:5678/api/confirm', type: 'primary' as const },
		];

		const wrapper = mount(MessageWithButtons, {
			props: { text: 'Click me', buttons: externalButtons },
		});

		await wrapper.find('button').trigger('click');
		await new Promise((r) => setTimeout(r, 0));

		expect(fetch).not.toHaveBeenCalled();
	});
});
