import { AbstractEventMessage, isEventMessageOptionsWithType } from './AbstractEventMessage';
import { EventMessageTypeNames } from 'n8n-workflow';
import type { JsonObject, JsonValue } from 'n8n-workflow';
import type { AbstractEventPayload } from './AbstractEventPayload';
import type { AbstractEventMessageOptions } from './AbstractEventMessageOptions';
import type { EventNamesAuditType } from '.';

// --------------------------------------
// EventMessage class for Audit events
// --------------------------------------
export interface EventPayloadAudit extends AbstractEventPayload {
	msg?: JsonValue;
	userId?: string;
	userEmail?: string;
	firstName?: string;
	lastName?: string;
	credentialName?: string;
	credentialType?: string;
	credentialId?: string;
	workflowId?: string;
	workflowName?: string;
}

export interface EventMessageAuditOptions extends AbstractEventMessageOptions {
	eventName: EventNamesAuditType;

	payload?: EventPayloadAudit;
}

export class EventMessageAudit extends AbstractEventMessage {
	readonly __type = EventMessageTypeNames.audit;

	eventName: EventNamesAuditType;

	payload: EventPayloadAudit;

	constructor(options: EventMessageAuditOptions) {
		super(options);
		if (options.payload) this.setPayload(options.payload);
		if (options.anonymize) {
			this.anonymize();
		}
	}

	setPayload(payload: EventPayloadAudit): this {
		this.payload = payload;
		return this;
	}

	deserialize(data: JsonObject): this {
		if (isEventMessageOptionsWithType(data, this.__type)) {
			this.setOptionsOrDefault(data);
			if (data.payload) this.setPayload(data.payload as EventPayloadAudit);
		}
		return this;
	}
}
