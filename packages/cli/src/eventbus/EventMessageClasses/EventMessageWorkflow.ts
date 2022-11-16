import {
	AbstractEventMessage,
	AbstractEventPayload,
	EventMessageSerialized,
	isEventMessageSerialized,
} from './AbstractEventMessage';
import { JsonObject } from 'n8n-workflow';
import { EventMessageTypeNames } from './Helpers';

export class EventPayloadWorkflow extends AbstractEventPayload {
	id: number;
}

export class EventMessageWorkflow extends AbstractEventMessage {
	readonly __type: string = EventMessageTypeNames.eventMessageWorkflow;

	payload: EventPayloadWorkflow;

	setPayload(payload: EventPayloadWorkflow): this {
		this.payload = payload;
		return this;
	}

	serialize(): EventMessageSerialized {
		// TODO: filter payload for sensitive info here?
		return {
			__type: this.__type,
			id: this.id,
			ts: this.ts.toISO(),
			eventName: this.eventName,
			level: this.level,
			payload: this.payload ?? new EventPayloadWorkflow(),
		};
	}

	deserialize(data: JsonObject): this {
		if (isEventMessageSerialized(data, this.__type)) {
			this.setOptionsOrDefault(data);
			if (data.payload) this.setPayload(data.payload as EventPayloadWorkflow);
		}
		return this;
	}
}
