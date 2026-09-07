import { EventEmitter } from 'node:events';

type Payloads<ListenerMap> = {
	[E in keyof ListenerMap]: unknown;
};

type Listener<Payload> = (payload: Payload) => void;

export class TypedEmitter<ListenerMap extends Payloads<ListenerMap>> extends EventEmitter {
	private readonly debounceWait = 300; // milliseconds

	private debouncedEmitTimer: NodeJS.Timeout | undefined;

	override on<EventName extends keyof ListenerMap & string>(
		eventName: EventName,
		listener: Listener<ListenerMap[EventName]>,
	) {
		return super.on(eventName, listener);
	}

	override once<EventName extends keyof ListenerMap & string>(
		eventName: EventName,
		listener: Listener<ListenerMap[EventName]>,
	) {
		return super.once(eventName, listener);
	}

	override off<EventName extends keyof ListenerMap & string>(
		eventName: EventName,
		listener: Listener<ListenerMap[EventName]>,
	) {
		return super.off(eventName, listener);
	}

	override emit<EventName extends keyof ListenerMap & string>(
		eventName: EventName,
		payload?: ListenerMap[EventName],
	): boolean {
		return super.emit(eventName, payload);
	}

	protected debouncedEmit<EventName extends keyof ListenerMap & string>(
		eventName: EventName,
		payload?: ListenerMap[EventName],
	) {
		clearTimeout(this.debouncedEmitTimer);
		this.debouncedEmitTimer = setTimeout(() => this.emit(eventName, payload), this.debounceWait);
	}
}
