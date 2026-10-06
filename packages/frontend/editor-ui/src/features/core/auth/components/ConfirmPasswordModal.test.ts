import { onTestFinished } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';
import { ResponseError } from '@n8n/rest-api-client';
import { STORES } from '@n8n/stores';
import { createComponentRenderer } from '@/__tests__/render';
import { useUIStore } from '@/app/stores/ui.store';
import { CONFIRM_PASSWORD_MODAL_KEY, type ConfirmPasswordModalData } from '../auth.constants';
import { confirmPasswordEventBus } from '../auth.eventBus';
import ConfirmPasswordModal from './ConfirmPasswordModal.vue';

const toast = vi.hoisted(() => ({
	showMessage: vi.fn(),
	showToast: vi.fn(),
	showError: vi.fn(),
}));

vi.mock('@n8n/composables/useToast', () => ({ useToast: () => toast }));

const PASSWORD = 'Old-password1';
const WRONG_PASSWORD_MESSAGE =
	'Unable to update profile. Please check your credentials and try again.';

const renderModal = createComponentRenderer(ConfirmPasswordModal);

async function renderOpenModal(
	submit = vi.fn<ConfirmPasswordModalData['submit']>().mockResolvedValue(),
) {
	const pinia = createTestingPinia({
		initialState: {
			[STORES.UI]: {
				modalStateById: { [CONFIRM_PASSWORD_MODAL_KEY]: { open: true } },
				modalStack: [CONFIRM_PASSWORD_MODAL_KEY],
			},
			[STORES.USERS]: {
				currentUserId: '1',
				usersById: { '1': { id: '1', email: 'nathan@example.com' } },
			},
		},
	});
	const onClosed = vi.fn();
	confirmPasswordEventBus.on('closed', onClosed);
	onTestFinished(() => confirmPasswordEventBus.off('closed', onClosed));

	const result = renderModal({ pinia, props: { data: { submit } } });
	await screen.findByRole('dialog');
	return { ...result, submit, onClosed, uiStore: useUIStore(pinia) };
}

const rejectWith = (error: Error) =>
	vi.fn<ConfirmPasswordModalData['submit']>().mockRejectedValue(error);

const getPasswordInput = () => screen.getByLabelText('Password') as HTMLInputElement;
const getChangeEmailButton = () => screen.getByRole('button', { name: 'Change email' });
const getError = () => screen.queryByTestId('confirm-password-error');

describe('ConfirmPasswordModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should ask for the password to change the email', async () => {
		await renderOpenModal();

		expect(screen.getByRole('heading', { name: 'Change email?' })).toBeInTheDocument();
		expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
			'Enter your password to confirm the new email.',
		);
		expect(getPasswordInput()).toHaveAttribute('type', 'password');
		expect(getPasswordInput()).toHaveAttribute('autocomplete', 'current-password');
		expect(getChangeEmailButton()).toBeDisabled();
		await waitFor(() => expect(getPasswordInput()).toHaveFocus());
	});

	it('should send the password and close once it is accepted', async () => {
		const { submit, onClosed, uiStore } = await renderOpenModal();

		await userEvent.type(getPasswordInput(), PASSWORD);
		expect(getChangeEmailButton()).toBeEnabled();
		await userEvent.click(getChangeEmailButton());

		expect(submit).toHaveBeenCalledWith({ currentPassword: PASSWORD });
		expect(uiStore.closeModal).toHaveBeenCalledWith(CONFIRM_PASSWORD_MODAL_KEY);
		expect(onClosed).toHaveBeenCalledWith({ currentPassword: PASSWORD });
		expect(toast.showError).not.toHaveBeenCalled();
	});

	it('should send the password when pressing Enter', async () => {
		const { submit } = await renderOpenModal();

		await userEvent.type(getPasswordInput(), `${PASSWORD}{Enter}`);

		expect(submit).toHaveBeenCalledWith({ currentPassword: PASSWORD });
	});

	it('should not send an empty password when pressing Enter', async () => {
		const { submit } = await renderOpenModal();

		await userEvent.type(getPasswordInput(), '{Enter}');

		expect(submit).not.toHaveBeenCalled();
	});

	it('should stay open and explain a wrong password until it is changed', async () => {
		const submit = rejectWith(new ResponseError(WRONG_PASSWORD_MESSAGE, { httpStatusCode: 400 }));
		const { onClosed, uiStore } = await renderOpenModal(submit);

		await userEvent.type(getPasswordInput(), `${PASSWORD}{Enter}`);

		expect(getError()).toHaveTextContent(
			'This password is wrong. Enter the password you use to sign in.',
		);
		expect(getPasswordInput()).toHaveAttribute('aria-invalid', 'true');
		expect(getPasswordInput()).toHaveAccessibleDescription(
			'This password is wrong. Enter the password you use to sign in.',
		);
		expect(getChangeEmailButton()).toBeDisabled();
		const input = getPasswordInput();
		expect(input).toHaveFocus();
		expect([input.selectionStart, input.selectionEnd]).toEqual([0, PASSWORD.length]);
		expect(uiStore.closeModal).not.toHaveBeenCalled();
		expect(onClosed).not.toHaveBeenCalled();
		expect(toast.showError).not.toHaveBeenCalled();

		await userEvent.keyboard('{Enter}');
		expect(submit).toHaveBeenCalledTimes(1);

		await userEvent.keyboard('x');
		expect(getError()).not.toBeInTheDocument();
		expect(getChangeEmailButton()).toBeEnabled();
	});

	it('should ask to wait after too many attempts', async () => {
		await renderOpenModal(
			rejectWith(new ResponseError('Too many requests', { httpStatusCode: 429 })),
		);

		await userEvent.type(getPasswordInput(), `${PASSWORD}{Enter}`);

		expect(getError()).toHaveTextContent('Too many attempts. Wait a few minutes, then try again.');
		expect(getChangeEmailButton()).toBeDisabled();
	});

	it('should close with a toast when the change fails for another reason', async () => {
		const error = new ResponseError('Internal server error', { httpStatusCode: 500 });
		const { onClosed } = await renderOpenModal(rejectWith(error));

		await userEvent.type(getPasswordInput(), `${PASSWORD}{Enter}`);

		expect(getError()).not.toBeInTheDocument();
		expect(toast.showError).toHaveBeenCalledWith(error, 'Problem updating your details');
		expect(onClosed).toHaveBeenCalledWith({ currentPassword: PASSWORD });
	});

	it('should not mistake another 400 for a wrong password', async () => {
		const error = new ResponseError('This email address is already in use', {
			httpStatusCode: 400,
		});
		await renderOpenModal(rejectWith(error));

		await userEvent.type(getPasswordInput(), `${PASSWORD}{Enter}`);

		expect(getError()).not.toBeInTheDocument();
		expect(toast.showError).toHaveBeenCalledWith(error, 'Problem updating your details');
	});

	it('should close without a password on Cancel', async () => {
		const { submit, onClosed, uiStore } = await renderOpenModal();

		await userEvent.type(getPasswordInput(), PASSWORD);
		await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

		expect(submit).not.toHaveBeenCalled();
		expect(uiStore.closeModal).toHaveBeenCalledWith(CONFIRM_PASSWORD_MODAL_KEY);
		expect(onClosed).toHaveBeenCalledWith(undefined);
	});

	it('should close without a password with the close button', async () => {
		const { onClosed } = await renderOpenModal();

		await userEvent.click(screen.getByRole('button', { name: 'Close dialog' }));

		expect(onClosed).toHaveBeenCalledWith(undefined);
	});
});
