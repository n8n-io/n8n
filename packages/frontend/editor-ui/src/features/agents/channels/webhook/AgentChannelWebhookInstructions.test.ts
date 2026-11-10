import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentChannelWebhookInstructions from './AgentChannelWebhookInstructions.vue';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal()),
	N8nCodeBlock: {
		props: ['code'],
		template: '<pre data-testid="webhook-instructions-code">{{ code }}</pre>',
	},
}));

async function mountOpen(authentication: 'none' | 'headerAuth' | 'jwtAuth' = 'none') {
	const wrapper = mount(AgentChannelWebhookInstructions, { props: { authentication } });
	await wrapper.get('[data-testid="webhook-instructions"] button').trigger('click');
	return wrapper;
}

describe('AgentChannelWebhookInstructions', () => {
	it('starts closed', () => {
		const wrapper = mount(AgentChannelWebhookInstructions, { props: { authentication: 'none' } });

		expect(wrapper.text()).toContain('agents.channels.webhook.instructions.title');
		expect(wrapper.find('[data-testid="webhook-instructions-learn-more"]').isVisible()).toBe(false);
	});

	it('shows the bodies for a message, a conversation, an approval request, and a decision', async () => {
		const wrapper = await mountOpen();

		const bodies = wrapper
			.findAll('[data-testid="webhook-instructions-code"]')
			.map((code) => JSON.parse(code.text()) as unknown);
		expect(bodies).toEqual([
			{ input: 'Hello' },
			{ input: 'And tomorrow?', conversation: '<conversation.id>' },
			{
				output: [
					{
						type: 'approval_request',
						name: 'send_email',
						arguments: '{"to":"ana@example.com"}',
						url: '<approval URL>',
					},
				],
			},
			{ approved: true },
		]);
	});

	it.each([
		['none', undefined],
		['headerAuth', 'agents.channels.webhook.instructions.auth.headerAuth'],
		['jwtAuth', 'agents.channels.webhook.instructions.auth.jwtAuth'],
	] as const)('explains the authentication %s', async (authentication, hint) => {
		const wrapper = await mountOpen(authentication);

		const authHint = wrapper.find('[data-testid="webhook-instructions-auth"]');
		if (hint) expect(authHint.text()).toBe(hint);
		else expect(authHint.exists()).toBe(false);
	});

	it('links to the docs in a new window', async () => {
		const wrapper = await mountOpen();

		const link = wrapper.get('[data-testid="webhook-instructions-learn-more"]');
		expect(link.attributes('href')).toMatch(/^https:\/\/docs\.n8n\.io\//);
		expect(link.attributes('target')).toBe('_blank');
		expect(link.text()).toBe('agents.channels.webhook.instructions.docs');
	});
});
