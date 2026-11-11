import type { InstanceRole, InstanceType } from '@n8n/constants';
import { Service } from '@n8n/di';

import type { PubSubEventMap } from './pubsub.event-map';
import type { EventHandler } from '../types';

export type PubSubEventName = keyof PubSubEventMap;

export type PubSubEventFilter =
	| {
			instanceType: 'main';
			instanceRole?: Omit<InstanceRole, 'unset'>;
	  }
	| {
			instanceType: Omit<InstanceType, 'main'>;
			instanceRole?: never;
	  };

type PubSubEventHandler = EventHandler<PubSubEventName> & { filter?: PubSubEventFilter };

@Service()
export class PubSubMetadata {
	private readonly handlers: PubSubEventHandler[] = [];

	register(handler: PubSubEventHandler) {
		this.handlers.push(handler);
	}

	getHandlers(): PubSubEventHandler[] {
		return this.handlers;
	}
}
