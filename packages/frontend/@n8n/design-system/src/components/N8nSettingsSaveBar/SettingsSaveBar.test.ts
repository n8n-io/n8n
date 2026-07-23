import { fireEvent, render, screen } from '@testing-library/vue';

import N8nSettingsSaveBar from './SettingsSaveBar.vue';

describe('N8nSettingsSaveBar', () => {
	it('matches snapshot', () => {
		const { html } = render(N8nSettingsSaveBar, {
			global: { stubs: ['N8nButton', 'N8nIcon', 'N8nText'] },
		});

		expect(html()).toMatchSnapshot();
	});

	it('renders the default status message and Save/Discard buttons when visible', () => {
		render(N8nSettingsSaveBar);

		expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
		expect(screen.getByText('Save settings')).toBeInTheDocument();
		expect(screen.getByText('Discard changes')).toBeInTheDocument();
	});

	it('renders custom message and labels', () => {
		render(N8nSettingsSaveBar, {
			props: { message: 'You have changes', saveLabel: 'Save', discardLabel: 'Reset' },
		});

		expect(screen.getByText('You have changes')).toBeInTheDocument();
		expect(screen.getByText('Save')).toBeInTheDocument();
		expect(screen.getByText('Reset')).toBeInTheDocument();
	});

	it('does not render anything while hidden', () => {
		render(N8nSettingsSaveBar, { props: { visible: false } });

		expect(screen.queryByTestId('settings-save-bar')).not.toBeInTheDocument();
	});

	it('emits save when the Save button is clicked', async () => {
		const { emitted } = render(N8nSettingsSaveBar);

		await fireEvent.click(screen.getByTestId('settings-save-bar-save'));

		expect(emitted().save).toHaveLength(1);
	});

	it('emits discard when the Discard button is clicked', async () => {
		const { emitted } = render(N8nSettingsSaveBar);

		await fireEvent.click(screen.getByTestId('settings-save-bar-discard'));

		expect(emitted().discard).toHaveLength(1);
	});

	it('puts the Save button in its loading state while saving', () => {
		render(N8nSettingsSaveBar, { props: { saving: true } });

		const save = screen.getByTestId('settings-save-bar-save');
		expect(save).toHaveAttribute('aria-busy', 'true');
		expect(save).toBeDisabled();
	});

	it('disables the Discard button while saving', () => {
		render(N8nSettingsSaveBar, { props: { saving: true } });

		expect(screen.getByTestId('settings-save-bar-discard')).toBeDisabled();
	});

	it('disables only the Save button when saveDisabled is set', () => {
		render(N8nSettingsSaveBar, { props: { saveDisabled: true } });

		expect(screen.getByTestId('settings-save-bar-save')).toBeDisabled();
		expect(screen.getByTestId('settings-save-bar-discard')).not.toBeDisabled();
	});

	it('exposes the message as the region accessible name', () => {
		render(N8nSettingsSaveBar, { props: { message: 'Unsaved changes' } });

		const region = screen.getByRole('region', { name: 'Unsaved changes' });
		expect(region).toHaveAttribute('aria-live', 'polite');
	});

	it('renders the primary Save action last so it sits on the far right', () => {
		render(N8nSettingsSaveBar);

		const discard = screen.getByTestId('settings-save-bar-discard');
		const save = screen.getByTestId('settings-save-bar-save');
		// DOM order matches visual order: Discard before Save (primary on the far right).
		expect(discard.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('applies the floating class when floating', () => {
		render(N8nSettingsSaveBar, { props: { floating: true } });

		expect(screen.getByTestId('settings-save-bar').className).toContain('floating');
	});

	it('saves on Cmd/Ctrl+S while visible and enabled', () => {
		const { emitted } = render(N8nSettingsSaveBar);

		window.dispatchEvent(
			new KeyboardEvent('keydown', { key: 's', metaKey: true, cancelable: true }),
		);

		expect(emitted().save).toHaveLength(1);
	});

	it('ignores Cmd/Ctrl+S while saving', () => {
		const { emitted } = render(N8nSettingsSaveBar, { props: { saving: true } });

		window.dispatchEvent(
			new KeyboardEvent('keydown', { key: 's', metaKey: true, cancelable: true }),
		);

		expect(emitted().save).toBeUndefined();
	});

	it('does not bind the save shortcut when saveShortcut is false', () => {
		const { emitted } = render(N8nSettingsSaveBar, { props: { saveShortcut: false } });

		window.dispatchEvent(
			new KeyboardEvent('keydown', { key: 's', metaKey: true, cancelable: true }),
		);

		expect(emitted().save).toBeUndefined();
	});

	it('renders custom status content through the default slot', () => {
		render(N8nSettingsSaveBar, {
			slots: { default: '<span data-test-id="custom-status">Draft saved locally</span>' },
		});

		expect(screen.getByTestId('custom-status')).toBeInTheDocument();
		expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
	});
});
