'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.eventNamesAll =
	exports.eventNamesAudit =
	exports.eventNamesExecution =
	exports.eventNamesNode =
	exports.eventNamesGeneric =
	exports.eventNamesWorkflow =
	exports.eventNamesQueue =
	exports.eventNamesRunner =
	exports.eventNamesAiNodes =
		void 0;
exports.eventNamesAiNodes = [
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
];
exports.eventNamesRunner = ['n8n.runner.task.requested', 'n8n.runner.response.received'];
exports.eventNamesQueue = [
	'n8n.queue.job.enqueued',
	'n8n.queue.job.dequeued',
	'n8n.queue.job.completed',
	'n8n.queue.job.failed',
	'n8n.queue.job.stalled',
];
exports.eventNamesWorkflow = [
	'n8n.workflow.started',
	'n8n.workflow.success',
	'n8n.workflow.failed',
];
exports.eventNamesGeneric = ['n8n.worker.started', 'n8n.worker.stopped'];
exports.eventNamesNode = ['n8n.node.started', 'n8n.node.finished'];
exports.eventNamesExecution = ['n8n.execution.throttled', 'n8n.execution.started-during-bootup'];
exports.eventNamesAudit = [
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
];
exports.eventNamesAll = [
	...exports.eventNamesAudit,
	...exports.eventNamesWorkflow,
	...exports.eventNamesNode,
	...exports.eventNamesGeneric,
	...exports.eventNamesAiNodes,
	...exports.eventNamesRunner,
	...exports.eventNamesQueue,
];
//# sourceMappingURL=index.js.map
