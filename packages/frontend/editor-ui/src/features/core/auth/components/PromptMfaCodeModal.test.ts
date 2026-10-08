import { onTestFinished } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';
import { ResponseError } from '@n8n/rest-api-client';
import { STORES } from '@n8n/stores';
import { createComponentRenderer } from '@/__tests__/render';
import { useUIStore } from '@/app/stores/ui.store';
import { PROMPT_MFA_CODE_MODAL_KEY, type PromptMfaCodeModalData } from '../auth.constants';
import { promptMfaCodeBus } from '../auth.eventBus';
import PromptMfaCodeModal from './PromptMfaCodeModal.vue';

const toast = vi.hoisted(() => ({
	showMessage: vi.fn(),
	showToast: vi.fn(),
	showError: vi.fn(),
}));

vi.mock('@n8n/composables/useToast', () => ({ useToast: () => toast }));

const RECOVERY_CODE = 'd04ea17f-e8b2-4afa-a9aa-57a2c735b30e';

const renderModal = createComponentRenderer(PromptMfaCodeModal);

async function renderOpenModal(
	purpose: PromptMfaCodeModalData['purpose'],
	submit = vi.fn<PromptMfaCodeModalData['submit']>().mockResolvedValue(),
) {
	const pinia = createTestingPinia({
		initialState: {
			[STORES.UI]: {
				modalStateById: { [PROMPT_MFA_CODE_MODAL_KEY]: { open: true } },
				modalStack: [PROMPT_MFA_CODE_MODAL_KEY],
			},
		},
	});
	const onClosed = vi.fn();
	promptMfaCodeBus.on('closed', onClosed);
	onTestFinished(() => promptMfaCodeBus.off('closed', onClosed));

	const result = renderModal({ pinia, props: { data: { purpose, submit } } });
	await screen.findByRole('dialog');
	return { ...result, submit, onClosed, uiStore: useUIStore(pinia) };
}

const rejectWith = (httpStatusCode: number) =>
	vi
		.fn<PromptMfaCodeModalData['submit']>()
		.mockRejectedValue(new ResponseError('Request failed', { httpStatusCode }));

const getError = () => screen.queryByTestId('mfa-code-error');

describe('PromptMfaCodeModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('when disabling 2FA', () => {
		const getCodeInput = () => screen.getByRole('textbox', { name: '2FA code or recovery code' });
		const getDisableButton = () => screen.getByRole('button', { name: 'Disable 2FA' });

		it('should ask to confirm with a 2FA code or a recovery code', async () => {
			await renderOpenModal('disableMfa');

			expect(screen.getByRole('heading', { name: 'Disable 2FA?' })).toBeInTheDocument();
			expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
				"You're about to disable two-factor authentication for your account. From now on, you'll sign in with only your password.",
			);
			expect(getCodeInput()).toHaveAttribute('placeholder', '123456 or c79f9c02-7b2e-44…');
			await waitFor(() => expect(getCodeInput()).toHaveFocus());
		});

		it('should enable Disable 2FA only for a 2FA code or a recovery code', async () => {
			await renderOpenModal('disableMfa');

			expect(getDisableButton()).toBeDisabled();
			await userEvent.type(getCodeInput(), '12345');
			expect(getDisableButton()).toBeDisabled();
			await userEvent.type(getCodeInput(), '6');
			expect(getDisableButton()).toBeEnabled();

			await userEvent.clear(getCodeInput());
			await userEvent.type(getCodeInput(), 'd04ea17f-e8b2');
			expect(getDisableButton()).toBeDisabled();
			await userEvent.clear(getCodeInput());
			await userEvent.type(getCodeInput(), RECOVERY_CODE);
			expect(getDisableButton()).toBeEnabled();
		});

		it('should explain the expected format once the field is left', async () => {
			await renderOpenModal('disableMfa');

			await userEvent.type(getCodeInput(), '123');
			expect(getError()).not.toBeInTheDocument();

			await userEvent.tab();
			expect(getError()).toHaveTextContent(
				'Enter the 6-digit code from your authenticator app, or a recovery code.',
			);
			expect(getCodeInput()).toHaveAttribute('aria-invalid', 'true');

			await userEvent.type(getCodeInput(), '456');
			expect(getError()).not.toBeInTheDocument();
		});

		it('should send a 2FA code and close once it is accepted', async () => {
			const { submit, onClosed, uiStore } = await renderOpenModal('disableMfa');

			await userEvent.type(getCodeInput(), '123456');
			await userEvent.click(getDisableButton());

			expect(submit).toHaveBeenCalledWith({ mfaCode: '123456' });
			expect(uiStore.closeModal).toHaveBeenCalledWith(PROMPT_MFA_CODE_MODAL_KEY);
			expect(onClosed).toHaveBeenCalledWith({ mfaCode: '123456' });
		});

		it('should send a recovery code when pressing Enter', async () => {
			const { submit } = await renderOpenModal('disableMfa');

			await userEvent.type(getCodeInput(), ` ${RECOVERY_CODE} {Enter}`);

			expect(submit).toHaveBeenCalledWith({ mfaRecoveryCode: RECOVERY_CODE });
		});

		it('should stay open and explain a rejected 2FA code until it is changed', async () => {
			const { submit, onClosed, uiStore } = await renderOpenModal('disableMfa', rejectWith(403));

			await userEvent.type(getCodeInput(), '123456{Enter}');

			expect(getError()).toHaveTextContent(
				'This code is wrong or has expired. Enter the current code from your authenticator app.',
			);
			expect(getDisableButton()).toBeDisabled();
			const input = getCodeInput() as HTMLInputElement;
			expect(input).toHaveFocus();
			expect([input.selectionStart, input.selectionEnd]).toEqual([0, 6]);
			expect(uiStore.closeModal).not.toHaveBeenCalled();
			expect(onClosed).not.toHaveBeenCalled();
			expect(toast.showError).not.toHaveBeenCalled();

			await userEvent.keyboard('{Enter}');
			expect(submit).toHaveBeenCalledTimes(1);

			// A new code isn't checked for format while it's typed.
			await userEvent.clear(input);
			await userEvent.type(input, '654');
			expect(getError()).not.toBeInTheDocument();
			await userEvent.type(input, '321');
			expect(getDisableButton()).toBeEnabled();
		});

		it('should explain a rejected recovery code', async () => {
			await renderOpenModal('disableMfa', rejectWith(403));

			await userEvent.type(getCodeInput(), `${RECOVERY_CODE}{Enter}`);

			expect(getError()).toHaveTextContent(
				'This recovery code is wrong or was already used. Try another one.',
			);
		});

		it('should ask to wait after too many attempts', async () => {
			await renderOpenModal('disableMfa', rejectWith(429));

			await userEvent.type(getCodeInput(), '123456{Enter}');

			expect(getError()).toHaveTextContent(
				'Too many attempts. Wait a few minutes, then try again.',
			);
		});

		it('should close with a toast when disabling fails for another reason', async () => {
			const error = new ResponseError('Internal server error', { httpStatusCode: 500 });
			const submit = vi.fn<PromptMfaCodeModalData['submit']>().mockRejectedValue(error);
			const { onClosed } = await renderOpenModal('disableMfa', submit);

			await userEvent.type(getCodeInput(), '123456{Enter}');

			expect(toast.showError).toHaveBeenCalledWith(
				error,
				'Error disabling two-factor authentication',
			);
			expect(onClosed).toHaveBeenCalledWith({ mfaCode: '123456' });
		});

		it('should close without a code on Cancel', async () => {
			const { submit, onClosed, uiStore } = await renderOpenModal('disableMfa');

			await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

			expect(submit).not.toHaveBeenCalled();
			expect(uiStore.closeModal).toHaveBeenCalledWith(PROMPT_MFA_CODE_MODAL_KEY);
			expect(onClosed).toHaveBeenCalledWith(undefined);
		});

		it('should close without a code with the close button', async () => {
			const { onClosed } = await renderOpenModal('disableMfa');

			await userEvent.click(screen.getByRole('button', { name: 'Close dialog' }));

			expect(onClosed).toHaveBeenCalledWith(undefined);
		});

		it('should not close while the code is being checked', async () => {
			let accept!: () => void;
			const submit = vi
				.fn<PromptMfaCodeModalData['submit']>()
				.mockReturnValue(new Promise<void>((resolve) => (accept = resolve)));
			const { onClosed, uiStore } = await renderOpenModal('disableMfa', submit);

			await userEvent.type(getCodeInput(), '123456{Enter}');

			expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
			await userEvent.keyboard('{Escape}');
			await userEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
			expect(uiStore.closeModal).not.toHaveBeenCalled();
			expect(onClosed).not.toHaveBeenCalled();

			accept();
			await waitFor(() => expect(onClosed).toHaveBeenCalledWith({ mfaCode: '123456' }));
			expect(uiStore.closeModal).toHaveBeenCalledTimes(1);
		});
	});

	describe('when changing the email', () => {
		const getCodeInput = () => screen.getByRole('textbox', { name: '2FA code' });
		const getChangeEmailButton = () => screen.getByRole('button', { name: 'Change email' });

		it('should ask for a 2FA code only', async () => {
			await renderOpenModal('changeEmail');

			expect(screen.getByRole('heading', { name: 'Change email?' })).toBeInTheDocument();
			expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
				'Your account uses two-factor authentication. Confirm the new email with a code from your authenticator app.',
			);
			expect(getCodeInput()).toHaveAttribute('placeholder', '123456');
			expect(getCodeInput()).toHaveAttribute('maxlength', '6');

			await userEvent.type(getCodeInput(), 'd04ea1');
			await userEvent.tab();
			expect(getChangeEmailButton()).toBeDisabled();
			expect(getError()).toHaveTextContent('Enter the 6-digit code from your authenticator app.');
		});

		it('should send the 2FA code with Change email', async () => {
			const { submit } = await renderOpenModal('changeEmail');

			await userEvent.type(getCodeInput(), '123456');
			await userEvent.click(getChangeEmailButton());

			expect(submit).toHaveBeenCalledWith({ mfaCode: '123456' });
		});

		it('should close with a toast when the change fails for another reason', async () => {
			const { onClosed, uiStore } = await renderOpenModal('changeEmail', rejectWith(400));

			await userEvent.type(getCodeInput(), '123456{Enter}');

			expect(toast.showError).toHaveBeenCalledWith(
				expect.any(ResponseError),
				'Problem updating your details',
			);
			expect(uiStore.closeModal).toHaveBeenCalledWith(PROMPT_MFA_CODE_MODAL_KEY);
			expect(onClosed).toHaveBeenCalledWith({ mfaCode: '123456' });
		});
	});
});
