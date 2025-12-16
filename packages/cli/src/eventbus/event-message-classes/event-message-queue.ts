import type { JsonObject } from 'n8n-workflow';
import { EventMessageTypeNames } from 'n8n-workflow';

import { AbstractEventMessage, isEventMessageOptionsWithType } from './abstract-event-message';
import type { AbstractEventMessageOptions } from './abstract-event-message-options';
import type { AbstractEventPayload } from './abstract-event-payload';

export interface EventPayloadQueue extends AbstractEventPayload {
	workflowId: string;
	jobId: string;
	executionId: string;
	hostId: string;
}

export interface EventMessageQueueOptions extends AbstractEventMessageOptions {
	payload?: EventPayloadQueue;
}

export class EventMessageQueue extends AbstractEventMessage {
	readonly __type = EventMessageTypeNames.runner;

	payload: EventPayloadQueue;

	constructor(options: EventMessageQueueOptions) {
		super(options);
		if (options.payload) this.setPayload(options.payload);
		if (options.anonymize) {
			this.anonymize();
		}
	}

	setPayload(payload: EventPayloadQueue): this {
		this.payload = payload;
		return this;
	}

	deserialize(data: JsonObject): this {
		if (isEventMessageOptionsWithType(data, this.__type)) {
			this.setOptionsOrDefault(data);
			if (data.payload) this.setPayload(data.payload as EventPayloadQueue);
		}
		return this;
	}
}
