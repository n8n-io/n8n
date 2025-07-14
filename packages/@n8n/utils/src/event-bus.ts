// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CallbackFn = (...args: any[]) => any;

type Payloads<ListenerMap> = {
	[E in keyof ListenerMap]: unknown;
};

type Listener<Payload> = (payload: Payload) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface EventBus<ListenerMap extends Payloads<ListenerMap> = Record<string, any>> {
	on<EventName extends keyof ListenerMap & string>(
		eventName: EventName,
		fn: Listener<ListenerMap[EventName]>,
	): void;

	once<EventName extends keyof ListenerMap & string>(
		eventName: EventName,
		fn: Listener<ListenerMap[EventName]>,
	): void;

	off<EventName extends keyof ListenerMap & string>(
		eventName: EventName,
		fn: Listener<ListenerMap[EventName]>,
	): void;

	emit<EventName extends keyof ListenerMap & string>(
		eventName: EventName,
		event?: ListenerMap[EventName],
	): void;
}

/**
 * Creates an event bus with the given listener map.
 *
 * @example
 * ```ts
 * const eventBus = createEventBus<{
 *   'user-logged-in': { username: string };
 *   'user-logged-out': never;
 * }>();
 */
export function createEventBus<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ListenerMap extends Payloads<ListenerMap> = Record<string, any>,
>(): EventBus<ListenerMap> {
	const handlers = new Map<string, CallbackFn[]>();

	return {
		on(eventName, fn) {
			let eventFns = handlers.get(eventName);
			if (!eventFns) {
				eventFns = [fn];
			} else {
				eventFns.push(fn);
			}
			handlers.set(eventName, eventFns);
		},

		once(eventName, fn) {
			const handler: typeof fn = (payload) => {
				this.off(eventName, handler);
				fn(payload);
			};
			this.on(eventName, handler);
		},

		off(eventName, fn) {
			const eventFns = handlers.get(eventName);
			if (eventFns) {
				eventFns.splice(eventFns.indexOf(fn) >>> 0, 1);
			}
		},

		emit(eventName, event) {
			const eventFns = handlers.get(eventName);
			if (eventFns) {
				eventFns.slice().forEach((handler) => {
					handler(event);
				});
			}
		},
	};
}
