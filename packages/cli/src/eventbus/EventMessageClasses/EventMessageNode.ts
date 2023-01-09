import { AbstractEventMessage, isEventMessageOptionsWithType } from './AbstractEventMessage';
import { EventMessageTypeNames, JsonObject } from 'n8n-workflow';
import type { AbstractEventMessageOptions } from './AbstractEventMessageOptions';
import type { AbstractEventPayload } from './AbstractEventPayload';

export const eventNamesNode = ['n8n.node.started', 'n8n.node.finished'] as const;
export type EventNamesNodeType = typeof eventNamesNode[number];

// --------------------------------------
// EventMessage class for Node events
// --------------------------------------
export interface EventPayloadNode extends AbstractEventPayload {
	msg?: string;
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
