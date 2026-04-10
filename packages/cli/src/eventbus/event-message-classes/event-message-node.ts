import type { JsonObject } from 'n8n-workflow';
import { EventMessageTypeNames } from 'n8n-workflow';

import type { EventNamesNodeType } from '.';
import { AbstractEventMessage, isEventMessageOptionsWithType } from './abstract-event-message';
import type { AbstractEventMessageOptions } from './abstract-event-message-options';
import type { AbstractEventPayload } from './abstract-event-payload';

// --------------------------------------
// EventMessage class for Node events
// --------------------------------------
export interface EventPayloadNode extends AbstractEventPayload {
	msg?: string;
	executionId: string;
	nodeName: string;
	nodeId?: string;
	workflowId?: string;
	workflowName: string;
	nodeType?: string;
}

export interface EventMessageNodeOptions extends AbstractEventMessageOptions {
	eventName: EventNamesNodeType;

	payload?: EventPayloadNode | undefined;
}

export class EventMessageNode extends AbstractEventMessage {
	readonly __type = EventMessageTypeNames.node;

	eventName: EventNamesNodeType;

	payload: EventPayloadNode;

	constructor(options: EventMessageNodeOptions) {
		super(options);
		if (options.payload) this.setPayload(options.payload);
		if (options.anonymize) {
			this.anonymize();
		}
	}

	setPayload(payload: EventPayloadNode): this {
		this.payload = payload;
		return this;
	}

	deserialize(data: JsonObject): this {
		if (isEventMessageOptionsWithType(data, this.__type)) {
			this.setOptionsOrDefault(data);
			if (data.payload) this.setPayload(data.payload as EventPayloadNode);
		}
		return this;
	}
}
