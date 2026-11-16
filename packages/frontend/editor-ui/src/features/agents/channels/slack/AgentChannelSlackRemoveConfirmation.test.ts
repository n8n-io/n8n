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
				AgentChannelRemoveConfirmation: {
					props: ['confirmTestId'],
					emits: ['confirm'],
					template: `
						<div>
							<slot />
							<button :data-testid="confirmTestId" @click="$emit('confirm')" />
						</div>
					`,
				},
				N8nText: { template: '<span><slot /></span>' },
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

		await wrapper.get('[data-testid="slack-managed-remove-confirm"]').trigger('click');
		expect(wrapper.emitted('confirm')).toEqual([[true]]);

		await wrapper.get('[data-testid="slack-managed-remove-delete-app"]').trigger('click');
		await wrapper.get('[data-testid="slack-managed-remove-confirm"]').trigger('click');
		expect(wrapper.emitted('confirm')).toEqual([[true], [false]]);
	});
});
