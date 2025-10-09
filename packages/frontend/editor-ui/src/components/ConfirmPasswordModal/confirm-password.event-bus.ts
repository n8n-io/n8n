import { createEventBus } from '@n8n/utils/event-bus';

export interface ConfirmPasswordClosedEventPayload {
	currentPassword: string;
}

export interface ConfirmPasswordModalEvents {
	close: ConfirmPasswordClosedEventPayload | undefined;
}

export const confirmPasswordEventBus = createEventBus<ConfirmPasswordModalEvents>();
