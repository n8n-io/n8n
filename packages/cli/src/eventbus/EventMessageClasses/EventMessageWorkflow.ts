import {
	AbstractEventMessage,
	AbstractEventPayload,
	// EventMessageSerialized,
	isEventMessageSerialized,
} from './AbstractEventMessage';
import { JsonObject } from 'n8n-workflow';
import { EventMessageNamespaceN8n, EventMessageTypeNames } from '.';

type EventNames = 'workflowStarted' | 'workflowEnded';
type EventGroup = 'workflow';
export type FullEventNamesWorkflow = `${EventMessageNamespaceN8n}.${EventGroup}.${EventNames}`;

// --------------------------------------
// EventMessage class for Workflow events
// --------------------------------------
export class EventPayloadWorkflow extends AbstractEventPayload {
	id: number;

	msg: string;
}

export class EventMessageWorkflow extends AbstractEventMessage {
	readonly __type: string = EventMessageTypeNames.eventMessageWorkflow;

	eventName: FullEventNamesWorkflow;

	payload: EventPayloadWorkflow;

	setPayload(payload: EventPayloadWorkflow): this {
		this.payload = payload;
		return this;
	}

	anonymize(): this {
		return this;
	}

	// serialize(): EventMessageSerialized {
	// 	const baseSerialized = super.serialize();
	// }

	deserialize(data: JsonObject): this {
		if (isEventMessageSerialized(data, this.__type)) {
			this.setOptionsOrDefault(data);
			if (data.payload) this.setPayload(data.payload as EventPayloadWorkflow);
		}
		return this;
	}
}
