import {
	createEventBus as createUntypedEventBus,
	createTypedEventBus,
} from 'n8n-design-system/utils';

export const mfaEventBus = createUntypedEventBus();

export interface MfaModalClosedEventPayload {
	mfaCode: string;
}

export interface MfaModalEvents {
	close: MfaModalClosedEventPayload | undefined;

	closed: MfaModalClosedEventPayload | undefined;
}

/**
 * Event bus for transmitting the MFA code from a modal back to the view
 */
export const promptMfaCodeBus = createTypedEventBus<MfaModalEvents>();
