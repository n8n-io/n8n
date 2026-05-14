/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import AgentCredentialSelect from '../components/AgentCredentialSelect.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => {
			const translations: Record<string, string> = {
				'nodeCredentials.createNew': 'Create new credential',
				'nodeCredentials.createNew.permissionDenied':
					'Your current role does not allow you to create credentials',
			};
			return translations[key] ?? key;
		},
	}),
}));

vi.mock('@n8n/design-system', async () => {
	const { defineComponent, inject, provide } = await import('vue');

	const N8nSelect = defineComponent({
		props: {
			modelValue: { type: String, default: '' },
			filterable: { type: Boolean, default: false },
			filterMethod: { type: Function, default: undefined },
			size: { type: String, default: '' },
			placeholder: { type: String, default: '' },
			loading: { type: Boolean, default: false },
			disabled: { type: Boolean, default: false },
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
			<div
				:data-filterable="String(filterable)"
				:data-size="size"
				:data-placeholder="placeholder"
				:data-loading="String(loading)"
				:data-disabled="String(disabled)"
			>
				<input data-testid="credential-search" @input="onInput" />
				<slot />
				<div data-testid="credential-select-footer"><slot name="footer" /></div>
			</div>
		`,
	});

	return {
		N8nIcon: { template: '<i />' },
		N8nText: { template: '<span><slot /></span>' },
		N8nTooltip: { template: '<span><slot /></span>' },
		N8nSelect,
		N8nOption: defineComponent({
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
					:data-label="label"
					@click="selectOption?.(value)"
				><slot>{{ label }}</slot></button>
			`,
		}),
	};
});

function renderSelect({ canCreateCredential = true } = {}) {
	return mount(AgentCredentialSelect, {
		props: {
			modelValue: '',
			placeholder: 'Select a credential...',
			dataTestId: 'agent-credential-select',
			credentialPermissions: { create: canCreateCredential },
			credentials: [
				{ id: 'z', name: 'Zulu Slack', typeDisplayName: 'Slack' },
				{ id: 'a', name: 'alpha Slack', typeDisplayName: 'Slack' },
				{ id: 'b', name: 'Beta Slack', typeDisplayName: 'Slack' },
			],
		},
	});
}

function optionLabels(wrapper: ReturnType<typeof renderSelect>) {
	return wrapper
		.findAll('[data-testid="credential-option"]')
		.map((option) => option.attributes('data-label'));
}

describe('AgentCredentialSelect', () => {
	it('renders credential options alphabetically by name', () => {
		const wrapper = renderSelect();

		expect(wrapper.find('[data-filterable="true"]').exists()).toBe(true);
		expect(wrapper.find('[data-size="small"]').exists()).toBe(true);
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
		expect(footer.text()).toContain('Create new credential');
		expect(wrapper.find('[data-test-id="node-credentials-select-item-new"]').exists()).toBe(true);
	});

	it('disables the create action when the caller cannot create credentials', () => {
		const wrapper = renderSelect({ canCreateCredential: false });

		expect(
			wrapper.find('[data-test-id="node-credentials-select-item-new"]').attributes(),
		).toHaveProperty('disabled');
	});

	it('emits create when the footer action is clicked', async () => {
		const wrapper = renderSelect();

		await wrapper.find('[data-test-id="node-credentials-select-item-new"]').trigger('click');

		expect(wrapper.emitted('create')).toHaveLength(1);
	});
});
