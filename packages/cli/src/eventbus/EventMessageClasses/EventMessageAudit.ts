import { AbstractEventMessage, isEventMessageOptionsWithType } from './AbstractEventMessage';
import { EventMessageTypeNames, JsonObject, JsonValue } from 'n8n-workflow';
import { AbstractEventPayload } from './AbstractEventPayload';
import { AbstractEventMessageOptions } from './AbstractEventMessageOptions';

export const eventNamesAudit = [
	'n8n.audit.user.signedup',
	'n8n.audit.user.updated',
	'n8n.audit.user.deleted',
	'n8n.audit.user.invited',
	'n8n.audit.user.invitation.accepted',
	'n8n.audit.user.reinvited',
	'n8n.audit.user.email.failed',
	'n8n.audit.user.reset.requested',
	'n8n.audit.user.reset',
	'n8n.audit.user.credentials.created',
	'n8n.audit.user.credentials.shared',
	'n8n.audit.user.api.created',
	'n8n.audit.user.api.deleted',
	'n8n.audit.package.installed',
	'n8n.audit.package.updated',
	'n8n.audit.package.deleted',
	'n8n.audit.workflow.created',
	'n8n.audit.workflow.deleted',
	'n8n.audit.workflow.updated',
] as const;
export type EventNamesAuditType = typeof eventNamesAudit[number];

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
