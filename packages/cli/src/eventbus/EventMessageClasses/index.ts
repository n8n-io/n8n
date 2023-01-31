import type { EventMessageAudit, EventNamesAuditType } from './EventMessageAudit';
import { eventNamesAudit } from './EventMessageAudit';
import type { EventMessageGeneric } from './EventMessageGeneric';
import type { EventMessageNode, EventNamesNodeType } from './EventMessageNode';
import { eventNamesNode } from './EventMessageNode';
import type { EventMessageWorkflow, EventNamesWorkflowType } from './EventMessageWorkflow';
import { eventNamesWorkflow } from './EventMessageWorkflow';

export type EventNamesTypes = EventNamesAuditType | EventNamesWorkflowType | EventNamesNodeType;
export const eventNamesAll = [...eventNamesAudit, ...eventNamesWorkflow, ...eventNamesNode];

export type EventMessageTypes =
	| EventMessageGeneric
	| EventMessageWorkflow
	| EventMessageAudit
	| EventMessageNode;
