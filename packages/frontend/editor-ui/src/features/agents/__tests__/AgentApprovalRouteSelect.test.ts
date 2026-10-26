import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import type { AgentJsonConfig } from '@n8n/api-types';
import AgentApprovalRouteSelect from '../components/AgentApprovalRouteSelect.vue';

vi.mock('@n8n/i18n', () => ({ useI18n: () => ({ baseText: (key: string) => key }) }));

describe('Agent approval destination', () => {
	it('offers saved configurations and an Agent default without changing approval rules', async () => {
		const config = ref<AgentJsonConfig>({
			name: 'Agent',
			model: 'anthropic/test',
			instructions: 'Help',
			hitlConfigurations: [
				{ id: 'review', name: 'Review workflow', method: 'workflow', workflowId: 'wf' },
			],
		});
		const wrapper = mount(AgentApprovalRouteSelect, {
			props: {
				projectId: 'project',
				context: { getConfig: () => config.value, saveConfiguration: vi.fn() },
			},
			global: {
				stubs: {
					N8nSelect: {
						name: 'N8nSelect',
						props: ['modelValue'],
						emits: ['update:modelValue'],
						template: '<div><slot /></div>',
					},
					N8nOption: { props: ['value', 'label'], template: '<span>{{ label }}</span>' },
				},
			},
		});
		expect(wrapper.text()).toContain('Review workflow');
		const select = wrapper.findComponent('[data-testid="agent-approval-route"]');
		select.vm.$emit('update:modelValue', 'review');
		await wrapper.vm.$nextTick();
		expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
			{ type: 'configuration', configurationId: 'review' },
		]);
		select.vm.$emit('update:modelValue', 'default');
		expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([undefined]);
		config.value = { ...config.value, hitlConfigurations: [] };
		await wrapper.vm.$nextTick();
		expect(wrapper.text()).not.toContain('Review workflow');
	});
});
