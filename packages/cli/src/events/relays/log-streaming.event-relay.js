'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.LogStreamingEventRelay = void 0;
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const message_event_bus_1 = require('@/eventbus/message-event-bus/message-event-bus');
const event_service_1 = require('@/events/event.service');
const event_relay_1 = require('@/events/relays/event-relay');
let LogStreamingEventRelay = class LogStreamingEventRelay extends event_relay_1.EventRelay {
	constructor(eventService, eventBus, instanceSettings) {
		super(eventService);
		this.eventService = eventService;
		this.eventBus = eventBus;
		this.instanceSettings = instanceSettings;
	}
	init() {
		this.setupListeners({
			'workflow-created': (event) => this.workflowCreated(event),
			'workflow-deleted': (event) => this.workflowDeleted(event),
			'workflow-archived': (event) => this.workflowArchived(event),
			'workflow-unarchived': (event) => this.workflowUnarchived(event),
			'workflow-saved': (event) => this.workflowSaved(event),
			'workflow-pre-execute': (event) => this.workflowPreExecute(event),
			'workflow-post-execute': (event) => this.workflowPostExecute(event),
			'node-pre-execute': (event) => this.nodePreExecute(event),
			'node-post-execute': (event) => this.nodePostExecute(event),
			'user-deleted': (event) => this.userDeleted(event),
			'user-invited': (event) => this.userInvited(event),
			'user-reinvited': (event) => this.userReinvited(event),
			'user-updated': (event) => this.userUpdated(event),
			'user-signed-up': (event) => this.userSignedUp(event),
			'user-logged-in': (event) => this.userLoggedIn(event),
			'user-login-failed': (event) => this.userLoginFailed(event),
			'user-invite-email-click': (event) => this.userInviteEmailClick(event),
			'user-password-reset-email-click': (event) => this.userPasswordResetEmailClick(event),
			'user-password-reset-request-click': (event) => this.userPasswordResetRequestClick(event),
			'public-api-key-created': (event) => this.publicApiKeyCreated(event),
			'public-api-key-deleted': (event) => this.publicApiKeyDeleted(event),
			'email-failed': (event) => this.emailFailed(event),
			'credentials-created': (event) => this.credentialsCreated(event),
			'credentials-deleted': (event) => this.credentialsDeleted(event),
			'credentials-shared': (event) => this.credentialsShared(event),
			'credentials-updated': (event) => this.credentialsUpdated(event),
			'community-package-installed': (event) => this.communityPackageInstalled(event),
			'community-package-updated': (event) => this.communityPackageUpdated(event),
			'community-package-deleted': (event) => this.communityPackageDeleted(event),
			'execution-throttled': (event) => this.executionThrottled(event),
			'execution-started-during-bootup': (event) => this.executionStartedDuringBootup(event),
			'ai-messages-retrieved-from-memory': (event) => this.aiMessagesRetrievedFromMemory(event),
			'ai-message-added-to-memory': (event) => this.aiMessageAddedToMemory(event),
			'ai-output-parsed': (event) => this.aiOutputParsed(event),
			'ai-documents-retrieved': (event) => this.aiDocumentsRetrieved(event),
			'ai-document-embedded': (event) => this.aiDocumentEmbedded(event),
			'ai-query-embedded': (event) => this.aiQueryEmbedded(event),
			'ai-document-processed': (event) => this.aiDocumentProcessed(event),
			'ai-text-split': (event) => this.aiTextSplitIntoChunks(event),
			'ai-tool-called': (event) => this.aiToolCalled(event),
			'ai-vector-store-searched': (event) => this.aiVectorStoreSearched(event),
			'ai-llm-generated-output': (event) => this.aiLlmGeneratedOutput(event),
			'ai-llm-errored': (event) => this.aiLlmErrored(event),
			'ai-vector-store-populated': (event) => this.aiVectorStorePopulated(event),
			'ai-vector-store-updated': (event) => this.aiVectorStoreUpdated(event),
			'runner-task-requested': (event) => this.runnerTaskRequested(event),
			'runner-response-received': (event) => this.runnerResponseReceived(event),
			'job-enqueued': (event) => this.jobEnqueued(event),
			'job-dequeued': (event) => this.jobDequeued(event),
			'job-stalled': (event) => this.jobStalled(event),
		});
	}
	workflowCreated({ user, workflow }) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.workflow.created',
			payload: {
				...user,
				workflowId: workflow.id,
				workflowName: workflow.name,
			},
		});
	}
	workflowDeleted({ user, workflowId }) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.workflow.deleted',
			payload: { ...user, workflowId },
		});
	}
	workflowArchived({ user, workflowId }) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.workflow.archived',
			payload: { ...user, workflowId },
		});
	}
	workflowUnarchived({ user, workflowId }) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.workflow.unarchived',
			payload: { ...user, workflowId },
		});
	}
	workflowSaved({ user, workflow }) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.workflow.updated',
			payload: {
				...user,
				workflowId: workflow.id,
				workflowName: workflow.name,
			},
		});
	}
	workflowPreExecute({ data, executionId }) {
		const payload =
			'executionData' in data
				? {
						executionId,
						userId: data.userId,
						workflowId: data.workflowData.id,
						isManual: data.executionMode === 'manual',
						workflowName: data.workflowData.name,
					}
				: {
						executionId,
						userId: undefined,
						workflowId: data.id,
						isManual: false,
						workflowName: data.name,
					};
		void this.eventBus.sendWorkflowEvent({
			eventName: 'n8n.workflow.started',
			payload,
		});
	}
	workflowPostExecute(event) {
		const { runData, workflow, executionId, ...rest } = event;
		const payload = {
			...rest,
			executionId,
			success: !!runData?.finished,
			isManual: runData?.mode === 'manual',
			workflowId: workflow.id,
			workflowName: workflow.name,
		};
		if (payload.success) {
			void this.eventBus.sendWorkflowEvent({
				eventName: 'n8n.workflow.success',
				payload,
			});
			if (runData?.jobId) {
				void this.eventBus.sendQueueEvent({
					eventName: 'n8n.queue.job.completed',
					payload: {
						executionId,
						workflowId: workflow.id,
						hostId: this.instanceSettings.hostId,
						jobId: runData.jobId.toString(),
					},
				});
			}
			return;
		}
		void this.eventBus.sendWorkflowEvent({
			eventName: 'n8n.workflow.failed',
			payload: {
				...payload,
				lastNodeExecuted: runData?.data.resultData.lastNodeExecuted,
				errorNodeType:
					runData?.data.resultData.error && 'node' in runData?.data.resultData.error
						? runData?.data.resultData.error.node?.type
						: undefined,
				errorMessage: runData?.data.resultData.error?.message.toString(),
			},
		});
		if (runData?.jobId) {
			void this.eventBus.sendQueueEvent({
				eventName: 'n8n.queue.job.failed',
				payload: {
					executionId,
					workflowId: workflow.id,
					hostId: this.instanceSettings.hostId,
					jobId: runData.jobId.toString(),
				},
			});
		}
	}
	nodePreExecute({ workflow, executionId, nodeId, nodeName, nodeType }) {
		void this.eventBus.sendNodeEvent({
			eventName: 'n8n.node.started',
			payload: {
				workflowId: workflow.id,
				workflowName: workflow.name,
				executionId,
				nodeType,
				nodeName,
				nodeId,
			},
		});
	}
	nodePostExecute({ workflow, executionId, nodeType, nodeName, nodeId }) {
		void this.eventBus.sendNodeEvent({
			eventName: 'n8n.node.finished',
			payload: {
				workflowId: workflow.id,
				workflowName: workflow.name,
				executionId,
				nodeType,
				nodeName,
				nodeId,
			},
		});
	}
	userDeleted({ user }) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.deleted',
			payload: user,
		});
	}
	userInvited({ user, targetUserId }) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.invited',
			payload: { ...user, targetUserId },
		});
	}
	userReinvited({ user, targetUserId }) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.reinvited',
			payload: { ...user, targetUserId },
		});
	}
	userUpdated({ user, fieldsChanged }) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.updated',
			payload: { ...user, fieldsChanged },
		});
	}
	userSignedUp({ user }) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.signedup',
			payload: user,
		});
	}
	userLoggedIn({ user, authenticationMethod }) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.login.success',
			payload: { ...user, authenticationMethod },
		});
	}
	userLoginFailed(event) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.login.failed',
			payload: event,
		});
	}
	userInviteEmailClick(event) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.invitation.accepted',
			payload: event,
		});
	}
	userPasswordResetEmailClick({ user }) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.reset',
			payload: user,
		});
	}
	userPasswordResetRequestClick({ user }) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.reset.requested',
			payload: user,
		});
	}
	publicApiKeyCreated({ user }) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.api.created',
			payload: user,
		});
	}
	publicApiKeyDeleted({ user }) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.api.deleted',
			payload: user,
		});
	}
	emailFailed({ user, messageType }) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.email.failed',
			payload: { ...user, messageType },
		});
	}
	credentialsCreated({ user, ...rest }) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.credentials.created',
			payload: { ...user, ...rest },
		});
	}
	credentialsDeleted({ user, ...rest }) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.credentials.deleted',
			payload: { ...user, ...rest },
		});
	}
	credentialsShared({ user, ...rest }) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.credentials.shared',
			payload: { ...user, ...rest },
		});
	}
	credentialsUpdated({ user, ...rest }) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.credentials.updated',
			payload: { ...user, ...rest },
		});
	}
	communityPackageInstalled({ user, ...rest }) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.package.installed',
			payload: { ...user, ...rest },
		});
	}
	communityPackageUpdated({ user, ...rest }) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.package.updated',
			payload: { ...user, ...rest },
		});
	}
	communityPackageDeleted({ user, ...rest }) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.package.deleted',
			payload: { ...user, ...rest },
		});
	}
	executionThrottled({ executionId, type }) {
		void this.eventBus.sendExecutionEvent({
			eventName: 'n8n.execution.throttled',
			payload: { executionId, type },
		});
	}
	executionStartedDuringBootup({ executionId }) {
		void this.eventBus.sendExecutionEvent({
			eventName: 'n8n.execution.started-during-bootup',
			payload: { executionId },
		});
	}
	aiMessagesRetrievedFromMemory(payload) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.memory.get.messages',
			payload,
		});
	}
	aiMessageAddedToMemory(payload) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.memory.added.message',
			payload,
		});
	}
	aiOutputParsed(payload) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.output.parser.parsed',
			payload,
		});
	}
	aiDocumentsRetrieved(payload) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.retriever.get.relevant.documents',
			payload,
		});
	}
	aiDocumentEmbedded(payload) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.embeddings.embedded.document',
			payload,
		});
	}
	aiQueryEmbedded(payload) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.embeddings.embedded.query',
			payload,
		});
	}
	aiDocumentProcessed(payload) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.document.processed',
			payload,
		});
	}
	aiTextSplitIntoChunks(payload) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.text.splitter.split',
			payload,
		});
	}
	aiToolCalled(payload) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.tool.called',
			payload,
		});
	}
	aiVectorStoreSearched(payload) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.vector.store.searched',
			payload,
		});
	}
	aiLlmGeneratedOutput(payload) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.llm.generated',
			payload,
		});
	}
	aiLlmErrored(payload) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.llm.error',
			payload,
		});
	}
	aiVectorStorePopulated(payload) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.vector.store.populated',
			payload,
		});
	}
	aiVectorStoreUpdated(payload) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.vector.store.updated',
			payload,
		});
	}
	runnerTaskRequested(payload) {
		void this.eventBus.sendRunnerEvent({
			eventName: 'n8n.runner.task.requested',
			payload,
		});
	}
	runnerResponseReceived(payload) {
		void this.eventBus.sendRunnerEvent({
			eventName: 'n8n.runner.response.received',
			payload,
		});
	}
	jobEnqueued(payload) {
		void this.eventBus.sendQueueEvent({
			eventName: 'n8n.queue.job.enqueued',
			payload,
		});
	}
	jobDequeued(payload) {
		void this.eventBus.sendQueueEvent({
			eventName: 'n8n.queue.job.dequeued',
			payload,
		});
	}
	jobStalled(payload) {
		void this.eventBus.sendQueueEvent({
			eventName: 'n8n.queue.job.stalled',
			payload,
		});
	}
};
exports.LogStreamingEventRelay = LogStreamingEventRelay;
__decorate(
	[
		(0, decorators_1.Redactable)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	LogStreamingEventRelay.prototype,
	'workflowCreated',
	null,
);
__decorate(
	[
		(0, decorators_1.Redactable)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	LogStreamingEventRelay.prototype,
	'workflowDeleted',
	null,
);
__decorate(
	[
		(0, decorators_1.Redactable)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	LogStreamingEventRelay.prototype,
	'workflowArchived',
	null,
);
__decorate(
	[
		(0, decorators_1.Redactable)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	LogStreamingEventRelay.prototype,
	'workflowUnarchived',
	null,
);
__decorate(
	[
		(0, decorators_1.Redactable)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	LogStreamingEventRelay.prototype,
	'workflowSaved',
	null,
);
__decorate(
	[
		(0, decorators_1.Redactable)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	LogStreamingEventRelay.prototype,
	'userDeleted',
	null,
);
__decorate(
	[
		(0, decorators_1.Redactable)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	LogStreamingEventRelay.prototype,
	'userInvited',
	null,
);
__decorate(
	[
		(0, decorators_1.Redactable)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	LogStreamingEventRelay.prototype,
	'userReinvited',
	null,
);
__decorate(
	[
		(0, decorators_1.Redactable)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	LogStreamingEventRelay.prototype,
	'userUpdated',
	null,
);
__decorate(
	[
		(0, decorators_1.Redactable)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	LogStreamingEventRelay.prototype,
	'userSignedUp',
	null,
);
__decorate(
	[
		(0, decorators_1.Redactable)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	LogStreamingEventRelay.prototype,
	'userLoggedIn',
	null,
);
__decorate(
	[
		(0, decorators_1.Redactable)('inviter'),
		(0, decorators_1.Redactable)('invitee'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	LogStreamingEventRelay.prototype,
	'userInviteEmailClick',
	null,
);
__decorate(
	[
		(0, decorators_1.Redactable)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	LogStreamingEventRelay.prototype,
	'userPasswordResetEmailClick',
	null,
);
__decorate(
	[
		(0, decorators_1.Redactable)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	LogStreamingEventRelay.prototype,
	'userPasswordResetRequestClick',
	null,
);
__decorate(
	[
		(0, decorators_1.Redactable)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	LogStreamingEventRelay.prototype,
	'publicApiKeyCreated',
	null,
);
__decorate(
	[
		(0, decorators_1.Redactable)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	LogStreamingEventRelay.prototype,
	'publicApiKeyDeleted',
	null,
);
__decorate(
	[
		(0, decorators_1.Redactable)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	LogStreamingEventRelay.prototype,
	'emailFailed',
	null,
);
__decorate(
	[
		(0, decorators_1.Redactable)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	LogStreamingEventRelay.prototype,
	'credentialsCreated',
	null,
);
__decorate(
	[
		(0, decorators_1.Redactable)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	LogStreamingEventRelay.prototype,
	'credentialsDeleted',
	null,
);
__decorate(
	[
		(0, decorators_1.Redactable)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	LogStreamingEventRelay.prototype,
	'credentialsShared',
	null,
);
__decorate(
	[
		(0, decorators_1.Redactable)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	LogStreamingEventRelay.prototype,
	'credentialsUpdated',
	null,
);
__decorate(
	[
		(0, decorators_1.Redactable)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	LogStreamingEventRelay.prototype,
	'communityPackageInstalled',
	null,
);
__decorate(
	[
		(0, decorators_1.Redactable)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	LogStreamingEventRelay.prototype,
	'communityPackageUpdated',
	null,
);
__decorate(
	[
		(0, decorators_1.Redactable)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	LogStreamingEventRelay.prototype,
	'communityPackageDeleted',
	null,
);
exports.LogStreamingEventRelay = LogStreamingEventRelay = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			event_service_1.EventService,
			message_event_bus_1.MessageEventBus,
			n8n_core_1.InstanceSettings,
		]),
	],
	LogStreamingEventRelay,
);
//# sourceMappingURL=log-streaming.event-relay.js.map
