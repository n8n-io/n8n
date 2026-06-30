import type { JsonObject } from 'n8n-workflow';
import { EventMessageTypeNames } from 'n8n-workflow';

import type { EventNamesMcpType } from '.';
import { AbstractEventMessage, isEventMessageOptionsWithType } from './abstract-event-message';
import type { AbstractEventMessageOptions } from './abstract-event-message-options';
import type { AbstractEventPayload } from './abstract-event-payload';

// --------------------------------------
// EventMessage class for MCP server events
// --------------------------------------
export interface EventPayloadMcp extends AbstractEventPayload {
	msg?: string;
	// Redactable user fields (transformed by `@Redactable()` on the relay)
	userId?: string;
	_email?: string;
	_firstName?: string;
	_lastName?: string;
	globalRole?: string;
	toolName?: string;
	workflowId?: string;
	status?: 'success' | 'error';
	errorMessage?: string;
	clientId?: string;
	clientName?: string;
}

export interface EventMessageMcpOptions extends AbstractEventMessageOptions {
	eventName: EventNamesMcpType;

	payload?: EventPayloadMcp | undefined;
}

export class EventMessageMcp extends AbstractEventMessage {
	readonly __type = EventMessageTypeNames.mcp;

	eventName: EventNamesMcpType;

	payload: EventPayloadMcp;

	constructor(options: EventMessageMcpOptions) {
		super(options);
		if (options.payload) this.setPayload(options.payload);
		if (options.anonymize) {
			this.anonymize();
		}
	}

	setPayload(payload: EventPayloadMcp): this {
		this.payload = payload;
		return this;
	}

	deserialize(data: JsonObject): this {
		if (isEventMessageOptionsWithType(data, this.__type)) {
			this.setOptionsOrDefault(data);
			if (data.payload) this.setPayload(data.payload as EventPayloadMcp);
		}
		return this;
	}
}
