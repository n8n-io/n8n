import type { InstanceType } from '@n8n/constants';
import { Service, type Constructable } from '@n8n/di';

export interface ScheduledOptions {
	type: string;

	/** If set, register only when the instance is one of these types. */
	instanceTypes?: InstanceType[];
}

export type ScheduledHandlerClass = Constructable;

export interface ScheduledHandler {
	handlerClass: ScheduledHandlerClass;
	methodName: string;
	taskType: string;
	instanceTypes?: InstanceType[];
}

/** Collects methods decorated with {@link Scheduled} at import time. */
@Service()
export class ScheduledMetadata {
	private readonly handlers: ScheduledHandler[] = [];

	register(handler: ScheduledHandler) {
		this.handlers.push(handler);
	}

	getHandlers(): ScheduledHandler[] {
		return this.handlers;
	}
}
