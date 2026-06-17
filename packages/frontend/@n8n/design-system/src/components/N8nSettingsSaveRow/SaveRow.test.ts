import { fireEvent, render, screen } from '@testing-library/vue';

import N8nSettingsSaveRow from './SaveRow.vue';

describe('N8nSettingsSaveRow', () => {
	it('renders a Save and a Discard button with default labels', () => {
		render(N8nSettingsSaveRow);

		expect(screen.getByText('Save settings')).toBeInTheDocument();
		expect(screen.getByText('Discard changes')).toBeInTheDocument();
	});

	it('renders custom labels', () => {
		render(N8nSettingsSaveRow, {
			props: { saveLabel: 'Save', discardLabel: 'Reset' },
		});

		expect(screen.getByText('Save')).toBeInTheDocument();
		expect(screen.getByText('Reset')).toBeInTheDocument();
	});

	it('emits save when the Save button is clicked', async () => {
		const { emitted } = render(N8nSettingsSaveRow);

		await fireEvent.click(screen.getByTestId('settings-save-row-save'));

		expect(emitted().save).toHaveLength(1);
	});

	it('emits discard when the Discard button is clicked', async () => {
		const { emitted } = render(N8nSettingsSaveRow);

		await fireEvent.click(screen.getByTestId('settings-save-row-discard'));

		expect(emitted().discard).toHaveLength(1);
	});

	it('puts the Save button in its loading state while saving', () => {
		render(N8nSettingsSaveRow, { props: { saving: true } });

		const save = screen.getByTestId('settings-save-row-save');
		expect(save).toHaveAttribute('aria-busy', 'true');
		expect(save).toBeDisabled();
	});

	it('disables both buttons when disabled', () => {
		render(N8nSettingsSaveRow, { props: { disabled: true } });

		expect(screen.getByTestId('settings-save-row-save')).toBeDisabled();
		expect(screen.getByTestId('settings-save-row-discard')).toBeDisabled();
	});
});
