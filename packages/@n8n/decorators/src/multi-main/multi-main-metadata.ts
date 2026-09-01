import { Service } from '@n8n/di';

import { ReplayableRegistry } from '../replayable-registry';
import type { EventHandler } from '../types';

export const LEADER_TAKEOVER_EVENT_NAME = 'leader-takeover';
export const LEADER_STEPDOWN_EVENT_NAME = 'leader-stepdown';

export type MultiMainEvent = typeof LEADER_TAKEOVER_EVENT_NAME | typeof LEADER_STEPDOWN_EVENT_NAME;

export type MultiMainEventHandler = EventHandler<MultiMainEvent>;

@Service()
export class MultiMainMetadata extends ReplayableRegistry<MultiMainEventHandler> {
	constructor() {
		super(
			'multi-main event handler',
			({ eventHandlerClass, methodName }) => `${eventHandlerClass.name}.${methodName}`,
		);
	}
}
