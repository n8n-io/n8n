import { EventMessageTypeNames } from 'n8n-workflow';

import { AbstractEventMessage } from './abstract-event-message';
import type { AbstractEventMessageOptions } from './abstract-event-message-options';
import type { AbstractEventPayload } from './abstract-event-payload';

export interface EventPayloadRunner extends AbstractEventPayload {
	taskId: string;
	nodeId: string;
	executionId: string;
	workflowId: string;
}

export interface EventMessageRunnerOptions extends AbstractEventMessageOptions {
	payload?: EventPayloadRunner;
}

export class EventMessageRunner extends AbstractEventMessage {
	readonly __type = EventMessageTypeNames.runner;

	payload: EventPayloadRunner;

	constructor(options: EventMessageRunnerOptions) {
		super(options);
		if (options.payload) this.setPayload(options.payload);
		if (options.anonymize) {
			this.anonymize();
		}
	}

	setPayload(payload: EventPayloadRunner): this {
		this.payload = payload;
		return this;
	}
}
