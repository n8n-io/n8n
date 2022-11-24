/* eslint-disable @typescript-eslint/no-explicit-any */
import { JsonObject } from 'n8n-workflow';
import { EventMessageTypeNames } from './Enums';
import {
	AbstractEventMessage,
	// EventMessageSerialized,
	isEventMessageOptionsWithType,
} from './AbstractEventMessage';
import { AbstractEventPayload } from './AbstractEventPayload';
import { AbstractEventMessageOptions } from './AbstractEventMessageOptions';

export class EventPayloadGeneric extends AbstractEventPayload {}

export class EventMessageGenericOptions extends AbstractEventMessageOptions {
	payload?: EventPayloadGeneric;
}

export class EventMessageGeneric extends AbstractEventMessage {
	readonly __type: string = EventMessageTypeNames.generic;

	payload: EventPayloadGeneric;

	constructor(options: EventMessageGenericOptions) {
		super(options);
		if (options.payload) this.setPayload(options.payload);
	}

	setPayload(payload: EventPayloadGeneric): this {
		this.payload = payload;
		return this;
	}

	anonymize(): this {
		return this;
	}

	deserialize(data: JsonObject): this {
		if (isEventMessageOptionsWithType(data, this.__type)) {
			this.setOptionsOrDefault(data);
			if (data.payload) this.setPayload(data.payload as EventPayloadGeneric);
		}
		return this;
	}
}
