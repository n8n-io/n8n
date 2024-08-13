// eslint-disable-next-line @typescript-eslint/ban-types
export type CallbackFn = Function;
export type UnregisterFn = () => void;

export type Listener<Payload> = (payload: Payload) => void;

export type Payloads<ListenerMap> = {
	[E in keyof ListenerMap]: unknown;
};

// TODO: Fix all usages of `createEventBus` and convert `any` to `unknown`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
class EventBusImpl<ListenerMap extends Payloads<ListenerMap> = Record<string, any>> {
	private readonly handlers = new Map<string, CallbackFn[]>();

	off(eventName: string, fn: CallbackFn) {
		const eventFns = this.handlers.get(eventName);

		if (eventFns) {
			eventFns.splice(eventFns.indexOf(fn) >>> 0, 1);
		}
	}

	on(eventName: string, fn: CallbackFn) {
		let eventFns = this.handlers.get(eventName);

		if (!eventFns) {
			eventFns = [fn];
		} else {
			eventFns.push(fn);
		}

		this.handlers.set(eventName, eventFns);
	}

	once(eventName: string, fn: CallbackFn) {
		this.on(eventName, (...args: unknown[]) => {
			this.off(eventName, fn);
			fn(...args);
		});
	}

	emit<T = Event>(eventName: string, event?: T) {
		const eventFns = this.handlers.get(eventName);

		if (eventFns) {
			eventFns.slice().forEach(async (handler) => {
				await handler(event);
			});
		}
	}
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
>() {
	return new EventBusImpl<ListenerMap>();
}

// TODO: Fix all usages of `createEventBus` and convert `any` to `unknown`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventBus<ListenerMap extends Payloads<ListenerMap> = Record<string, any>> =
	InstanceType<typeof EventBusImpl<ListenerMap>>;
