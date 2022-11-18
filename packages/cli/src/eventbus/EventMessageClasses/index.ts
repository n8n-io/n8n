import { eventNamesAudit, EventNamesAuditType } from './EventMessageAudit';
import { EventMessageGeneric } from './EventMessageGeneric';
import {
	EventMessageWorkflow,
	eventNamesWorkflow,
	EventNamesWorkflowType,
} from './EventMessageWorkflow';

// export type EventMessageNamespaceN8n = 'n8n';
// export const sEventMessageNamespaceN8n = 'n8n';
// export type EventMessageEventGroups = EventGroupWorkflow | EventGroupAudit;
export type EventNamesTypes = EventNamesAuditType | EventNamesWorkflowType;
export const eventNamesAll = [...eventNamesAudit, ...eventNamesWorkflow, 'michael.test.event'];

export type EventMessageTypes = EventMessageGeneric | EventMessageWorkflow;

export enum EventMessageTypeNames {
	eventMessage = '$$EventMessage',
	eventMessageAudit = '$$EventMessageAudit',
	eventMessageConfirm = '$$EventMessageConfirm',
	eventMessageWorkflow = '$$EventMessageWorkflow',
}

// Uses same logging levels as LoggerProxy
export enum EventMessageLevel {
	log = 'log',
	debug = 'debug',
	info = 'info',
	error = 'error',
	verbose = 'verbose',
	warn = 'warn',
	allLevels = '*',
}
