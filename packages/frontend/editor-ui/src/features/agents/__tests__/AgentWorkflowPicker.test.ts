import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';

const workflows = ref([
	{ id: 'wf-1', name: 'Sync customers', description: '', updatedAt: '2026-11-20T10:00:00Z' },
	{ id: 'wf-2', name: 'Old report', description: 'Weekly', updatedAt: '2026-10-01T10:00:00Z' },
]);

vi.mock('../composables/useAgentToolCatalog', () => ({
	useAgentToolCatalog: () => ({
		availableWorkflows: workflows,
		loadWorkflows: vi.fn(async () => true),
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@n8n/design-system', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/design-system')>();
	return {
		...actual,
		N8nSelect: defineComponent({
			name: 'N8nSelect',
			props: {
				modelValue: { type: [String, Number, Array], default: undefined },
				disabled: { type: Boolean, default: false },
				loading: { type: Boolean, default: false },
				filterable: { type: Boolean, default: false },
			},
			emits: ['update:modelValue'],
			template: '<select v-bind="$attrs" :disabled="disabled" @change="onChange"><slot /></select>',
			watch: {
				modelValue: {
					handler(value: unknown) {
						this.applySelection(value);
					},
					flush: 'post',
				},
			},
			mounted() {
				this.applySelection(this.modelValue);
			},
			methods: {
				applySelection(value: unknown) {
					const select = this.$el as HTMLSelectElement;
					for (const option of Array.from(select.options)) {
						option.selected = option.value === String(value);
					}
				},
				onChange(event: Event) {
					this.$emit('update:modelValue', (event.target as HTMLSelectElement).value);
				},
			},
		}),
		N8nOption: {
			name: 'N8nOption',
			props: ['value', 'label'],
			template: '<option :value="value">{{ label ?? value }}</option>',
		},
		N8nInput: {
			name: 'N8nInput',
			props: ['modelValue', 'disabled', 'placeholder'],
			emits: ['update:modelValue'],
			template:
				'<input v-bind="$attrs" :value="modelValue" :disabled="disabled" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" @blur="$emit(\'blur\')" @keyup.enter="$emit(\'keyup-enter\')" />',
		},
		N8nText: {
			name: 'N8nText',
			props: ['size', 'bold', 'color'],
			template: '<span v-bind="$attrs"><slot /></span>',
		},
		N8nIconButton: {
			name: 'N8nIconButton',
			props: ['icon', 'variant', 'size', 'disabled', 'title', 'ariaLabel'],
			template: '<button v-bind="$attrs" type="button" :disabled="disabled" />',
		},
	};
});

import AgentWorkflowPicker from '../components/AgentWorkflowPicker.vue';

function mountPicker(modelValue = '') {
	return mount(AgentWorkflowPicker, {
		props: { modelValue, projectId: 'project-1' },
		attachTo: document.body,
	});
}

function optionValues(wrapper: ReturnType<typeof mountPicker>, testId: string) {
	return Array.from(
		(wrapper.get(`[data-testid="${testId}"]`).element as HTMLSelectElement).options,
	).map((option) => option.value);
}

describe('AgentWorkflowPicker', () => {
	it('lists the project workflows, newest first, and emits the selected id', async () => {
		const wrapper = mountPicker();

		const target = wrapper.get('[data-testid="agent-workflow-picker-target"]');
		expect(optionValues(wrapper, 'agent-workflow-picker-target')).toEqual(['wf-1', 'wf-2']);

		await target.setValue('wf-2');

		expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['wf-2']);
	});

	it('keeps a saved value that the loaded list no longer holds visible', async () => {
		const wrapper = mountPicker('wf-gone');

		// The unknown id renders as its own option so an edit keeps its target.
		expect(optionValues(wrapper, 'agent-workflow-picker-target')).toEqual([
			'wf-gone',
			'wf-1',
			'wf-2',
		]);
		expect(
			(wrapper.get('[data-testid="agent-workflow-picker-target"]').element as HTMLSelectElement)
				.selectedOptions[0]?.value,
		).toBe('wf-gone');
	});

	it('resolves a known id in id mode and refuses an unknown one', async () => {
		const wrapper = mountPicker();

		await wrapper.get('[data-testid="agent-workflow-picker-mode"]').setValue('id');

		const idInput = wrapper.get('[data-testid="agent-workflow-picker-target-id"]');
		await idInput.setValue('wf-1');
		await idInput.trigger('keyup', { key: 'Enter' });

		expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['wf-1']);
		expect(wrapper.find('[data-testid="agent-workflow-picker-unresolvable"]').exists()).toBe(false);

		await idInput.setValue('wf-nope');
		await idInput.trigger('keyup', { key: 'Enter' });

		expect(wrapper.emitted('update:modelValue')).toHaveLength(1);
		expect(wrapper.find('[data-testid="agent-workflow-picker-unresolvable"]').exists()).toBe(true);
	});
});
