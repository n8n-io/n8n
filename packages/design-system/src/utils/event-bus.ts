// eslint-disable-next-line @typescript-eslint/ban-types
export type CallbackFn = Function;
export type UnregisterFn = () => void;

export type Listener<Payload> = (payload: Payload) => void;

export type Payloads<ListenerMap> = {
	[E in keyof ListenerMap]: unknown;
};

// TODO: Fix all usages of `createEventBus` and convert `any` to `unknown`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface EventBus<ListenerMap extends Payloads<ListenerMap> = Record<string, any>> {
	on: <EventName extends keyof ListenerMap & string>(
		eventName: EventName,
		fn: Listener<ListenerMap[EventName]>,
	) => UnregisterFn;

	once: <EventName extends keyof ListenerMap & string>(
		eventName: EventName,
		fn: Listener<ListenerMap[EventName]>,
	) => UnregisterFn;

	off: <EventName extends keyof ListenerMap & string>(
		eventName: EventName,
		fn: Listener<ListenerMap[EventName]>,
	) => void;

	emit: <EventName extends keyof ListenerMap & string>(
		eventName: EventName,
		event?: ListenerMap[EventName],
	) => void;
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
	// TODO: Fix all usages of `createEventBus` and convert `any` to `unknown`
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ListenerMap extends Payloads<ListenerMap> = Record<string, any>,
>(): EventBus<ListenerMap> {
	const handlers = new Map<string, CallbackFn[]>();

	function off(eventName: string, fn: CallbackFn) {
		const eventFns = handlers.get(eventName);

		if (eventFns) {
			eventFns.splice(eventFns.indexOf(fn) >>> 0, 1);
		}
	}

	function on(eventName: string, fn: CallbackFn): UnregisterFn {
		let eventFns = handlers.get(eventName);

		if (!eventFns) {
			eventFns = [fn];
		} else {
			eventFns.push(fn);
		}

		handlers.set(eventName, eventFns);

		return () => off(eventName, fn);
	}

	function once(eventName: string, fn: CallbackFn): UnregisterFn {
		const unregister = on(eventName, (...args: unknown[]) => {
			unregister();
			fn(...args);
		});

		return unregister;
	}

	function emit<T = Event>(eventName: string, event?: T) {
		const eventFns = handlers.get(eventName);

		if (eventFns) {
			eventFns.slice().forEach(async (handler) => {
				await handler(event);
			});
		}
	}

	return {
		on,
		once,
		off,
		emit,
	};
}
