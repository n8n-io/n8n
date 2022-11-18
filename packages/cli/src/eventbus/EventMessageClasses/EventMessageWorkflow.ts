import {
	AbstractEventMessage,
	AbstractEventPayload,
	// EventMessageSerialized,
	isEventMessageSerialized,
} from './AbstractEventMessage';
import { JsonObject } from 'n8n-workflow';
import { EventMessageTypeNames } from '.';

// export type EventNamesWorkflow = 'workflowStarted' | 'workflowEnded';
// export type EventGroupWorkflow = `${EventMessageNamespaceN8n}.workflow`;
// export type FullEventNamesWorkflow = `${EventGroupWorkflow}.${EventNamesWorkflow}`;

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
