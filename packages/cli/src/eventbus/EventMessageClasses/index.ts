import { EventMessageAudit, eventNamesAudit, EventNamesAuditType } from './EventMessageAudit';
import { EventMessageGeneric } from './EventMessageGeneric';
import { EventMessageNode, eventNamesNode, EventNamesNodeType } from './EventMessageNode';
import {
	EventMessageWorkflow,
	eventNamesWorkflow,
	EventNamesWorkflowType,
} from './EventMessageWorkflow';

export type EventNamesTypes = EventNamesAuditType | EventNamesWorkflowType | EventNamesNodeType;
export const eventNamesAll = [...eventNamesAudit, ...eventNamesWorkflow, ...eventNamesNode];

export type EventMessageTypes =
	| EventMessageGeneric
	| EventMessageWorkflow
	| EventMessageAudit
	| EventMessageNode;
