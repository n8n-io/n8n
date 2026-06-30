import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import CredentialTypeSelector from './CredentialTypeSelector.vue';
import { createComponentRenderer } from '@/__tests__/render';

const renderComponent = createComponentRenderer(CredentialTypeSelector);

describe('CredentialTypeSelector', () => {
	it('renders both radio cards', () => {
		renderComponent({ props: { modelValue: false } });

		expect(screen.getByTestId('credential-type-selector')).toBeInTheDocument();
		expect(screen.getByTestId('credential-type-card-end-user')).toBeInTheDocument();
		expect(screen.getByTestId('credential-type-card-fixed')).toBeInTheDocument();
	});

	it('marks the fixed card as checked when not resolvable', () => {
		renderComponent({ props: { modelValue: false } });

		expect(screen.getByTestId('credential-type-card-fixed')).toHaveAttribute(
			'aria-checked',
			'true',
		);
		expect(screen.getByTestId('credential-type-card-end-user')).toHaveAttribute(
			'aria-checked',
			'false',
		);
	});

	it('marks the end-user card as checked when resolvable', () => {
		renderComponent({ props: { modelValue: true } });

		expect(screen.getByTestId('credential-type-card-end-user')).toHaveAttribute(
			'aria-checked',
			'true',
		);
		expect(screen.getByTestId('credential-type-card-fixed')).toHaveAttribute(
			'aria-checked',
			'false',
		);
	});

	it('emits update:modelValue when selecting a different card', async () => {
		const { emitted } = renderComponent({ props: { modelValue: false } });

		await userEvent.click(screen.getByTestId('credential-type-card-end-user'));

		expect(emitted()['update:modelValue']).toEqual([[true]]);
	});

	it('does not emit when clicking the already-selected card', async () => {
		const { emitted } = renderComponent({ props: { modelValue: false } });

		await userEvent.click(screen.getByTestId('credential-type-card-fixed'));

		expect(emitted()['update:modelValue']).toBeUndefined();
	});

	it('does not emit when selecting a disabled end-user card', async () => {
		const { emitted } = renderComponent({
			props: { modelValue: false, endUserDisabled: true },
		});

		await userEvent.click(screen.getByTestId('credential-type-card-end-user'));

		expect(screen.getByTestId('credential-type-card-end-user')).toHaveAttribute(
			'aria-disabled',
			'true',
		);
		expect(emitted()['update:modelValue']).toBeUndefined();
	});
});
