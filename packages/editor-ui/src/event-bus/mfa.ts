import { createEventBus } from 'n8n-design-system/utils';

export const mfaEventBus = createEventBus();

export interface MfaModalClosedEventPayload {
	mfaCode: string;
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
