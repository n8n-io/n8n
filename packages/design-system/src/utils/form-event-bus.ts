import { createTypedEventBus } from './typed-event-bus';

export interface FormEventBusEvents {
	submit: never;
}

export type FormEventBus = ReturnType<typeof createFormEventBus>;

/**
 * Creates a new event bus to be used with the `FormInputs` component.
 */
export function createFormEventBus() {
	return createTypedEventBus<FormEventBusEvents>();
}
