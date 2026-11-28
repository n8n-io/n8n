import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentSessionsFilter from '../components/AgentSessionsFilter.vue';
import { defaultAgentSessionFilters } from '../composables/useAgentThreadsApi';

vi.mock('@n8n/design-system', () => ({
	N8nPopover: {
		template: '<div><slot name="trigger" /><slot name="content" /></div>',
	},
	N8nButton: {
		template: '<button v-bind="$attrs"><slot /></button>',
	},
	N8nTagsInput2: {
		props: ['modelValue'],
		emits: ['update:modelValue'],
		template: '<div v-bind="$attrs" />',
	},
	N8nSelect2: {
		props: ['modelValue', 'items'],
		emits: ['update:modelValue'],
		template:
			'<select v-bind="$attrs" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in items" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
	},
}));

vi.mock('element-plus', () => ({
	ElDatePicker: {
		props: ['modelValue'],
		emits: ['update:modelValue'],
		template: '<input v-bind="$attrs" />',
	},
}));

describe('AgentSessionsFilter', () => {
	it('emits composed status and origin filters and shows the active filter dot', async () => {
		const wrapper = mount(AgentSessionsFilter, {
			props: { modelValue: defaultAgentSessionFilters() },
		});
		expect(wrapper.find('[data-test-id="agent-sessions-filter-dot"]').exists()).toBe(false);

		await wrapper.get('[data-test-id="agent-sessions-filter-status"]').setValue('error');
		await wrapper.setProps({
			modelValue: { ...defaultAgentSessionFilters(), status: 'error' },
		});
		await wrapper.get('[data-test-id="agent-sessions-filter-origin"]').setValue('slack');

		const filters = { status: 'error', origin: 'slack', startDate: '', endDate: '' } as const;
		expect(wrapper.emitted('filterChanged')?.at(-1)).toEqual([filters]);
		await wrapper.setProps({ modelValue: filters });
		expect(wrapper.find('[data-test-id="agent-sessions-filter-dot"]').exists()).toBe(true);
	});

	it('resets every active filter', async () => {
		const wrapper = mount(AgentSessionsFilter, {
			props: {
				modelValue: {
					status: 'error',
					origin: 'slack',
					startDate: new Date('2026-01-01T00:00:00Z'),
					endDate: new Date('2026-01-02T00:00:00Z'),
				},
			},
		});

		expect(wrapper.find('[data-test-id="agent-sessions-filter-dot"]').exists()).toBe(true);
		await wrapper.get('[data-test-id="agent-sessions-filter-reset"]').trigger('click');

		expect(wrapper.emitted('filterChanged')?.at(-1)).toEqual([defaultAgentSessionFilters()]);
	});
});
