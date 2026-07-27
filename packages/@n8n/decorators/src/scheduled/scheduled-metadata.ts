import type { InstanceType } from '@n8n/constants';
import { Service, type Constructable } from '@n8n/di';

export interface ScheduledOptions {
	type: string;

	/** If set, register only when the instance is one of these types. */
	instanceTypes?: InstanceType[];
}

/**
 * Structural (any method shape): this package sits below `@n8n/scheduler` and
 * can't import its task types, so the bridge does the typed binding.
 */
export type ScheduledHandlerClass = Constructable;

export interface ScheduledHandler {
	handlerClass: ScheduledHandlerClass;
	methodName: string;
	taskType: string;
	instanceTypes?: InstanceType[];
}

/**
 * Collects methods decorated with {@link Scheduled} at import time; read once at
 * boot by the bridge. Mirrors `PubSubMetadata` / `ShutdownMetadata`.
 */
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
