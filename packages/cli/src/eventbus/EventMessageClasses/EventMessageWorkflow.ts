import { AbstractEventMessage, isEventMessageOptionsWithType } from './AbstractEventMessage';
import { AbstractEventMessageOptions } from './AbstractEventMessageOptions';
import { EventMessageTypeNames, IWorkflowBase, JsonObject } from 'n8n-workflow';
import { AbstractEventPayload } from './AbstractEventPayload';

export const eventNamesWorkflow = [
	'n8n.workflow.started',
	'n8n.workflow.finished',
	'n8n.workflow.success',
	'n8n.workflow.failed',
	'n8n.workflow.error',
	'n8n.workflow.state.unknown',
	'n8n.workflow.shared',
	'n8n.workflow.executed',
] as const;
export type EventNamesWorkflowType = typeof eventNamesWorkflow[number];

// --------------------------------------
// EventMessage class for Workflow events
// --------------------------------------
export interface EventPayloadWorkflow extends AbstractEventPayload {
	msg?: string;

	workflowData?: IWorkflowBase;

	execution_id?: string;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	workflow_id?: number | string | any;
}

export interface EventMessageWorkflowOptions extends AbstractEventMessageOptions {
	eventName: EventNamesWorkflowType;

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
