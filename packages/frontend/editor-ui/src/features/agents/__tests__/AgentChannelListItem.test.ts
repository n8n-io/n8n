import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentChannelListItem from '../components/AgentChannelListItem.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const integration = {
	type: 'slack',
	label: 'Slack',
	icon: 'slack',
	credentialTypes: ['slackOAuth2Api'],
};

function mountItem(configured: boolean, connected: boolean) {
	return mount(AgentChannelListItem, {
		props: { integration, configured, connected },
		global: {
			stubs: {
				N8nButton: { template: '<button><slot /></button>' },
				N8nDropdownMenu: {
					template: '<div data-testid="channel-actions"><slot name="trigger" /></div>',
				},
				N8nIcon: { template: '<i />' },
				N8nText: { template: '<span><slot /></span>' },
			},
		},
	});
}

describe('AgentChannelListItem', () => {
	it('shows a configured draft without the connected activity indicator', () => {
		const wrapper = mountItem(true, false);

		expect(wrapper.text()).toContain('agents.channels.modal.configured');
		expect(wrapper.text()).not.toContain('agents.channels.modal.connected');
		expect(wrapper.text()).not.toContain('generic.connect');
		expect(wrapper.find('[data-testid="agent-channel-connected-indicator"]').exists()).toBe(false);
	});

	it('shows the connected activity indicator only for an active channel', () => {
		const wrapper = mountItem(true, true);

		expect(wrapper.text()).toContain('agents.channels.modal.connected');
		expect(wrapper.find('[data-testid="agent-channel-connected-indicator"]').exists()).toBe(true);
	});

	it('offers setup for a channel that has not been configured', () => {
		const wrapper = mountItem(false, false);

		expect(wrapper.text()).toContain('generic.connect');
		expect(wrapper.find('[data-testid="channel-actions"]').exists()).toBe(false);
	});
});
