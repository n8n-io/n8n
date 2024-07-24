import { EventEmitter } from 'node:events';
import { Service } from 'typedi';
import type { Event } from './event.types';

@Service()
export class EventService extends EventEmitter {
	emit<K extends keyof Event>(eventName: K, arg?: Event[K]) {
		super.emit(eventName, arg);
		return true;
	}

	on<K extends keyof Event>(eventName: K, handler: (arg: Event[K]) => void) {
		super.on(eventName, handler);
		return this;
	}
}
