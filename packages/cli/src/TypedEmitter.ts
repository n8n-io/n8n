import { EventEmitter } from 'node:events';
import debounce from 'lodash/debounce';

type EventName = string;

type Payloads<L> = {
	[E in Extract<keyof L, EventName>]: unknown;
};

type Listener<P> = (payload: P) => void;

export class TypedEmitter<L extends Payloads<L>> extends EventEmitter {
	protected debounceWait = 300;

	override on<U extends Extract<keyof L, EventName>>(event: U, listener: Listener<L[U]>) {
		return super.on(event, listener);
	}

	override once<U extends Extract<keyof L, EventName>>(event: U, listener: Listener<L[U]>) {
		return super.once(event, listener);
	}

	override off<U extends Extract<keyof L, EventName>>(event: U, listener: Listener<L[U]>) {
		return super.off(event, listener);
	}

	override emit<U extends Extract<keyof L, EventName>>(event: U, payload?: L[U]): boolean {
		return super.emit(event, payload);
	}

	protected debouncedEmit = debounce(
		<U extends Extract<keyof L, EventName>>(event: U, payload?: L[U]) => super.emit(event, payload),
		this.debounceWait,
	);
}
