import { EventEmitter } from 'node:events';
import type { AuditEventArgs } from './audit.types';
import { Service } from 'typedi';

type EventArgs = AuditEventArgs; // also `TelemetryEventArgs` in future

/**
 * Service to send events for other services to listen to.
 */
@Service()
export class EventSender extends EventEmitter {
	emit<K extends keyof AuditEventArgs>(eventName: K, arg: EventArgs[K]) {
		super.emit(eventName, arg);
		return true;
	}
}
