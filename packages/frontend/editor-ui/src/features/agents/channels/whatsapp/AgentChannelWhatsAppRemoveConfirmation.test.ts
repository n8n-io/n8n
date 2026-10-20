import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentChannelWhatsAppRemoveConfirmation from './AgentChannelWhatsAppRemoveConfirmation.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

function mountConfirmation(
	props: { open: boolean; loading: boolean } = { open: true, loading: false },
) {
	return mount(AgentChannelWhatsAppRemoveConfirmation, {
		props,
		global: {
			stubs: {
				Dialog: {
					props: ['open'],
					template: '<div v-if="open"><slot /></div>',
				},
				DialogHeader: { template: '<header><slot /></header>' },
				DialogTitle: { template: '<h2><slot /></h2>' },
				DialogFooter: { template: '<footer><slot /></footer>' },
				N8nText: { template: '<span><slot /></span>' },
				N8nButton: {
					emits: ['click'],
					template: '<button @click="$emit(\'click\')"><slot /></button>',
				},
			},
		},
	});
}

describe('AgentChannelWhatsAppRemoveConfirmation', () => {
	it('shows the title and what removing does', () => {
		const wrapper = mountConfirmation();

		expect(wrapper.get('h2').text()).toBe('agents.channels.whatsapp.remove.title');
		expect(wrapper.text()).toContain('agents.channels.whatsapp.remove.description');
		expect(wrapper.text()).toContain('agents.channels.whatsapp.remove.confirm');
	});

	it('confirms the removal', async () => {
		const wrapper = mountConfirmation();

		await wrapper.get('[data-testid="whatsapp-remove-confirm"]').trigger('click');

		expect(wrapper.emitted('confirm')).toEqual([[false]]);
	});

	it('cancels without confirming', async () => {
		const wrapper = mountConfirmation();

		const cancel = wrapper.findAll('button').find((button) => button.text() === 'generic.cancel');
		await cancel?.trigger('click');

		expect(wrapper.emitted('cancel')).toHaveLength(1);
		expect(wrapper.emitted('confirm')).toBeUndefined();
	});

	it('renders nothing while closed', () => {
		const wrapper = mountConfirmation({ open: false, loading: false });

		expect(wrapper.find('h2').exists()).toBe(false);
	});
});
