/* eslint-disable @typescript-eslint/no-explicit-any */
import { JsonObject } from 'n8n-workflow';
import { EventMessageTypeNames } from '.';
import {
	AbstractEventMessage,
	AbstractEventPayload,
	// EventMessageSerialized,
	isEventMessageSerialized,
} from './AbstractEventMessage';

export class EventPayloadGeneric extends AbstractEventPayload {}

export class EventMessageGeneric extends AbstractEventMessage {
	readonly __type: string = EventMessageTypeNames.eventMessage;

	payload: EventPayloadGeneric;

	setPayload(payload: EventPayloadGeneric): this {
		this.payload = payload;
		return this;
	}

	anonymize(): this {
		return this;
	}

	// serialize(): EventMessageSerialized {
	// 	// TODO: filter payload for sensitive info here?
	// 	return {
	// 		__type: this.__type,
	// 		id: this.id,
	// 		ts: this.ts.toISO(),
	// 		eventName: this.eventName,
	// 		message: this.message,
	// 		level: this.level,
	// 		payload: this.payload ?? new EventPayloadGeneric(),
	// 	};
	// }

	deserialize(data: JsonObject): this {
		if (isEventMessageSerialized(data, this.__type)) {
			this.setOptionsOrDefault(data);
			if (data.payload) this.setPayload(data.payload as EventPayloadGeneric);
		}
		return this;
	}
}
