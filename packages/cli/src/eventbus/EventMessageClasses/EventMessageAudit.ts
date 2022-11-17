import {
	AbstractEventMessage,
	AbstractEventPayload,
	EventMessageSerialized,
	isEventMessageSerialized,
} from './AbstractEventMessage';
import { JsonObject } from 'n8n-workflow';
import { EventMessageNamespaceN8n, EventMessageTypeNames } from '.';

type EventNames = 'created' | 'updated' | 'deleted';
type EventGroup = 'audit';
export type FullEventNamesAudit = `${EventMessageNamespaceN8n}.${EventGroup}.${EventNames}`;

// --------------------------------------
// EventMessage class for Audit events
// --------------------------------------
export class EventPayloadAudit extends AbstractEventPayload {
	id: number;

	msg: string;
}

export class EventMessageAudit extends AbstractEventMessage {
	readonly __type: string = EventMessageTypeNames.eventMessageAudit;

	eventName: FullEventNamesAudit;

	payload: EventPayloadAudit;

	setPayload(payload: EventPayloadAudit): this {
		this.payload = payload;
		return this;
	}

	anonymize(): this {
		return this;
	}

	serialize(): EventMessageSerialized {
		// TODO: filter payload for sensitive info here?
		return {
			__type: this.__type,
			id: this.id,
			ts: this.ts.toISO(),
			eventName: this.eventName,
			message: this.message,
			level: this.level,
			payload: this.payload ?? new EventPayloadAudit(),
		};
	}

	deserialize(data: JsonObject): this {
		if (isEventMessageSerialized(data, this.__type)) {
			this.setOptionsOrDefault(data);
			if (data.payload) this.setPayload(data.payload as EventPayloadAudit);
		}
		return this;
	}
}
