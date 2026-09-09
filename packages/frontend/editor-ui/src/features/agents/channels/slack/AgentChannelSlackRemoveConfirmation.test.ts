import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentChannelSlackRemoveConfirmation from './AgentChannelSlackRemoveConfirmation.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

function mountConfirmation() {
	return mount(AgentChannelSlackRemoveConfirmation, {
		props: { open: true, loading: false },
		global: {
			stubs: {
				Dialog: {
					props: ['open', 'stacked', 'size'],
					template: '<div v-if="open" :data-stacked="stacked" :data-size="size"><slot /></div>',
				},
				DialogHeader: { template: '<header><slot /></header>' },
				DialogTitle: { template: '<h2><slot /></h2>' },
				DialogFooter: { template: '<footer><slot /></footer>' },
				N8nText: { template: '<span><slot /></span>' },
				N8nButton: {
					emits: ['click'],
					template: '<button @click="$emit(\'click\')"><slot /></button>',
				},
				N8nCheckbox: {
					props: ['modelValue'],
					emits: ['update:modelValue'],
					template: `
						<div>
							<button
								data-testid="slack-managed-remove-delete-app"
								@click="$emit('update:modelValue', !modelValue)"
							/>
							<slot name="label" />
						</div>
					`,
				},
			},
		},
	});
}

describe('AgentChannelSlackRemoveConfirmation', () => {
	it('controls whether the managed Slack app is deleted', async () => {
		const wrapper = mountConfirmation();

		expect(wrapper.attributes()).toHaveProperty('data-stacked');
		expect(wrapper.attributes('data-size')).toBe('medium');
		await wrapper.get('[data-testid="slack-managed-remove-confirm"]').trigger('click');
		expect(wrapper.emitted('confirm')).toEqual([[true]]);

		await wrapper.get('[data-testid="slack-managed-remove-delete-app"]').trigger('click');
		await wrapper.get('[data-testid="slack-managed-remove-confirm"]').trigger('click');
		expect(wrapper.emitted('confirm')).toEqual([[true], [false]]);
	});
});
