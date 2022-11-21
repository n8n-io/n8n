import { AbstractEventMessage, isEventMessageSerialized } from './AbstractEventMessage';
import { JsonObject } from 'n8n-workflow';
import { EventMessageTypeNames } from './Enums';
import { AbstractEventPayload } from './AbstractEventPayload';

export const eventNamesWorkflow = [
	'n8n.workflow.started',
	'n8n.workflow.finished',
	'n8n.workflow.exploded',
] as const;
export type EventNamesWorkflowType = typeof eventNamesWorkflow[number];

// --------------------------------------
// EventMessage class for Workflow events
// --------------------------------------
export class EventPayloadWorkflow extends AbstractEventPayload {
	id: number;

	msg: string;
}

export class EventMessageWorkflow extends AbstractEventMessage {
	readonly __type: string = EventMessageTypeNames.eventMessageWorkflow;

	eventName: EventNamesWorkflowType;

	payload: EventPayloadWorkflow;

	setPayload(payload: EventPayloadWorkflow): this {
		this.payload = payload;
		return this;
	}

	anonymize(): this {
		return this;
	}

	deserialize(data: JsonObject): this {
		if (isEventMessageSerialized(data, this.__type)) {
			this.setOptionsOrDefault(data);
			if (data.payload) this.setPayload(data.payload as EventPayloadWorkflow);
		}
		return this;
	}
}
