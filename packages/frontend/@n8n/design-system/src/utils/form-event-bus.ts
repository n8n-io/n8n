import { createEventBus } from '@n8n/utils/event-bus';

export interface FormEventBusEvents {
	submit: never;
}

export type FormEventBus = ReturnType<typeof createFormEventBus>;

/**
 * Creates a new event bus to be used with the `FormInputs` component.
 */
export const createFormEventBus = createEventBus<FormEventBusEvents>;
