import { createEventBus } from '@n8n/utils/event-bus';

export interface ConfirmPasswordClosedEventPayload {
	currentPassword: string;
}

export interface ConfirmPasswordModalEvents {
	close: ConfirmPasswordClosedEventPayload | undefined;
}

export const confirmPasswordEventBus = createEventBus<ConfirmPasswordModalEvents>();

export const mfaEventBus = createEventBus();

export interface MfaModalClosedEventPayload {
	mfaCode?: string;
	mfaRecoveryCode?: string;
}

export interface MfaModalEvents {
	/** Command to request closing of the modal */
	close: MfaModalClosedEventPayload | undefined;

	/** Event that the modal has been closed */
	closed: MfaModalClosedEventPayload | undefined;
}

/**
 * Event bus for transmitting the MFA code from a modal back to the view
 */
export const promptMfaCodeBus = createEventBus<MfaModalEvents>();

export type TwoFactorMethod = 'totp' | 'passkey' | 'security_key';

export interface TwoFactorPickerEvents {
	/** User picked a method and clicked Continue */
	selected: { method: TwoFactorMethod };
	/** User cancelled the picker */
	cancelled: undefined;
}

export const twoFactorPickerBus = createEventBus<TwoFactorPickerEvents>();

export interface TwoFactorWizardEvents {
	completed: { method: TwoFactorMethod };
	cancelled: undefined;
}

export const twoFactorWizardBus = createEventBus<TwoFactorWizardEvents>();
