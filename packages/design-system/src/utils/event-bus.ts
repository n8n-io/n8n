// eslint-disable-next-line @typescript-eslint/ban-types
export type CallbackFn = Function;
export type UnregisterFn = () => void;

export interface EventBus {
	on: (eventName: string, fn: CallbackFn) => UnregisterFn;
	once: (eventName: string, fn: CallbackFn) => UnregisterFn;
	off: (eventName: string, fn: CallbackFn) => void;
	emit: <T = Event>(eventName: string, event?: T) => void;
}

/**
 * @deprecated Use the typed version instead from `typed-event-bus.ts`
 */
export function createEventBus(): EventBus {
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
