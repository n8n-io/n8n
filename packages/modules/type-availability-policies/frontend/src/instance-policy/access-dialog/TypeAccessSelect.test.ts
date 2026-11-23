import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { fireEvent } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';

import TypeAccessSelect from './TypeAccessSelect.vue';

// Element Plus selects do not open in jsdom, so a native select stands in for it.
vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal<object>()),
	N8nSelect: {
		name: 'N8nSelect',
		inheritAttrs: false,
		props: ['modelValue', 'disabled'],
		emits: ['update:modelValue'],
		template:
			'<div><slot name="prefix" /><select v-bind="$attrs" :value="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select></div>',
	},
	N8nOption: {
		name: 'N8nOption',
		props: ['value', 'label'],
		template: '<option :value="value">{{ label }}</option>',
	},
}));

const renderSelect = createComponentRenderer(TypeAccessSelect);

describe('TypeAccessSelect', () => {
	it('offers Allowed and Restricted', () => {
		const { getAllByRole } = renderSelect({ props: { modelValue: 'allow', label: 'Notion' } });

		expect(getAllByRole('option').map((option) => option.textContent)).toEqual([
			'Allowed',
			'Restricted',
		]);
	});

	it('keeps the delegated value of a type as a third option', () => {
		const { getAllByRole } = renderSelect({ props: { modelValue: 'delegate', label: 'Notion' } });

		expect(getAllByRole('option').map((option) => option.textContent)).toEqual([
			'Allowed',
			'Restricted',
			'Open to project opt-in',
		]);
	});

	it('is disabled until the access of the type loads', () => {
		const { getByTestId } = renderSelect({ props: { modelValue: undefined, label: 'Notion' } });

		expect(getByTestId('type-access-select')).toBeDisabled();
	});

	it('is disabled when the caller disables it', () => {
		const { getByTestId } = renderSelect({
			props: { modelValue: 'delegate', label: 'Notion', disabled: true },
		});

		expect(getByTestId('type-access-select')).toBeDisabled();
	});

	it('emits a new access, and nothing for the current one', async () => {
		const { getByTestId, emitted } = renderSelect({
			props: { modelValue: 'allow', label: 'Notion' },
		});

		await fireEvent.update(getByTestId('type-access-select'), 'allow');
		await fireEvent.update(getByTestId('type-access-select'), 'deny');

		expect(emitted('update:modelValue')).toEqual([['deny']]);
	});

	it.each([
		['allow', 'check'],
		['deny', 'lock'],
	] as const)('shows the %s access with the %s icon', (access, icon) => {
		const { getByTestId } = renderSelect({ props: { modelValue: access, label: 'Notion' } });

		expect(getByTestId('type-access-select-icon')).toHaveAttribute('data-icon', icon);
	});

	it('shows no icon for a delegated type', () => {
		const { queryByTestId } = renderSelect({ props: { modelValue: 'delegate', label: 'Notion' } });

		expect(queryByTestId('type-access-select-icon')).not.toBeInTheDocument();
	});
});
