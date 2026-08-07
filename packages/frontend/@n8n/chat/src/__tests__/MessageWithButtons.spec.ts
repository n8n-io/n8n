import { waitFor } from '@testing-library/vue';
import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import MessageWithButtons from '../components/MessageWithButtons.vue';

vi.mock('../components/MarkdownRenderer.vue', () => ({
	default: {
		name: 'MarkdownRenderer',
		template: '<div>{{ text }}</div>',
		props: ['text'],
	},
}));

vi.mock('@n8n/chat/composables', () => ({
	useOptions: () => ({
		options: {
			webhookUrl: 'https://webhook.example.com/webhook/123/chat',
		},
	}),
}));

const editorOrigin = 'http://localhost:5678';
const webhookOrigin = 'https://webhook.example.com';

const relativeUrlButtons = [
	{ text: 'Confirm', link: '/api/confirm', type: 'primary' as const },
	{ text: 'Cancel', link: '/api/cancel', type: 'secondary' as const },
];

describe('MessageWithButtons', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
		Object.defineProperty(window, 'location', {
			value: new URL(`${editorOrigin}/chat`),
			writable: true,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('does not render buttons whose links do not match the configured webhook origin', () => {
		const wrapper = mount(MessageWithButtons, {
			props: { text: 'Please confirm', buttons: relativeUrlButtons },
		});

		expect(wrapper.findAll('button')).toHaveLength(0);
		expect(fetch).not.toHaveBeenCalled();
	});

	it('renders and fetches when the link is on the configured webhook origin', async () => {
		vi.mocked(fetch).mockResolvedValue({ ok: true } as Response);

		const webhookButtons = [
			{
				text: 'Approve',
				link: `${webhookOrigin}/webhook/123/approve`,
				type: 'primary' as const,
			},
		];

		const wrapper = mount(MessageWithButtons, {
			props: { text: 'Please approve', buttons: webhookButtons },
		});

		expect(wrapper.find('button').exists()).toBe(true);

		await wrapper.find('button').trigger('click');

		await waitFor(() => expect(fetch).toHaveBeenCalledWith(`${webhookOrigin}/webhook/123/approve`));
	});

	it('does not render a button when the link points to an unrecognized origin', () => {
		const externalButtons = [
			{ text: 'Go', link: 'https://broken-link.com/approve', type: 'primary' as const },
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

	it('renders only valid-origin buttons when the list contains mixed URLs', () => {
		const mixedButtons = [
			{ text: 'Editor', link: '/api/confirm', type: 'primary' as const },
			{
				text: 'Webhook',
				link: `${webhookOrigin}/webhook/123/approve`,
				type: 'secondary' as const,
			},
			{ text: 'Other', link: 'http://broken-url/approve', type: 'secondary' as const },
		];

		const wrapper = mount(MessageWithButtons, {
			props: { text: 'Choose', buttons: mixedButtons },
		});

		const rendered = wrapper.findAll('button');
		expect(rendered).toHaveLength(1);
		expect(rendered[0].text()).toBe('Webhook');
	});
});
