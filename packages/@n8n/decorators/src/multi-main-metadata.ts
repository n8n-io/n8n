import { Service } from '@n8n/di';

import type { Class } from './types';

export const LEADER_TAKEOVER_EVENT_NAME = 'leader-takeover';
export const LEADER_STEPDOWN_EVENT_NAME = 'leader-stepdown';

export type MultiMainEvent = typeof LEADER_TAKEOVER_EVENT_NAME | typeof LEADER_STEPDOWN_EVENT_NAME;

type EventHandlerFn = () => Promise<void> | void;

export type EventHandlerClass = Class<Record<string, EventHandlerFn>>;

type EventHandler = {
	/** Class holding the method to call on a multi-main event. */
	eventHandlerClass: EventHandlerClass;

	/** Name of the method to call on a multi-main event. */
	methodName: string;

	/** Name of the multi-main event to listen to. */
	eventName: MultiMainEvent;
};

@Service()
export class MultiMainMetadata {
	private readonly handlers: EventHandler[] = [];

	register(handler: EventHandler) {
		this.handlers.push(handler);
	}

	getHandlers(): EventHandler[] {
		return this.handlers;
	}
}
