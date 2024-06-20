import type { EventMessageAiNode } from './EventMessageAiNode';
import type { EventMessageAudit } from './EventMessageAudit';
import type { EventMessageGeneric } from './EventMessageGeneric';
import type { EventMessageNode } from './EventMessageNode';
import type { EventMessageWorkflow } from './EventMessageWorkflow';
import { eventNamesAiNodes, type EventNamesAiNodesType } from 'n8n-workflow';

export const eventNamesWorkflow = [
	'n8n.workflow.started',
	'n8n.workflow.success',
	'n8n.workflow.failed',
	'n8n.workflow.crashed',
] as const;
export const eventNamesGeneric = ['n8n.worker.started', 'n8n.worker.stopped'] as const;
export const eventNamesNode = ['n8n.node.started', 'n8n.node.finished'] as const;
export const eventNamesAudit = [
	'n8n.audit.user.login.success',
	'n8n.audit.user.login.failed',
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
	'n8n.audit.user.credentials.updated',
	'n8n.audit.user.credentials.deleted',
	'n8n.audit.user.api.created',
	'n8n.audit.user.api.deleted',
	'n8n.audit.package.installed',
	'n8n.audit.package.updated',
	'n8n.audit.package.deleted',
	'n8n.audit.workflow.created',
	'n8n.audit.workflow.deleted',
	'n8n.audit.workflow.updated',
] as const;

export type EventNamesWorkflowType = (typeof eventNamesWorkflow)[number];
export type EventNamesAuditType = (typeof eventNamesAudit)[number];
export type EventNamesNodeType = (typeof eventNamesNode)[number];
export type EventNamesGenericType = (typeof eventNamesGeneric)[number];

export type EventNamesTypes =
	| EventNamesAuditType
	| EventNamesWorkflowType
	| EventNamesNodeType
	| EventNamesGenericType
	| EventNamesAiNodesType
	| 'n8n.destination.test';

export const eventNamesAll = [
	...eventNamesAudit,
	...eventNamesWorkflow,
	...eventNamesNode,
	...eventNamesGeneric,
	...eventNamesAiNodes,
];

export type EventMessageTypes =
	| EventMessageGeneric
	| EventMessageWorkflow
	| EventMessageAudit
	| EventMessageNode
	| EventMessageAiNode;
