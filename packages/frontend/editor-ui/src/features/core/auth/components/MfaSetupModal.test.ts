import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { STORES } from '@n8n/stores';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { createComponentRenderer } from '@/__tests__/render';
import { MFA_AUTHENTICATION_CODE_WINDOW_EXPIRED, VIEWS } from '@/app/constants';
import router from '@/app/router';
import { useUIStore } from '@/app/stores/ui.store';
import { MFA_SETUP_MODAL_KEY } from '../auth.constants';
import MfaSetupModal from './MfaSetupModal.vue';

const toast = vi.hoisted(() => ({
	showMessage: vi.fn(() => ({ close: vi.fn() })),
	showToast: vi.fn(),
	showError: vi.fn(),
}));

const clipboard = vi.hoisted(() => ({ copy: vi.fn() }));

vi.mock('@n8n/composables/useToast', () => ({ useToast: () => toast }));
vi.mock('@n8n/composables/useClipboard', () => ({ useClipboard: () => clipboard }));
vi.mock('@/app/router', () => ({ default: { push: vi.fn() } }));

const SECRET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const RECOVERY_CODES = [
	'd04ea17f-e8b2-4afa-a9aa-57a2c735b30e',
	'f4d1e1d4-9f2a-4e0b-8b8c-2a6c9e3b5d71',
];

const renderModal = createComponentRenderer(MfaSetupModal);

async function renderOpenModal({ mfaEnforced = false } = {}) {
	const pinia = createTestingPinia({
		initialState: {
			[STORES.UI]: {
				modalStateById: { [MFA_SETUP_MODAL_KEY]: { open: true } },
				modalStack: [MFA_SETUP_MODAL_KEY],
			},
		},
	});
	useSettingsStore(pinia).isMFAEnforced = mfaEnforced;
	const usersStore = useUsersStore(pinia);
	vi.mocked(usersStore.fetchMfaQR).mockResolvedValue({
		qrCode: `otpauth://totp/n8n:jane@example.com?secret=${SECRET}&issuer=n8n`,
		secret: SECRET,
		recoveryCodes: RECOVERY_CODES,
	});

	const result = renderModal({ pinia });
	await screen.findByTestId('mfa-secret');
	return { ...result, usersStore, uiStore: useUIStore(pinia) };
}

const getCodeInput = () =>
	screen.getByRole('textbox', { name: '2. Enter the 6-digit code from the app' });
const getContinueButton = () => screen.getByRole('button', { name: 'Continue' });
const getEnableButton = () => screen.getByRole('button', { name: 'Enable 2FA' });

async function renderRecoveryCodesStep(options?: Parameters<typeof renderOpenModal>[0]) {
	const result = await renderOpenModal(options);
	vi.mocked(result.usersStore.verifyMfaCode).mockResolvedValue(undefined);
	await userEvent.type(getCodeInput(), '123456{Enter}');
	await screen.findByRole('heading', { name: 'Save your recovery codes' });
	return result;
}

/** Saves the recovery codes by copying them, which is what unlocks Enable 2FA. */
async function renderSavedRecoveryCodesStep(options?: Parameters<typeof renderOpenModal>[0]) {
	const result = await renderRecoveryCodesStep(options);
	await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
	return result;
}

describe('MfaSetupModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should show the setup title without a step counter', async () => {
		await renderOpenModal();

		expect(screen.getByRole('heading', { name: 'Set up authenticator app' })).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: '1. Scan the QR code' })).toBeInTheDocument();
		expect(screen.queryByText(/\[1\/2\]/)).not.toBeInTheDocument();
	});

	it('should show the key in groups of four below the QR code', async () => {
		await renderOpenModal();

		const groups = [...screen.getByTestId('mfa-secret').children].map((group) => group.textContent);
		expect(groups).toEqual(['ABCD', 'EFGH', 'IJKL', 'MNOP', 'QRST', 'UVWX', 'YZ23', '4567']);
	});

	it('should copy the full key with the copy button and confirm with a toast', async () => {
		await renderOpenModal();

		await userEvent.click(screen.getByRole('button', { name: 'Copy key' }));

		expect(clipboard.copy).toHaveBeenCalledWith(SECRET);
		expect(toast.showMessage).toHaveBeenCalledWith({
			title: 'Key copied',
			type: 'success',
			showClose: false,
		});
	});

	it('should turn the key copy button into a check mark, then back', async () => {
		await renderOpenModal();
		vi.useFakeTimers();
		try {
			const button = screen.getByTestId('mfa-secret-button');

			await fireEvent.click(button);
			await vi.advanceTimersByTimeAsync(0);
			expect(button).toHaveAccessibleName('Key copied');
			expect(button.querySelector('[data-icon="check"]')).toBeInTheDocument();

			await vi.advanceTimersByTimeAsync(2000);
			expect(button).toHaveAccessibleName('Copy key');
			expect(button.querySelector('[data-icon="copy"]')).toBeInTheDocument();
		} finally {
			vi.useRealTimers();
		}
	});

	it('should copy the key when clicking its text, and replace the previous toast', async () => {
		await renderOpenModal();

		await userEvent.click(screen.getByTestId('mfa-secret'));
		const firstToast = toast.showMessage.mock.results[0].value as { close: () => void };
		await userEvent.click(screen.getByTestId('mfa-secret'));

		expect(clipboard.copy).toHaveBeenCalledTimes(2);
		expect(firstToast.close).toHaveBeenCalled();
	});

	it('should focus the code input when the dialog opens', async () => {
		await renderOpenModal();

		await waitFor(() => expect(getCodeInput()).toHaveFocus());
		expect(getCodeInput()).toHaveAttribute('placeholder', '123456');
	});

	it('should enable Continue only for a 6-digit code', async () => {
		await renderOpenModal();

		expect(getContinueButton()).toBeDisabled();
		await userEvent.type(getCodeInput(), '12345');
		expect(getContinueButton()).toBeDisabled();
		await userEvent.type(getCodeInput(), '6');
		expect(getContinueButton()).toBeEnabled();
	});

	it('should verify the code on Continue and then show the recovery codes', async () => {
		const { usersStore } = await renderOpenModal();
		vi.mocked(usersStore.verifyMfaCode).mockResolvedValue(undefined);

		await userEvent.type(getCodeInput(), '123456');
		expect(usersStore.verifyMfaCode).not.toHaveBeenCalled();
		await userEvent.click(getContinueButton());

		expect(usersStore.verifyMfaCode).toHaveBeenCalledWith({ mfaCode: '123456' });
		expect(
			await screen.findByRole('heading', { name: 'Save your recovery codes' }),
		).toBeInTheDocument();
		const codes = [...screen.getByTestId('mfa-recovery-codes').children].map(
			(code) => code.textContent,
		);
		expect(codes).toEqual(RECOVERY_CODES);
	});

	it('should verify the code when pressing Enter', async () => {
		const { usersStore } = await renderOpenModal();
		vi.mocked(usersStore.verifyMfaCode).mockResolvedValue(undefined);

		await userEvent.type(getCodeInput(), '123456{Enter}');

		expect(usersStore.verifyMfaCode).toHaveBeenCalledWith({ mfaCode: '123456' });
	});

	it('should explain a wrong code next to the input and clear it on edit', async () => {
		const { usersStore } = await renderOpenModal();
		vi.mocked(usersStore.verifyMfaCode).mockRejectedValue(new Error('Invalid code'));

		await userEvent.type(getCodeInput(), '000000{Enter}');

		expect(await screen.findByRole('alert')).toHaveTextContent(
			'This code is not correct. Try again.',
		);
		expect(getCodeInput()).toHaveAttribute('aria-invalid', 'true');
		expect(screen.getByRole('heading', { name: 'Set up authenticator app' })).toBeInTheDocument();

		await userEvent.type(getCodeInput(), '{Backspace}');
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('should focus Download and keep Enable 2FA disabled until the codes are saved', async () => {
		await renderRecoveryCodesStep();

		expect(screen.getByRole('button', { name: 'Download' })).toHaveFocus();
		expect(getEnableButton()).toBeDisabled();
	});

	it('should copy all recovery codes and then allow enabling 2FA', async () => {
		const { usersStore, uiStore } = await renderRecoveryCodesStep();

		const copyButton = screen.getByRole('button', { name: 'Copy' });
		await userEvent.click(copyButton);

		expect(clipboard.copy).toHaveBeenCalledWith(RECOVERY_CODES.join('\n'));
		expect(copyButton.querySelector('[data-icon="check"]')).toBeInTheDocument();
		expect(toast.showMessage).toHaveBeenCalledWith({
			title: 'Recovery codes copied',
			type: 'success',
			showClose: false,
		});

		await userEvent.click(getEnableButton());

		expect(usersStore.enableMfa).toHaveBeenCalledWith({ mfaCode: '123456' });
		expect(uiStore.closeModal).toHaveBeenCalledWith(MFA_SETUP_MODAL_KEY);
		expect(toast.showMessage).toHaveBeenLastCalledWith({
			type: 'success',
			title: 'Two-factor authentication enabled',
		});
	});

	it('should allow enabling 2FA after downloading the codes', async () => {
		const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
		await renderRecoveryCodesStep();

		await userEvent.click(screen.getByRole('button', { name: 'Download' }));

		expect(anchorClick).toHaveBeenCalled();
		expect(getEnableButton()).toBeEnabled();
		anchorClick.mockRestore();
	});

	it('should sign out after enabling 2FA when 2FA is enforced', async () => {
		const { usersStore } = await renderSavedRecoveryCodesStep({ mfaEnforced: true });

		await userEvent.click(getEnableButton());

		expect(usersStore.enableMfa).toHaveBeenCalledWith({ mfaCode: '123456' });
		await waitFor(() => expect(router.push).toHaveBeenCalledWith({ name: VIEWS.SIGNIN }));
		expect(usersStore.logout).toHaveBeenCalled();
	});

	it('should stay open and ask to start over when the code window has expired', async () => {
		const { usersStore, uiStore } = await renderSavedRecoveryCodesStep();
		vi.mocked(usersStore.enableMfa).mockRejectedValue(
			Object.assign(new Error('Expired'), { errorCode: MFA_AUTHENTICATION_CODE_WINDOW_EXPIRED }),
		);

		await userEvent.click(getEnableButton());

		expect(toast.showMessage).toHaveBeenLastCalledWith({
			type: 'error',
			title: 'MFA token expired. Close the modal and enable MFA again',
		});
		expect(uiStore.closeModal).not.toHaveBeenCalled();
		expect(usersStore.logout).not.toHaveBeenCalled();
		expect(getEnableButton()).toBeEnabled();
	});

	it('should stay open with a toast when enabling 2FA fails for another reason', async () => {
		const { usersStore, uiStore } = await renderSavedRecoveryCodesStep();
		vi.mocked(usersStore.enableMfa).mockRejectedValue(new Error('Request failed'));

		await userEvent.click(getEnableButton());

		expect(toast.showMessage).toHaveBeenLastCalledWith({
			type: 'error',
			title: 'Error enabling two-factor authentication',
		});
		expect(uiStore.closeModal).not.toHaveBeenCalled();
		expect(getEnableButton()).toBeEnabled();
	});

	it('should close the modal with the close button', async () => {
		const { uiStore } = await renderOpenModal();

		await userEvent.click(screen.getByRole('button', { name: 'Close dialog' }));

		expect(uiStore.closeModal).toHaveBeenCalledWith(MFA_SETUP_MODAL_KEY);
	});
});
