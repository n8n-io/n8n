import { Redactable } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { IWorkflowBase } from 'n8n-workflow';

import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { EventRelay } from '@/events/relays/event-relay';

@Service()
export class LogStreamingEventRelay extends EventRelay {
	constructor(
		readonly eventService: EventService,
		private readonly eventBus: MessageEventBus,
		private readonly instanceSettings: InstanceSettings,
	) {
		super(eventService);
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

	// #region Workflow

	@Redactable()
	private workflowCreated({ user, workflow }: RelayEventMap['workflow-created']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.workflow.created',
			payload: {
				...user,
				workflowId: workflow.id,
				workflowName: workflow.name,
			},
		});
	}

	@Redactable()
	private workflowDeleted({ user, workflowId }: RelayEventMap['workflow-deleted']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.workflow.deleted',
			payload: { ...user, workflowId },
		});
	}

	@Redactable()
	private workflowArchived({ user, workflowId }: RelayEventMap['workflow-archived']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.workflow.archived',
			payload: { ...user, workflowId },
		});
	}

	@Redactable()
	private workflowUnarchived({ user, workflowId }: RelayEventMap['workflow-unarchived']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.workflow.unarchived',
			payload: { ...user, workflowId },
		});
	}

	@Redactable()
	private workflowSaved({ user, workflow }: RelayEventMap['workflow-saved']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.workflow.updated',
			payload: {
				...user,
				workflowId: workflow.id,
				workflowName: workflow.name,
			},
		});
	}

	private workflowPreExecute({ data, executionId }: RelayEventMap['workflow-pre-execute']) {
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
						workflowId: (data as IWorkflowBase).id,
						isManual: false,
						workflowName: (data as IWorkflowBase).name,
					};

		void this.eventBus.sendWorkflowEvent({
			eventName: 'n8n.workflow.started',
			payload,
		});
	}

	private workflowPostExecute(event: RelayEventMap['workflow-post-execute']) {
		const { runData, workflow, executionId, ...rest } = event;

		const payload = {
			...rest,
			executionId,
			success: !!runData?.finished, // despite the `success` name, this reports `finished` state
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

	// #endregion

	// #region Node

	private nodePreExecute({
		workflow,
		executionId,
		nodeId,
		nodeName,
		nodeType,
	}: RelayEventMap['node-pre-execute']) {
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

	private nodePostExecute({
		workflow,
		executionId,
		nodeType,
		nodeName,
		nodeId,
	}: RelayEventMap['node-post-execute']) {
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

	// #endregion

	// #region User

	@Redactable()
	private userDeleted({ user }: RelayEventMap['user-deleted']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.deleted',
			payload: user,
		});
	}

	@Redactable()
	private userInvited({ user, targetUserId }: RelayEventMap['user-invited']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.invited',
			payload: { ...user, targetUserId },
		});
	}

	@Redactable()
	private userReinvited({ user, targetUserId }: RelayEventMap['user-reinvited']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.reinvited',
			payload: { ...user, targetUserId },
		});
	}

	@Redactable()
	private userUpdated({ user, fieldsChanged }: RelayEventMap['user-updated']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.updated',
			payload: { ...user, fieldsChanged },
		});
	}

	// #endregion

	// #region Auth

	@Redactable()
	private userSignedUp({ user }: RelayEventMap['user-signed-up']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.signedup',
			payload: user,
		});
	}

	@Redactable()
	private userLoggedIn({ user, authenticationMethod }: RelayEventMap['user-logged-in']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.login.success',
			payload: { ...user, authenticationMethod },
		});
	}

	private userLoginFailed(
		event: RelayEventMap['user-login-failed'] /* exception: no `UserLike` to redact */,
	) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.login.failed',
			payload: event,
		});
	}

	// #endregion

	// #region Click

	@Redactable('inviter')
	@Redactable('invitee')
	private userInviteEmailClick(event: RelayEventMap['user-invite-email-click']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.invitation.accepted',
			payload: event,
		});
	}

	@Redactable()
	private userPasswordResetEmailClick({ user }: RelayEventMap['user-password-reset-email-click']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.reset',
			payload: user,
		});
	}

	@Redactable()
	private userPasswordResetRequestClick({
		user,
	}: RelayEventMap['user-password-reset-request-click']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.reset.requested',
			payload: user,
		});
	}

	// #endregion

	// #region Public API

	@Redactable()
	private publicApiKeyCreated({ user }: RelayEventMap['public-api-key-created']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.api.created',
			payload: user,
		});
	}

	@Redactable()
	private publicApiKeyDeleted({ user }: RelayEventMap['public-api-key-deleted']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.api.deleted',
			payload: user,
		});
	}

	// #endregion

	// #region Email

	@Redactable()
	private emailFailed({ user, messageType }: RelayEventMap['email-failed']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.email.failed',
			payload: { ...user, messageType },
		});
	}

	// #endregion

	// #region Credentials

	@Redactable()
	private credentialsCreated({ user, ...rest }: RelayEventMap['credentials-created']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.credentials.created',
			payload: { ...user, ...rest },
		});
	}

	@Redactable()
	private credentialsDeleted({ user, ...rest }: RelayEventMap['credentials-deleted']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.credentials.deleted',
			payload: { ...user, ...rest },
		});
	}

	@Redactable()
	private credentialsShared({ user, ...rest }: RelayEventMap['credentials-shared']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.credentials.shared',
			payload: { ...user, ...rest },
		});
	}

	@Redactable()
	private credentialsUpdated({ user, ...rest }: RelayEventMap['credentials-updated']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.credentials.updated',
			payload: { ...user, ...rest },
		});
	}

	// #endregion

	// #region Community package

	@Redactable()
	private communityPackageInstalled({
		user,
		...rest
	}: RelayEventMap['community-package-installed']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.package.installed',
			payload: { ...user, ...rest },
		});
	}

	@Redactable()
	private communityPackageUpdated({ user, ...rest }: RelayEventMap['community-package-updated']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.package.updated',
			payload: { ...user, ...rest },
		});
	}

	@Redactable()
	private communityPackageDeleted({ user, ...rest }: RelayEventMap['community-package-deleted']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.package.deleted',
			payload: { ...user, ...rest },
		});
	}

	// #endregion

	// #region Execution

	private executionThrottled({ executionId, type }: RelayEventMap['execution-throttled']) {
		void this.eventBus.sendExecutionEvent({
			eventName: 'n8n.execution.throttled',
			payload: { executionId, type },
		});
	}

	private executionStartedDuringBootup({
		executionId,
	}: RelayEventMap['execution-started-during-bootup']) {
		void this.eventBus.sendExecutionEvent({
			eventName: 'n8n.execution.started-during-bootup',
			payload: { executionId },
		});
	}

	// #endregion

	// #region AI

	private aiMessagesRetrievedFromMemory(
		payload: RelayEventMap['ai-messages-retrieved-from-memory'],
	) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.memory.get.messages',
			payload,
		});
	}

	private aiMessageAddedToMemory(payload: RelayEventMap['ai-message-added-to-memory']) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.memory.added.message',
			payload,
		});
	}

	private aiOutputParsed(payload: RelayEventMap['ai-output-parsed']) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.output.parser.parsed',
			payload,
		});
	}

	private aiDocumentsRetrieved(payload: RelayEventMap['ai-documents-retrieved']) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.retriever.get.relevant.documents',
			payload,
		});
	}

	private aiDocumentEmbedded(payload: RelayEventMap['ai-document-embedded']) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.embeddings.embedded.document',
			payload,
		});
	}

	private aiQueryEmbedded(payload: RelayEventMap['ai-query-embedded']) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.embeddings.embedded.query',
			payload,
		});
	}

	private aiDocumentProcessed(payload: RelayEventMap['ai-document-processed']) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.document.processed',
			payload,
		});
	}

	private aiTextSplitIntoChunks(payload: RelayEventMap['ai-text-split']) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.text.splitter.split',
			payload,
		});
	}

	private aiToolCalled(payload: RelayEventMap['ai-tool-called']) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.tool.called',
			payload,
		});
	}

	private aiVectorStoreSearched(payload: RelayEventMap['ai-vector-store-searched']) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.vector.store.searched',
			payload,
		});
	}

	private aiLlmGeneratedOutput(payload: RelayEventMap['ai-llm-generated-output']) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.llm.generated',
			payload,
		});
	}

	private aiLlmErrored(payload: RelayEventMap['ai-llm-errored']) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.llm.error',
			payload,
		});
	}

	private aiVectorStorePopulated(payload: RelayEventMap['ai-vector-store-populated']) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.vector.store.populated',
			payload,
		});
	}

	private aiVectorStoreUpdated(payload: RelayEventMap['ai-vector-store-updated']) {
		void this.eventBus.sendAiNodeEvent({
			eventName: 'n8n.ai.vector.store.updated',
			payload,
		});
	}

	// #endregion

	// #region runner

	private runnerTaskRequested(payload: RelayEventMap['runner-task-requested']) {
		void this.eventBus.sendRunnerEvent({
			eventName: 'n8n.runner.task.requested',
			payload,
		});
	}

	private runnerResponseReceived(payload: RelayEventMap['runner-response-received']) {
		void this.eventBus.sendRunnerEvent({
			eventName: 'n8n.runner.response.received',
			payload,
		});
	}

	// #endregion

	// #region queue

	private jobEnqueued(payload: RelayEventMap['job-enqueued']) {
		void this.eventBus.sendQueueEvent({
			eventName: 'n8n.queue.job.enqueued',
			payload,
		});
	}

	private jobDequeued(payload: RelayEventMap['job-dequeued']) {
		void this.eventBus.sendQueueEvent({
			eventName: 'n8n.queue.job.dequeued',
			payload,
		});
	}

	private jobStalled(payload: RelayEventMap['job-stalled']) {
		void this.eventBus.sendQueueEvent({
			eventName: 'n8n.queue.job.stalled',
			payload,
		});
	}

	// #endregion
}
