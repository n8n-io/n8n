import type {
	ConfirmPasswordClosedEventPayload,
	MfaModalClosedEventPayload,
} from './auth.eventBus';

export const CHANGE_PASSWORD_MODAL_KEY = 'changePassword';
export const CONFIRM_PASSWORD_MODAL_KEY = 'confirmPassword';
export const MFA_SETUP_MODAL_KEY = 'mfaSetup';
export const PROMPT_MFA_CODE_MODAL_KEY = 'promptMfaCode';

export type PromptMfaCodeModalData = {
	/** Disabling 2FA also accepts a recovery code; an email change accepts only a 2FA code. */
	purpose: 'disableMfa' | 'changeEmail';
	/**
	 * Runs the action with the code. When the server rejects the code or limits the attempts, the
	 * dialog stays open and says why under the field. Any other failure closes it with a toast.
	 */
	submit: (credentials: MfaModalClosedEventPayload) => Promise<void>;
};

export type ConfirmPasswordModalData = {
	/**
	 * Runs the email change with the password. When the server rejects the password or limits the
	 * attempts, the dialog stays open and says why under the field. Any other failure closes it
	 * with a toast.
	 */
	submit: (credentials: ConfirmPasswordClosedEventPayload) => Promise<void>;
};
