import { AbstractEventMessage, isEventMessageOptionsWithType } from './AbstractEventMessage';
import type { IWorkflowBase, JsonObject } from 'n8n-workflow';
import { EventMessageTypeNames } from 'n8n-workflow';
import type { AbstractEventMessageOptions } from './AbstractEventMessageOptions';
import type { AbstractEventPayload } from './AbstractEventPayload';
import type { IExecutionBase } from '@/Interfaces';

export const eventNamesWorkflow = [
	'n8n.workflow.started',
	'n8n.workflow.success',
	'n8n.workflow.failed',
] as const;

export type EventNamesWorkflowType = (typeof eventNamesWorkflow)[number];

// --------------------------------------
// EventMessage class for Workflow events
// --------------------------------------
interface EventPayloadWorkflow extends AbstractEventPayload {
	msg?: string;

	workflowData?: IWorkflowBase;

	executionId?: IExecutionBase['id'];

	workflowId?: IWorkflowBase['id'];
}

export interface EventMessageWorkflowOptions extends AbstractEventMessageOptions {
	eventName: EventNamesWorkflowType;

	payload?: EventPayloadWorkflow | undefined;
}

export class EventMessageWorkflow extends AbstractEventMessage {
	readonly __type = EventMessageTypeNames.workflow;

	eventName: EventNamesWorkflowType;

	payload: EventPayloadWorkflow;

	constructor(options: EventMessageWorkflowOptions) {
		super(options);
		if (options.payload) this.setPayload(options.payload);
		if (options.anonymize) {
			this.anonymize();
		}
	}

	setPayload(payload: EventPayloadWorkflow): this {
		this.payload = payload;
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
