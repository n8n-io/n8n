import { Service } from '@n8n/di';

import type { EventHandler } from '../types';

export const LEADER_TAKEOVER_EVENT_NAME = 'leader-takeover';
export const LEADER_STEPDOWN_EVENT_NAME = 'leader-stepdown';

export type MultiMainEvent = typeof LEADER_TAKEOVER_EVENT_NAME | typeof LEADER_STEPDOWN_EVENT_NAME;

type MultiMainEventHandler = EventHandler<MultiMainEvent>;

@Service()
export class MultiMainMetadata {
	private readonly handlers: MultiMainEventHandler[] = [];

	register(handler: MultiMainEventHandler) {
		this.handlers.push(handler);
	}

	getHandlers(): MultiMainEventHandler[] {
		return this.handlers;
	}
}
