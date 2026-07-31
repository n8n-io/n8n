/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentTelegramAccessSettingsForm from '../components/AgentTelegramAccessSettingsForm.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
	i18n: { baseText: (key: string) => key },
}));

const selectStub = {
	props: ['modelValue', 'disabled'],
	emits: ['update:modelValue'],
	template: `
		<select
			:value="modelValue"
			:disabled="disabled"
			@change="$emit('update:modelValue', $event.target.value)"
		>
			<slot />
		</select>
	`,
};

const expressionInputStub = {
	name: 'AgentExpressionInput',
	props: ['modelValue', 'disabled', 'rows', 'embedded', 'submitOnEnter'],
	emits: ['update:modelValue', 'blur', 'submit'],
	methods: { focus: vi.fn() },
	template: '<textarea data-testid="expression-input" />',
};

function mountForm(
	savedSettings: { accessMode: 'private' | 'public'; allowedUsers: string[] } = {
		accessMode: 'private',
		allowedUsers: [],
	},
) {
	return mount(AgentTelegramAccessSettingsForm, {
		props: { savedSettings },
		global: {
			stubs: {
				AgentExpressionInput: expressionInputStub,
				N8nCallout: { template: '<div><slot /></div>' },
				N8nIcon: { template: '<i />' },
				N8nOption: { template: '<option />' },
				N8nSelect: selectStub,
				N8nText: { template: '<span><slot /></span>' },
			},
		},
	});
}

describe('AgentTelegramAccessSettingsForm', () => {
	it('preserves a loaded expression as valid saved state', () => {
		const expression = '={{ $vars.TELEGRAM_USER_ID }}';
		const wrapper = mountForm({ accessMode: 'private', allowedUsers: [expression] });

		expect(wrapper.vm.currentSettings.allowedUsers).toEqual([expression]);
		expect(wrapper.vm.validationError).toBeNull();
		expect(wrapper.vm.isDirty).toBe(false);
	});

	it('switches to autocomplete at = and commits the complete expression as one user', async () => {
		const wrapper = mountForm();
		const input = wrapper.get<HTMLInputElement>('#telegram-user-ids-input');
		const expression = '={{ $vars.TELEGRAM_USER_ID }}';

		await input.setValue('=');
		const expressionInput = wrapper.getComponent(expressionInputStub);
		expect(expressionInput.props()).toMatchObject({ modelValue: '=', rows: 1 });

		await expressionInput.trigger('keydown', { key: ' ' });
		expect(wrapper.vm.currentSettings.allowedUsers).toEqual([]);

		const paste = new Event('paste', { bubbles: true, cancelable: true });
		Object.defineProperty(paste, 'clipboardData', {
			value: { getData: () => '{{ $vars.PASTED_ID }}' },
		});
		expressionInput.element.dispatchEvent(paste);
		expect(wrapper.vm.currentSettings.allowedUsers).toEqual([]);

		await expressionInput.vm.$emit('submit', expression);
		expect(wrapper.vm.currentSettings.allowedUsers).toEqual([expression]);
	});

	it('retains literal bulk entry behavior', async () => {
		const wrapper = mountForm();
		const input = wrapper.get<HTMLInputElement>('#telegram-user-ids-input');

		await input.setValue('@alice, 123 @bob');
		await input.trigger('blur');

		expect(wrapper.vm.currentSettings.allowedUsers).toEqual(['@alice', '123', '@bob']);
	});
});
