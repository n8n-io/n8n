import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';

import AgentChannelSlackRemoveConfirmation from './AgentChannelSlackRemoveConfirmation.vue';
import { AGENT_EDITING_KEY, type AgentEditingContext } from '../../composables/useAgentEditing';
import { AgentModalTestStub } from '../../__tests__/utils/AgentModalTestStub';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

function mountConfirmation(editing: AgentEditingContext) {
	return mount(AgentChannelSlackRemoveConfirmation, {
		props: { open: true, loading: false },
		global: {
			provide: { [AGENT_EDITING_KEY as symbol]: editing },
			stubs: {
				AgentModal: AgentModalTestStub,
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
		const editing = reactive({
			locked: false,
			assistantBuilding: false,
			takingOver: false,
			takeOver: vi.fn(),
		});
		const wrapper = mountConfirmation(editing);

		await wrapper.get('[data-testid="slack-managed-remove-confirm"]').trigger('click');
		expect(wrapper.emitted('confirm')).toEqual([[true]]);

		await wrapper.get('[data-testid="slack-managed-remove-delete-app"]').trigger('click');
		editing.locked = true;
		await wrapper.get('[data-testid="slack-managed-remove-delete-app"]').trigger('click');
		await wrapper.get('[data-testid="slack-managed-remove-confirm"]').trigger('click');
		expect(wrapper.emitted('confirm')).toEqual([[true]]);

		editing.locked = false;
		await wrapper.vm.$nextTick();
		await wrapper.get('[data-testid="slack-managed-remove-confirm"]').trigger('click');
		expect(wrapper.emitted('confirm')).toEqual([[true], [false]]);
	});
});
