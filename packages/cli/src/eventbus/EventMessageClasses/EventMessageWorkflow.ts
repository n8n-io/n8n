import { AbstractEventMessage, isEventMessageOptionsWithType } from './AbstractEventMessage';
import { AbstractEventMessageOptions } from './AbstractEventMessageOptions';
import { EventMessageTypeNames, JsonObject } from 'n8n-workflow';
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

export class EventMessageWorkflowOptions extends AbstractEventMessageOptions {
	payload?: EventPayloadWorkflow | undefined;
}

export class EventMessageWorkflow extends AbstractEventMessage {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
	readonly __type: string = EventMessageTypeNames.workflow;

	eventName: EventNamesWorkflowType;

	payload: EventPayloadWorkflow;

	constructor(options: EventMessageWorkflowOptions) {
		super(options);
		if (options.payload) this.setPayload(options.payload);
	}

	setPayload(payload: EventPayloadWorkflow): this {
		this.payload = payload;
		return this;
	}

	anonymize(): this {
		return this;
	}

	deserialize(data: JsonObject): this {
		if (isEventMessageOptionsWithType(data, this.__type)) {
			this.setOptionsOrDefault(data);
			if (data.payload) this.setPayload(data.payload as EventPayloadWorkflow);
		}
		return this;
	}
}
