import { EventMessageTypeNames } from 'n8n-workflow';
import type { JsonValue, WorkflowSettings } from 'n8n-workflow';

import type { EventNamesAuditType } from '.';
import { AbstractEventMessage } from './abstract-event-message';
import type { AbstractEventMessageOptions } from './abstract-event-message-options';
import type { AbstractEventPayload } from './abstract-event-payload';

// --------------------------------------
// EventMessage class for Audit events
// --------------------------------------
export interface EventPayloadAudit extends AbstractEventPayload {
	msg?: JsonValue;
	/** `null` when the event names no user. */
	userId?: string | null;
	userEmail?: string;
	firstName?: string;
	lastName?: string;
	credentialName?: string;
	credentialType?: string;
	credentialId?: string | null;
	/** `null` when the event has no workflow row, such as a create that was blocked. */
	workflowId?: string | null;
	workflowName?: string;
	projectId?: string | null;
	projectName?: string;
	activeVersionId?: string | null;
	deactivatedVersionId?: string | null;
	versionId?: string | null;
	versionName?: string | null;
	versionDescription?: string | null;
	settingsChanged?: Record<string, { from: JsonValue; to: JsonValue }>;
	variableId?: string;
	variableKey?: string;
	executionId?: string;
	ipAddress?: string;
	userAgent?: string;
	redactionPolicy?: WorkflowSettings.RedactionPolicy;
	rejectionReason?: string;
	updatedBy?: string;
	kind?: string;
	scopeId?: string;
	policyId?: string;
	before?: JsonValue;
	after?: JsonValue;
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
}
