import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import CredentialTypeSelector from './CredentialTypeSelector.vue';
import { createComponentRenderer } from '@/__tests__/render';

const renderComponent = createComponentRenderer(CredentialTypeSelector);

describe('CredentialTypeSelector', () => {
	it('renders the selector', () => {
		renderComponent({ props: { modelValue: false } });

		expect(screen.getByTestId('credential-type-selector')).toBeInTheDocument();
		expect(screen.getByTestId('credential-type-select')).toBeInTheDocument();
	});

	it('shows both options when opened', async () => {
		renderComponent({ props: { modelValue: false } });

		await userEvent.click(screen.getByTestId('credential-type-select'));

		expect(screen.getByTestId('credential-type-option-fixed')).toBeInTheDocument();
		expect(screen.getByTestId('credential-type-option-endUser')).toBeInTheDocument();
	});

	it('emits update:modelValue when selecting the end-user option', async () => {
		const { emitted } = renderComponent({ props: { modelValue: false } });

		await userEvent.click(screen.getByTestId('credential-type-select'));
		await userEvent.click(screen.getByTestId('credential-type-option-endUser'));

		expect(emitted()['update:modelValue']).toEqual([[true]]);
	});

	it('does not emit when selecting the already-selected option', async () => {
		const { emitted } = renderComponent({ props: { modelValue: false } });

		await userEvent.click(screen.getByTestId('credential-type-select'));
		await userEvent.click(screen.getByTestId('credential-type-option-fixed'));

		expect(emitted()['update:modelValue']).toBeUndefined();
	});

	it('disables the select when the disabled prop is set', () => {
		renderComponent({ props: { modelValue: true, disabled: true } });

		const input = screen.getByTestId('credential-type-select').querySelector('input');
		expect(input).toBeDisabled();
	});
});
