import { EventMessageAudit, eventNamesAudit, EventNamesAuditType } from './EventMessageAudit';
import { EventMessageGeneric } from './EventMessageGeneric';
import { EventMessageUser, eventNamesUser, EventNamesUserType } from './EventMessageUser';
import {
	EventMessageWorkflow,
	eventNamesWorkflow,
	EventNamesWorkflowType,
} from './EventMessageWorkflow';

export type EventNamesTypes = EventNamesAuditType | EventNamesWorkflowType | EventNamesUserType;
export const eventNamesAll = [...eventNamesAudit, ...eventNamesWorkflow, ...eventNamesUser];

export type EventMessageTypes =
	| EventMessageGeneric
	| EventMessageWorkflow
	| EventMessageAudit
	| EventMessageUser;
