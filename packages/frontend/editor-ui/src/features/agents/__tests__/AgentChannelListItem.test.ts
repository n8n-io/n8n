import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import AgentChannelListItem from '../components/AgentChannelListItem.vue';

describe('AgentChannelListItem', () => {
	it('renders generic platform connect action metadata', () => {
		const wrapper = mount(AgentChannelListItem, {
			props: {
				integration: {
					type: 'example',
					label: 'Example',
					icon: 'zap',
					credentialTypes: ['exampleApi'],
				},
				connected: false,
				connectAction: { label: 'Add to Example', icon: 'plus' },
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

		const button = wrapper.get('button');
		expect(button.text()).toContain('Add to Example');
		expect(button.attributes('data-icon')).toBe('plus');
	});
});
