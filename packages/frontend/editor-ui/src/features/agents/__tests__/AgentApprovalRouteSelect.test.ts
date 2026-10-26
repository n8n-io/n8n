import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import type { AgentJsonConfig } from '@n8n/api-types';
import AgentApprovalRouteSelect from '../components/AgentApprovalRouteSelect.vue';

vi.mock('@n8n/i18n', () => ({ useI18n: () => ({ baseText: (key: string) => key }) }));
vi.mock('@n8n/design-system', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/design-system')>();
	const { defineComponent } = await import('vue');
	return {
		...actual,
		N8nSelect: defineComponent({
			props: ['modelValue'],
			emits: ['update:modelValue'],
			template: '<div><slot /></div>',
		}),
		N8nOption: defineComponent({
			props: ['value', 'label'],
			template: '<span :data-value="value">{{ label }}</span>',
		}),
	};
});

describe('Agent approval destination', () => {
	it('offers saved configurations and the current approval behavior', async () => {
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
		});
		expect(wrapper.text()).toContain('Review workflow');
		expect(
			wrapper.findAll('[data-value]').map((option) => option.attributes('data-value')),
		).toEqual(['default', 'review', 'create']);
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
