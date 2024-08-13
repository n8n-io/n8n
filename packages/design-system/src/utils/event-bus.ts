// eslint-disable-next-line @typescript-eslint/ban-types
export type CallbackFn = Function;
export type UnregisterFn = () => void;

export type Listener<Payload> = (payload: Payload) => void;

export type Payloads<ListenerMap> = {
	// TODO: Fix all usages of `createEventBus` and convert `any` to `unknown`
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[E in keyof ListenerMap]: any;
};

// TODO: Fix all usages of `createEventBus` and convert `any` to `unknown`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface EventBus<ListenerMap extends Payloads<ListenerMap> = Record<string, any>> {
	off<K extends keyof ListenerMap & string>(eventName: K, fn: Listener<ListenerMap[K]>): void;
	on<K extends keyof ListenerMap & string>(eventName: K, fn: Listener<ListenerMap[K]>): void;
	once<K extends keyof ListenerMap & string>(eventName: K, fn: Listener<ListenerMap[K]>): void;
	emit<K extends keyof ListenerMap & string>(eventName: K, event?: ListenerMap[K]): void;
}

// TODO: Fix all usages of `createEventBus` and convert `any` to `unknown`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
class EventBusImpl<ListenerMap extends Payloads<ListenerMap>> implements EventBus<ListenerMap> {
	private readonly handlers = new Map<string, CallbackFn[]>();

	off<EventName extends keyof ListenerMap & string>(eventName: EventName, fn: CallbackFn) {
		const eventFns = this.handlers.get(eventName);

		if (eventFns) {
			eventFns.splice(eventFns.indexOf(fn) >>> 0, 1);
		}
	}

	on<EventName extends keyof ListenerMap & string>(eventName: EventName, fn: CallbackFn) {
		let eventFns = this.handlers.get(eventName);

		if (!eventFns) {
			eventFns = [fn];
		} else {
			eventFns.push(fn);
		}

		this.handlers.set(eventName, eventFns);
	}

	once<EventName extends keyof ListenerMap & string>(eventName: EventName, fn: CallbackFn) {
		this.on(eventName, (...args: unknown[]) => {
			this.off(eventName, fn);
			fn(...args);
		});
	}

	emit<EventName extends keyof ListenerMap & string>(
		eventName: EventName,
		event?: ListenerMap[EventName],
	) {
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
>(): EventBus<ListenerMap> {
	return new EventBusImpl();
}
