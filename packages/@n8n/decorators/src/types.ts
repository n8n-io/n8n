export type Class<T = object, A extends unknown[] = unknown[]> = new (...args: A) => T;

type EventHandlerFn = () => Promise<void> | void;
export type EventHandlerClass = Class<Record<string, EventHandlerFn>>;
export type EventHandler<T extends string> = {
	/** Class holding the method to call on an event. */
	eventHandlerClass: EventHandlerClass;

	/** Name of the method to call on an event. */
	methodName: string;

	/** Name of the event to listen to. */
	eventName: T;
};
