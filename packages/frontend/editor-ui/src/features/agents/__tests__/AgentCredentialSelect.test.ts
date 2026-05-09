/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import AgentCredentialSelect from '../components/AgentCredentialSelect.vue';

vi.mock('@n8n/design-system', () => ({
	N8nIcon: { template: '<i />' },
}));

vi.mock('@n8n/design-system/components/N8nSelect', async () => {
	const { defineComponent, provide } = await import('vue');

	return {
		default: defineComponent({
			props: {
				modelValue: { type: String, default: '' },
				filterable: { type: Boolean, default: false },
				filterMethod: { type: Function, default: undefined },
			},
			emits: ['update:modelValue'],
			setup(props, { emit }) {
				provide('selectOption', (value: string) => emit('update:modelValue', value));

				function onInput(event: Event) {
					props.filterMethod?.((event.target as HTMLInputElement).value);
				}

				function blur() {}

				return { onInput, blur };
			},
			template: `
				<div :data-filterable="String(filterable)">
					<input data-testid="credential-search" @input="onInput" />
					<slot />
					<div data-testid="credential-select-footer"><slot name="footer" /></div>
				</div>
			`,
		}),
	};
});

vi.mock('@n8n/design-system/components/N8nOption', async () => {
	const { defineComponent, inject } = await import('vue');

	return {
		default: defineComponent({
			props: {
				value: { type: String, required: true },
				label: { type: String, required: true },
			},
			setup() {
				const selectOption = inject<(value: string) => void>('selectOption');
				return { selectOption };
			},
			template: `
				<button
					type="button"
					data-testid="credential-option"
					:data-value="value"
					@click="selectOption?.(value)"
				>{{ label }}</button>
			`,
		}),
	};
});

function renderSelect() {
	return mount(AgentCredentialSelect, {
		props: {
			modelValue: '',
			placeholder: 'Select a credential...',
			createLabel: 'New credential',
			dataTestId: 'agent-credential-select',
			credentials: [
				{ id: 'z', name: 'Zulu Slack' },
				{ id: 'a', name: 'alpha Slack' },
				{ id: 'b', name: 'Beta Slack' },
			],
		},
	});
}

function optionLabels(wrapper: ReturnType<typeof renderSelect>) {
	return wrapper.findAll('[data-testid="credential-option"]').map((option) => option.text());
}

describe('AgentCredentialSelect', () => {
	it('renders credential options alphabetically by name', () => {
		const wrapper = renderSelect();

		expect(wrapper.find('[data-filterable="true"]').exists()).toBe(true);
		expect(optionLabels(wrapper)).toEqual(['alpha Slack', 'Beta Slack', 'Zulu Slack']);
	});

	it('filters credential options by case-insensitive search text', async () => {
		const wrapper = renderSelect();

		await wrapper.find('[data-testid="credential-search"]').setValue('be');
		await nextTick();

		expect(optionLabels(wrapper)).toEqual(['Beta Slack']);
	});

	it('emits the selected credential id', async () => {
		const wrapper = renderSelect();

		await wrapper.find('[data-value="b"]').trigger('click');

		expect(wrapper.emitted('update:modelValue')).toEqual([['b']]);
	});

	it('renders the create action in the select footer when credentials exist', () => {
		const wrapper = renderSelect();

		const footer = wrapper.find('[data-testid="credential-select-footer"]');
		expect(footer.text()).toContain('New credential');
		expect(wrapper.find('[data-testid="agent-credential-select-create"]').exists()).toBe(true);
	});

	it('emits create when the footer action is clicked', async () => {
		const wrapper = renderSelect();

		await wrapper.find('[data-testid="agent-credential-select-create"]').trigger('click');

		expect(wrapper.emitted('create')).toHaveLength(1);
	});
});
