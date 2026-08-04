import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import type { EventHandler } from '../types';

export const LEADER_TAKEOVER_EVENT_NAME = 'leader-takeover';
export const LEADER_STEPDOWN_EVENT_NAME = 'leader-stepdown';

export type MultiMainEvent = typeof LEADER_TAKEOVER_EVENT_NAME | typeof LEADER_STEPDOWN_EVENT_NAME;

export type MultiMainEventHandler = EventHandler<MultiMainEvent>;

@Service()
export class MultiMainMetadata {
	private readonly handlers: MultiMainEventHandler[] = [];

	private onRegister?: (handler: MultiMainEventHandler) => void;

	register(handler: MultiMainEventHandler) {
		this.handlers.push(handler);
		this.onRegister?.(handler);
	}

	/**
	 * Subscribe to handler registrations. Immediately replays every handler
	 * registered so far, then notifies the listener on each subsequent
	 * registration. This lets listeners be wired regardless of when the
	 * decorated class's module is loaded.
	 */
	subscribe(listener: (handler: MultiMainEventHandler) => void) {
		if (this.onRegister) {
			throw new UnexpectedError('A listener is already subscribed to handler registrations');
		}

		this.onRegister = listener;
		for (const handler of this.handlers) listener(handler);
	}
}
