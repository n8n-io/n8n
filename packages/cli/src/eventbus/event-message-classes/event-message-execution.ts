import { EventMessageTypeNames } from 'n8n-workflow';

import type { EventNamesExecutionType } from '.';
import { AbstractEventMessage } from './abstract-event-message';
import type { AbstractEventMessageOptions } from './abstract-event-message-options';
import type { AbstractEventPayload } from './abstract-event-payload';

export interface EventPayloadExecution extends AbstractEventPayload {
	executionId: string;
}

export interface EventMessageExecutionOptions extends AbstractEventMessageOptions {
	eventName: EventNamesExecutionType;

	payload?: EventPayloadExecution;
}

export class EventMessageExecution extends AbstractEventMessage {
	readonly __type = EventMessageTypeNames.execution;

	eventName: EventNamesExecutionType;

	payload: EventPayloadExecution;

	constructor(options: EventMessageExecutionOptions) {
		super(options);
		if (options.payload) this.setPayload(options.payload);
		if (options.anonymize) {
			this.anonymize();
		}
	}

	setPayload(payload: EventPayloadExecution): this {
		this.payload = payload;
		return this;
	}
}
