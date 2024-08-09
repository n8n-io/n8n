import type { UnregisterFn } from './event-bus';
import { createEventBus as createUntypedEventBus } from './event-bus';

export type Listener<Payload> = (payload: Payload) => void;

export type Payloads<ListenerMap> = {
	[E in keyof ListenerMap]: unknown;
};

export interface TypedEventBus<ListenerMap extends Payloads<ListenerMap>> {
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

export function createTypedEventBus<
	ListenerMap extends Payloads<ListenerMap>,
>(): TypedEventBus<ListenerMap> {
	return createUntypedEventBus() as TypedEventBus<ListenerMap>;
}
