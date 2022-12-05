import { EventMessageAudit, eventNamesAudit, EventNamesAuditType } from './EventMessageAudit';
import { EventMessageGeneric } from './EventMessageGeneric';
import {
	EventMessageWorkflow,
	eventNamesWorkflow,
	EventNamesWorkflowType,
} from './EventMessageWorkflow';

export type EventNamesTypes = EventNamesAuditType | EventNamesWorkflowType;
export const eventNamesAll = [...eventNamesAudit, ...eventNamesWorkflow];

export type EventMessageTypes = EventMessageGeneric | EventMessageWorkflow | EventMessageAudit;
