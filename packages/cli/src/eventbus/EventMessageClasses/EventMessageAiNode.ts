import { AbstractEventMessage, isEventMessageOptionsWithType } from './AbstractEventMessage';
import type { EventNamesAiNodesType, JsonObject } from 'n8n-workflow';
import { EventMessageTypeNames } from 'n8n-workflow';
import type { AbstractEventMessageOptions } from './AbstractEventMessageOptions';
import type { AbstractEventPayload } from './AbstractEventPayload';

// --------------------------------------
// EventMessage class for Node events
// --------------------------------------
export interface EventPayloadAiNode extends AbstractEventPayload {
	msg?: string;
	executionId: string;
	nodeName: string;
	workflowId?: string;
	workflowName: string;
	nodeType?: string;
}

export interface EventMessageAiNodeOptions extends AbstractEventMessageOptions {
	eventName: EventNamesAiNodesType;

	payload?: EventPayloadAiNode | undefined;
}

export class EventMessageAiNode extends AbstractEventMessage {
	readonly __type = EventMessageTypeNames.aiNode;

	eventName: EventNamesAiNodesType;

	payload: EventPayloadAiNode;

	constructor(options: EventMessageAiNodeOptions) {
		super(options);
		if (options.payload) this.setPayload(options.payload);
		if (options.anonymize) {
			this.anonymize();
		}
	}

	setPayload(payload: EventPayloadAiNode): this {
		this.payload = payload;
		return this;
	}

	deserialize(data: JsonObject): this {
		if (isEventMessageOptionsWithType(data, this.__type)) {
			this.setOptionsOrDefault(data);
			if (data.payload) this.setPayload(data.payload as EventPayloadAiNode);
		}
		return this;
	}
}
