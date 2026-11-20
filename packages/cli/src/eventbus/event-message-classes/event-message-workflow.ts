import type { IExecutionBase } from '@n8n/db';
import type { IWorkflowBase } from 'n8n-workflow';
import { EventMessageTypeNames } from 'n8n-workflow';

import type { EventNamesWorkflowType } from '.';
import { AbstractEventMessage } from './abstract-event-message';
import type { AbstractEventMessageOptions } from './abstract-event-message-options';
import type { AbstractEventPayload } from './abstract-event-payload';

// --------------------------------------
// EventMessage class for Workflow events
// --------------------------------------
export interface EventPayloadWorkflow extends AbstractEventPayload {
	msg?: string;

	workflowData?: IWorkflowBase;

	executionId?: IExecutionBase['id'];

	workflowId?: IWorkflowBase['id'];

	/** The agent whose workflow tool started the execution. */
	agentId?: string;

	/** That agent's service account. Attribution only: the execution does not run as it. */
	agentServiceAccountId?: string;

	/** The n8n user who started the agent run, when there is one. */
	agentRunUserId?: string;

	/** For a sub-agent's tool run, the top-level agent that delegated to it. */
	delegatingAgentId?: string;
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
}
