import { EventEmitter } from 'node:events';
import { Service } from 'typedi';
import type { AuditEventArgs } from './audit.types';

type EventArgs = AuditEventArgs; // also `TelemetryEventArgs` in future

@Service()
export class EventRelay extends EventEmitter {
	emit<K extends keyof EventArgs>(eventName: K, arg: EventArgs[K]) {
		super.emit(eventName, arg);
		return true;
	}

	on<K extends keyof EventArgs>(eventName: K, handler: (arg: EventArgs[K]) => void) {
		super.on(eventName, handler);
		return this;
	}
}
