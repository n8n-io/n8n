import type { EventMessageAiNode } from './event-message-ai-node';
import type { EventMessageAudit } from './event-message-audit';
import type { EventMessageExecution } from './event-message-execution';
import type { EventMessageGeneric } from './event-message-generic';
import type { EventMessageNode } from './event-message-node';
import type { EventMessageQueue } from './event-message-queue';
import type { EventMessageRunner } from './event-message-runner';
import type { EventMessageWorkflow } from './event-message-workflow';

export const eventNamesAiNodes = [
	'n8n.ai.memory.get.messages',
	'n8n.ai.memory.added.message',
	'n8n.ai.output.parser.parsed',
	'n8n.ai.retriever.get.relevant.documents',
	'n8n.ai.embeddings.embedded.document',
	'n8n.ai.embeddings.embedded.query',
	'n8n.ai.document.processed',
	'n8n.ai.text.splitter.split',
	'n8n.ai.tool.called',
	'n8n.ai.vector.store.searched',
	'n8n.ai.llm.generated',
	'n8n.ai.llm.error',
	'n8n.ai.vector.store.populated',
	'n8n.ai.vector.store.updated',
] as const;

export type EventNamesAiNodesType = (typeof eventNamesAiNodes)[number];

export const eventNamesRunner = [
	'n8n.runner.task.requested',
	'n8n.runner.response.received',
] as const;

export type EventNamesRunnerType = (typeof eventNamesRunner)[number];

export const eventNamesQueue = [
	'n8n.queue.job.enqueued',
	'n8n.queue.job.dequeued',
	'n8n.queue.job.completed',
	'n8n.queue.job.failed',
	'n8n.queue.job.stalled',
] as const;

export type EventNamesQueueType = (typeof eventNamesQueue)[number];

export const eventNamesWorkflow = [
	'n8n.workflow.started',
	'n8n.workflow.success',
	'n8n.workflow.failed',
] as const;
export const eventNamesGeneric = ['n8n.worker.started', 'n8n.worker.stopped'] as const;
export const eventNamesNode = ['n8n.node.started', 'n8n.node.finished'] as const;
export const eventNamesExecution = [
	'n8n.execution.throttled',
	'n8n.execution.started-during-bootup',
] as const;
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
	'n8n.audit.workflow.archived',
	'n8n.audit.workflow.unarchived',
] as const;

export type EventNamesWorkflowType = (typeof eventNamesWorkflow)[number];
export type EventNamesAuditType = (typeof eventNamesAudit)[number];
export type EventNamesNodeType = (typeof eventNamesNode)[number];
export type EventNamesExecutionType = (typeof eventNamesExecution)[number];
export type EventNamesGenericType = (typeof eventNamesGeneric)[number];

export type EventNamesTypes =
	| EventNamesAuditType
	| EventNamesWorkflowType
	| EventNamesNodeType
	| EventNamesExecutionType
	| EventNamesGenericType
	| EventNamesAiNodesType
	| EventNamesRunnerType
	| EventNamesQueueType
	| 'n8n.destination.test';

export const eventNamesAll = [
	...eventNamesAudit,
	...eventNamesWorkflow,
	...eventNamesNode,
	...eventNamesGeneric,
	...eventNamesAiNodes,
	...eventNamesRunner,
	...eventNamesQueue,
];

export type EventMessageTypes =
	| EventMessageGeneric
	| EventMessageWorkflow
	| EventMessageAudit
	| EventMessageNode
	| EventMessageExecution
	| EventMessageAiNode
	| EventMessageQueue
	| EventMessageRunner;
