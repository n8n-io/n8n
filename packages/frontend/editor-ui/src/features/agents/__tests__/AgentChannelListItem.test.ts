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

function mountItem(
	configured: boolean,
	connected: boolean,
	extra: { notRunning?: boolean; runtimeError?: string } = {},
) {
	return mount(AgentChannelListItem, {
		props: {
			integration,
			configured,
			connected,
			connectAction: { label: 'generic.connect' },
			...extra,
		},
		global: {
			stubs: {
				N8nButton: { template: '<button><slot /></button>' },
				N8nDropdownMenu: {
					template: '<div data-testid="channel-actions"><slot name="trigger" /></div>',
				},
				N8nIcon: { template: '<i />' },
				N8nText: { template: '<span><slot /></span>' },
				N8nTooltip: {
					props: ['content', 'disabled'],
					template: '<div :data-tooltip="content" :data-tooltip-disabled="disabled"><slot /></div>',
				},
			},
		},
	});
}

describe('AgentChannelListItem', () => {
	it.each([
		{ configured: true, connected: false, label: 'agents.channels.modal.configured' },
		{ configured: true, connected: true, label: 'agents.channels.modal.connected' },
		{ configured: false, connected: false, label: 'generic.connect' },
	])('renders the channel state for $label', ({ configured, connected, label }) => {
		const wrapper = mountItem(configured, connected);

		expect(wrapper.text()).toContain(label);
		expect(wrapper.find('[data-testid="agent-channel-connected-indicator"]').exists()).toBe(
			connected,
		);
	});

	describe('a channel that failed to start', () => {
		it('reads as not running rather than configured', () => {
			const wrapper = mountItem(true, false, { notRunning: true });

			expect(wrapper.text()).toContain('agents.channels.modal.notRunning');
			expect(wrapper.text()).not.toContain('agents.channels.modal.configured');
			expect(wrapper.find('[data-testid="agent-channel-not-running-indicator"]').exists()).toBe(
				true,
			);
			expect(wrapper.find('[data-testid="agent-channel-connected-indicator"]').exists()).toBe(
				false,
			);
		});

		it('explains why on hover', () => {
			const wrapper = mountItem(true, false, {
				notRunning: true,
				runtimeError: 'This Telegram credential is already connected to agent "Support"',
			});

			expect(wrapper.get('[data-tooltip]').attributes('data-tooltip')).toBe(
				'This Telegram credential is already connected to agent "Support"',
			);
			expect(wrapper.get('[data-tooltip]').attributes('data-tooltip-disabled')).toBe('false');
		});

		it('still says something when the failure came with no message', () => {
			const wrapper = mountItem(true, false, { notRunning: true });

			expect(wrapper.get('[data-tooltip]').attributes('data-tooltip')).toBe(
				'agents.channels.modal.notRunning.tooltip',
			);
		});

		it('leaves the tooltip off a healthy channel', () => {
			const wrapper = mountItem(true, true);

			expect(wrapper.get('[data-tooltip]').attributes('data-tooltip-disabled')).toBe('true');
		});
	});

	it('renders registry-provided connect action metadata', () => {
		const wrapper = mount(AgentChannelListItem, {
			props: {
				integration,
				configured: false,
				connected: false,
				connectAction: { label: 'Add to Slack', icon: 'plus' },
			},
			global: {
				stubs: {
					N8nButton: {
						props: ['icon'],
						template: '<button :data-icon="icon"><slot /></button>',
					},
					N8nIcon: { template: '<i />' },
					N8nText: { template: '<span><slot /></span>' },
				},
			},
		});

		expect(wrapper.get('button').text()).toContain('Add to Slack');
		expect(wrapper.get('button').attributes('data-icon')).toBe('plus');
	});
});
