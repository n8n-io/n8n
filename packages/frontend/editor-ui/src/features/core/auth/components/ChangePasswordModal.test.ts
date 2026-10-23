import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';
import { ResponseError } from '@n8n/rest-api-client';
import { STORES } from '@n8n/stores';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { CHANGE_PASSWORD_MODAL_KEY } from '../auth.constants';
import ChangePasswordModal from './ChangePasswordModal.vue';

const toast = vi.hoisted(() => ({
	showMessage: vi.fn(),
	showToast: vi.fn(),
	showError: vi.fn(),
}));

vi.mock('@n8n/composables/useToast', () => ({ useToast: () => toast }));

const NEW_PASSWORD = 'Sunflower7';
const CURRENT_PASSWORD = 'Old-password1';
const WRONG_PASSWORD_MESSAGE = 'Provided current password is incorrect.';

const renderModal = createComponentRenderer(ChangePasswordModal);

async function renderOpenModal({
	mfaEnabled = false,
	passwordMinLength,
}: { mfaEnabled?: boolean; passwordMinLength?: number } = {}) {
	const pinia = createTestingPinia({
		initialState: {
			[STORES.UI]: {
				modalStateById: { [CHANGE_PASSWORD_MODAL_KEY]: { open: true } },
				modalStack: [CHANGE_PASSWORD_MODAL_KEY],
			},
			[STORES.USERS]: {
				currentUserId: '1',
				usersById: { '1': { id: '1', email: 'nathan@example.com', mfaEnabled } },
			},
		},
	});
	if (passwordMinLength !== undefined) {
		useSettingsStore(pinia).userManagement.passwordMinLength = passwordMinLength;
	}
	const usersStore = mockedStore(useUsersStore);

	const result = renderModal({ pinia });
	await screen.findByRole('dialog');
	return { ...result, usersStore, uiStore: useUIStore(pinia) };
}

const getNewPasswordInput = () => screen.getByLabelText('New password');
const getConfirmInput = () => screen.queryByLabelText('Confirm new password');
const getContinueButton = () => screen.getByRole('button', { name: 'Continue' });
const getChangeButton = () => screen.getByRole('button', { name: 'Change password' });
const getCurrentPasswordInput = () => screen.getByLabelText('Current password');
const getMfaCodeInput = () => screen.getByRole('textbox', { name: '2FA code' });
const isMet = (key: string) =>
	screen.getByTestId(`change-password-requirement-${key}`).dataset.met === 'true';

async function enterNewPassword(password = NEW_PASSWORD) {
	await userEvent.type(getNewPasswordInput(), password);
	const confirmInput = await screen.findByLabelText('Confirm new password');
	await userEvent.type(confirmInput, password);
	await userEvent.click(getContinueButton());
	await screen.findByRole('heading', { name: "Confirm it's you" });
}

describe('ChangePasswordModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('choosing the new password', () => {
		it('should ask only for the new password at first', async () => {
			await renderOpenModal();

			expect(screen.getByRole('heading', { name: 'Change password' })).toBeInTheDocument();
			expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
				"Use a password that you don't use for other accounts.",
			);
			expect(getConfirmInput()).not.toBeInTheDocument();
			expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument();
			expect(getContinueButton()).toBeDisabled();
			await waitFor(() => expect(getNewPasswordInput()).toHaveFocus());
		});

		it('should check each requirement while the user types', async () => {
			await renderOpenModal();

			expect(screen.getByText('8+ characters')).toBeInTheDocument();
			expect(['length', 'number', 'uppercase'].map(isMet)).toEqual([false, false, false]);

			await userEvent.type(getNewPasswordInput(), 'sunflower');
			expect(['length', 'number', 'uppercase'].map(isMet)).toEqual([true, false, false]);
			expect(getConfirmInput()).not.toBeInTheDocument();

			await userEvent.type(getNewPasswordInput(), '7');
			expect(['length', 'number', 'uppercase'].map(isMet)).toEqual([true, true, false]);

			await userEvent.clear(getNewPasswordInput());
			await userEvent.type(getNewPasswordInput(), NEW_PASSWORD);
			expect(['length', 'number', 'uppercase'].map(isMet)).toEqual([true, true, true]);
			expect(await screen.findByLabelText('Confirm new password')).toBeInTheDocument();
		});

		it('should use the configured minimum length', async () => {
			await renderOpenModal({ passwordMinLength: 12 });

			expect(screen.getByText('12+ characters')).toBeInTheDocument();
			await userEvent.type(getNewPasswordInput(), NEW_PASSWORD);
			expect(isMet('length')).toBe(false);
			expect(getConfirmInput()).not.toBeInTheDocument();
		});

		it('should explain a password that is too long', async () => {
			await renderOpenModal();

			const tooLong = `${NEW_PASSWORD}${'a'.repeat(55)}`;
			await userEvent.type(getNewPasswordInput(), tooLong);
			const confirmInput = await screen.findByLabelText('Confirm new password');
			await userEvent.type(confirmInput, tooLong);

			expect(screen.getByRole('alert')).toHaveTextContent('Use 64 characters or fewer.');
			expect(getNewPasswordInput()).toHaveAttribute('aria-invalid', 'true');
			expect(getContinueButton()).toBeDisabled();
		});

		it('should wait until the confirmation is wrong before it says so', async () => {
			await renderOpenModal();
			await userEvent.type(getNewPasswordInput(), NEW_PASSWORD);
			const confirmInput = await screen.findByLabelText('Confirm new password');
			const getMatch = () => screen.getByTestId('change-password-match');

			expect(getMatch()).toHaveTextContent('Passwords must match');

			await userEvent.type(confirmInput, 'Sunf');
			expect(getMatch()).toHaveTextContent('Passwords must match');
			expect(confirmInput).toHaveAttribute('aria-invalid', 'false');

			await userEvent.type(confirmInput, 'x');
			expect(getMatch()).toHaveTextContent(
				"Passwords don't match. Enter the same password in both fields.",
			);
			expect(confirmInput).toHaveAttribute('aria-invalid', 'true');
			expect(getContinueButton()).toBeDisabled();

			await userEvent.type(confirmInput, '{Backspace}lower7');
			expect(getMatch()).toHaveTextContent('Passwords match');
			expect(getContinueButton()).toBeEnabled();
		});

		it('should say an unfinished confirmation is wrong once the user leaves the field', async () => {
			await renderOpenModal();
			await userEvent.type(getNewPasswordInput(), NEW_PASSWORD);
			await userEvent.type(await screen.findByLabelText('Confirm new password'), 'Sunf');

			await userEvent.tab();

			expect(screen.getByTestId('change-password-match')).toHaveTextContent(
				"Passwords don't match. Enter the same password in both fields.",
			);
		});

		it('should move to the confirmation field on Enter', async () => {
			await renderOpenModal();
			await userEvent.type(getNewPasswordInput(), NEW_PASSWORD);
			await screen.findByLabelText('Confirm new password');

			await userEvent.type(getNewPasswordInput(), '{Enter}');

			await waitFor(() => expect(getConfirmInput()).toHaveFocus());
		});

		it('should close on Cancel', async () => {
			const { uiStore, usersStore } = await renderOpenModal();

			await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

			expect(uiStore.closeModal).toHaveBeenCalledWith(CHANGE_PASSWORD_MODAL_KEY);
			expect(usersStore.updateCurrentUserPassword).not.toHaveBeenCalled();
		});
	});

	describe('confirming the change', () => {
		it('should ask for the current password', async () => {
			await renderOpenModal();
			await enterNewPassword();

			expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
				'Enter your current password.',
			);
			expect(screen.queryByRole('textbox', { name: '2FA code' })).not.toBeInTheDocument();
			expect(getChangeButton()).toBeDisabled();
			await waitFor(() => expect(getCurrentPasswordInput()).toHaveFocus());
		});

		it('should change the password and close', async () => {
			const { usersStore, uiStore } = await renderOpenModal();
			await enterNewPassword();

			await userEvent.type(getCurrentPasswordInput(), `${CURRENT_PASSWORD}{Enter}`);

			expect(usersStore.updateCurrentUserPassword).toHaveBeenCalledWith({
				currentPassword: CURRENT_PASSWORD,
				newPassword: NEW_PASSWORD,
				mfaCode: undefined,
			});
			expect(uiStore.closeModal).toHaveBeenCalledWith(CHANGE_PASSWORD_MODAL_KEY);
			expect(toast.showMessage).toHaveBeenCalledWith({
				type: 'success',
				title: 'Password changed',
			});
		});

		it('should also ask for a 2FA code when 2FA is on', async () => {
			const { usersStore } = await renderOpenModal({ mfaEnabled: true });
			await enterNewPassword();

			expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
				'Enter your current password and a 2FA code.',
			);
			await userEvent.type(getCurrentPasswordInput(), `${CURRENT_PASSWORD}{Enter}`);
			expect(getMfaCodeInput()).toHaveFocus();
			expect(getChangeButton()).toBeDisabled();

			await userEvent.type(getMfaCodeInput(), '123456{Enter}');

			expect(usersStore.updateCurrentUserPassword).toHaveBeenCalledWith({
				currentPassword: CURRENT_PASSWORD,
				newPassword: NEW_PASSWORD,
				mfaCode: '123456',
			});
		});

		it('should explain a wrong current password until it is changed', async () => {
			const { usersStore, uiStore } = await renderOpenModal();
			usersStore.updateCurrentUserPassword.mockRejectedValue(
				new ResponseError(WRONG_PASSWORD_MESSAGE, { httpStatusCode: 400 }),
			);
			await enterNewPassword();

			await userEvent.type(getCurrentPasswordInput(), `${CURRENT_PASSWORD}{Enter}`);

			expect(await screen.findByTestId('change-password-current-error')).toHaveTextContent(
				'This password is wrong. Enter the password you use to sign in.',
			);
			expect(getCurrentPasswordInput()).toHaveAttribute('aria-invalid', 'true');
			expect(getCurrentPasswordInput()).toHaveFocus();
			expect(getChangeButton()).toBeDisabled();
			expect(uiStore.closeModal).not.toHaveBeenCalled();
			expect(toast.showError).not.toHaveBeenCalled();

			await userEvent.type(getCurrentPasswordInput(), '!');
			expect(screen.queryByTestId('change-password-current-error')).not.toBeInTheDocument();
			expect(getChangeButton()).toBeEnabled();
		});

		it('should explain a wrong 2FA code', async () => {
			const { usersStore } = await renderOpenModal({ mfaEnabled: true });
			usersStore.updateCurrentUserPassword.mockRejectedValue(
				new ResponseError('Invalid two-factor code.', { httpStatusCode: 403 }),
			);
			await enterNewPassword();
			await userEvent.type(getCurrentPasswordInput(), CURRENT_PASSWORD);

			await userEvent.type(getMfaCodeInput(), '123456{Enter}');

			expect(await screen.findByTestId('change-password-mfa-code-error')).toHaveTextContent(
				'This code is wrong or has expired. Enter the current code from your authenticator app.',
			);
			expect(getMfaCodeInput()).toHaveFocus();
			expect(screen.queryByTestId('change-password-current-error')).not.toBeInTheDocument();
		});

		it('should explain an incomplete 2FA code once the user leaves the field', async () => {
			await renderOpenModal({ mfaEnabled: true });
			await enterNewPassword();
			await userEvent.type(getCurrentPasswordInput(), CURRENT_PASSWORD);

			await userEvent.type(getMfaCodeInput(), '1234');
			expect(screen.queryByTestId('change-password-mfa-code-error')).not.toBeInTheDocument();
			await userEvent.tab();

			expect(screen.getByTestId('change-password-mfa-code-error')).toHaveTextContent(
				'Enter the 6-digit code from your authenticator app.',
			);
		});

		it('should explain too many attempts', async () => {
			const { usersStore } = await renderOpenModal();
			usersStore.updateCurrentUserPassword.mockRejectedValue(
				new ResponseError('Too many requests', { httpStatusCode: 429 }),
			);
			await enterNewPassword();

			await userEvent.type(getCurrentPasswordInput(), `${CURRENT_PASSWORD}{Enter}`);

			expect(await screen.findByTestId('change-password-current-error')).toHaveTextContent(
				'Too many attempts. Wait a few minutes, then try again.',
			);
		});

		it('should stay open with a toast for any other failure', async () => {
			const { usersStore, uiStore } = await renderOpenModal();
			const error = new ResponseError('Request failed', { httpStatusCode: 500 });
			usersStore.updateCurrentUserPassword.mockRejectedValue(error);
			await enterNewPassword();

			await userEvent.type(getCurrentPasswordInput(), `${CURRENT_PASSWORD}{Enter}`);

			await waitFor(() =>
				expect(toast.showError).toHaveBeenCalledWith(error, 'Problem changing the password'),
			);
			expect(uiStore.closeModal).not.toHaveBeenCalled();
			expect(getChangeButton()).toBeEnabled();
		});

		it('should treat another 400 as a failure, not a wrong password', async () => {
			const { usersStore } = await renderOpenModal();
			const error = new ResponseError('Two-factor code is required to change password.', {
				httpStatusCode: 400,
			});
			usersStore.updateCurrentUserPassword.mockRejectedValue(error);
			await enterNewPassword();

			await userEvent.type(getCurrentPasswordInput(), `${CURRENT_PASSWORD}{Enter}`);

			await waitFor(() =>
				expect(toast.showError).toHaveBeenCalledWith(error, 'Problem changing the password'),
			);
			expect(screen.queryByTestId('change-password-current-error')).not.toBeInTheDocument();
		});

		it('should go back to the new password and keep it', async () => {
			await renderOpenModal();
			await enterNewPassword();

			await userEvent.click(screen.getByRole('button', { name: 'Back' }));

			expect(screen.getByRole('heading', { name: 'Change password' })).toBeInTheDocument();
			expect(getNewPasswordInput()).toHaveValue(NEW_PASSWORD);
			expect(getConfirmInput()).toHaveValue(NEW_PASSWORD);
			expect(getContinueButton()).toBeEnabled();
			await waitFor(() => expect(getNewPasswordInput()).toHaveFocus());
		});

		it('should not close or go back while the password is being changed', async () => {
			const { usersStore, uiStore } = await renderOpenModal();
			let accept!: () => void;
			usersStore.updateCurrentUserPassword.mockReturnValue(
				new Promise<void>((resolve) => (accept = resolve)),
			);
			await enterNewPassword();

			await userEvent.type(getCurrentPasswordInput(), `${CURRENT_PASSWORD}{Enter}`);

			expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
			await userEvent.keyboard('{Escape}');
			await userEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
			expect(uiStore.closeModal).not.toHaveBeenCalled();
			expect(screen.getByRole('heading', { name: "Confirm it's you" })).toBeInTheDocument();

			accept();
			await waitFor(() =>
				expect(uiStore.closeModal).toHaveBeenCalledWith(CHANGE_PASSWORD_MODAL_KEY),
			);
		});
	});
});
