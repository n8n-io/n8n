import { eventNamesAudit, EventNamesAuditType } from './EventMessageAudit';
import { EventMessageGeneric } from './EventMessageGeneric';
import {
	EventMessageWorkflow,
	eventNamesWorkflow,
	EventNamesWorkflowType,
} from './EventMessageWorkflow';

export type EventNamesTypes = EventNamesAuditType | EventNamesWorkflowType;
export const eventNamesAll = [...eventNamesAudit, ...eventNamesWorkflow, 'michael.test.event'];

export type EventMessageTypes = EventMessageGeneric | EventMessageWorkflow;
