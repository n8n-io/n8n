import { Service } from 'typedi';
import { MessageEventBus } from './MessageEventBus/MessageEventBus';
import { Redactable } from '@/decorators/Redactable';
import { EventRelay } from './event-relay.service';
import type { Event } from './event.types';
import type { IWorkflowBase } from 'n8n-workflow';

@Service()
export class AuditEventRelay {
	constructor(
		private readonly eventRelay: EventRelay,
		private readonly eventBus: MessageEventBus,
	) {}

	init() {
		this.setupHandlers();
	}

	private setupHandlers() {
		this.eventRelay.on('workflow-created', (event) => this.workflowCreated(event));
		this.eventRelay.on('workflow-deleted', (event) => this.workflowDeleted(event));
		this.eventRelay.on('workflow-saved', (event) => this.workflowSaved(event));
		this.eventRelay.on('workflow-pre-execute', (event) => this.workflowPreExecute(event));
		this.eventRelay.on('workflow-post-execute', (event) => this.workflowPostExecute(event));
		this.eventRelay.on('node-pre-execute', (event) => this.nodePreExecute(event));
		this.eventRelay.on('node-post-execute', (event) => this.nodePostExecute(event));
		this.eventRelay.on('user-deleted', (event) => this.userDeleted(event));
		this.eventRelay.on('user-invited', (event) => this.userInvited(event));
		this.eventRelay.on('user-reinvited', (event) => this.userReinvited(event));
		this.eventRelay.on('user-updated', (event) => this.userUpdated(event));
		this.eventRelay.on('user-signed-up', (event) => this.userSignedUp(event));
		this.eventRelay.on('user-logged-in', (event) => this.userLoggedIn(event));
		this.eventRelay.on('user-login-failed', (event) => this.userLoginFailed(event));
		this.eventRelay.on('user-invite-email-click', (event) => this.userInviteEmailClick(event));
		this.eventRelay.on('user-password-reset-email-click', (event) =>
			this.userPasswordResetEmailClick(event),
		);
		this.eventRelay.on('user-password-reset-request-click', (event) =>
			this.userPasswordResetRequestClick(event),
		);
		this.eventRelay.on('api-key-created', (event) => this.apiKeyCreated(event));
		this.eventRelay.on('api-key-deleted', (event) => this.apiKeyDeleted(event));
		this.eventRelay.on('email-failed', (event) => this.emailFailed(event));
		this.eventRelay.on('credentials-created', (event) => this.credentialsCreated(event));
		this.eventRelay.on('credentials-deleted', (event) => this.credentialsDeleted(event));
		this.eventRelay.on('credentials-shared', (event) => this.credentialsShared(event));
		this.eventRelay.on('credentials-updated', (event) => this.credentialsUpdated(event));
		this.eventRelay.on('credentials-deleted', (event) => this.credentialsDeleted(event));
		this.eventRelay.on('community-package-installed', (event) =>
			this.communityPackageInstalled(event),
		);
		this.eventRelay.on('community-package-updated', (event) => this.communityPackageUpdated(event));
		this.eventRelay.on('community-package-deleted', (event) => this.communityPackageDeleted(event));
	}

	/**
	 * Workflow
	 */

	@Redactable()
	private workflowCreated({ user, workflow }: Event['workflow-created']) {
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
	private workflowDeleted({ user, workflowId }: Event['workflow-deleted']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.workflow.deleted',
			payload: { ...user, workflowId },
		});
	}

	@Redactable()
	private workflowSaved({ user, workflowId, workflowName }: Event['workflow-saved']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.workflow.updated',
			payload: {
				...user,
				workflowId,
				workflowName,
			},
		});
	}

	private workflowPreExecute({ data, executionId }: Event['workflow-pre-execute']) {
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

	private workflowPostExecute(event: Event['workflow-post-execute']) {
		void this.eventBus.sendWorkflowEvent({
			eventName: 'n8n.workflow.success',
			payload: event,
		});
	}

	/**
	 * Node
	 */

	private nodePreExecute({ workflow, executionId, nodeName }: Event['node-pre-execute']) {
		void this.eventBus.sendNodeEvent({
			eventName: 'n8n.node.started',
			payload: {
				workflowId: workflow.id,
				workflowName: workflow.name,
				executionId,
				nodeType: workflow.nodes.find((n) => n.name === nodeName)?.type,
				nodeName,
			},
		});
	}

	private nodePostExecute({ workflow, executionId, nodeName }: Event['node-post-execute']) {
		void this.eventBus.sendNodeEvent({
			eventName: 'n8n.node.finished',
			payload: {
				workflowId: workflow.id,
				workflowName: workflow.name,
				executionId,
				nodeType: workflow.nodes.find((n) => n.name === nodeName)?.type,
				nodeName,
			},
		});
	}

	/**
	 * User
	 */

	@Redactable()
	private userDeleted({ user }: Event['user-deleted']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.deleted',
			payload: user,
		});
	}

	@Redactable()
	private userInvited({ user, targetUserId }: Event['user-invited']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.invited',
			payload: { ...user, targetUserId },
		});
	}

	@Redactable()
	private userReinvited({ user, targetUserId }: Event['user-reinvited']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.reinvited',
			payload: { ...user, targetUserId },
		});
	}

	@Redactable()
	private userUpdated({ user, fieldsChanged }: Event['user-updated']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.updated',
			payload: { ...user, fieldsChanged },
		});
	}

	/**
	 * Auth
	 */

	@Redactable()
	private userSignedUp({ user }: Event['user-signed-up']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.signedup',
			payload: user,
		});
	}

	@Redactable()
	private userLoggedIn({ user, authenticationMethod }: Event['user-logged-in']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.login.success',
			payload: { ...user, authenticationMethod },
		});
	}

	private userLoginFailed(
		event: Event['user-login-failed'] /* exception: no `UserLike` to redact */,
	) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.login.failed',
			payload: event,
		});
	}

	/**
	 * Click
	 */

	@Redactable('inviter')
	@Redactable('invitee')
	private userInviteEmailClick(event: Event['user-invite-email-click']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.invitation.accepted',
			payload: event,
		});
	}

	@Redactable()
	private userPasswordResetEmailClick({ user }: Event['user-password-reset-email-click']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.reset',
			payload: user,
		});
	}

	@Redactable()
	private userPasswordResetRequestClick({ user }: Event['user-password-reset-request-click']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.reset.requested',
			payload: user,
		});
	}

	/**
	 * API key
	 */

	@Redactable()
	private apiKeyCreated({ user }: Event['api-key-created']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.api.created',
			payload: user,
		});
	}

	@Redactable()
	private apiKeyDeleted({ user }: Event['api-key-deleted']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.api.deleted',
			payload: user,
		});
	}

	/**
	 * Emailing
	 */

	@Redactable()
	private emailFailed({ user, messageType }: Event['email-failed']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.email.failed',
			payload: { ...user, messageType },
		});
	}

	/**
	 * Credentials
	 */

	@Redactable()
	private credentialsCreated({ user, ...rest }: Event['credentials-created']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.credentials.created',
			payload: { ...user, ...rest },
		});
	}

	@Redactable()
	private credentialsDeleted({ user, ...rest }: Event['credentials-deleted']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.credentials.deleted',
			payload: { ...user, ...rest },
		});
	}

	@Redactable()
	private credentialsShared({ user, ...rest }: Event['credentials-shared']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.credentials.shared',
			payload: { ...user, ...rest },
		});
	}

	@Redactable()
	private credentialsUpdated({ user, ...rest }: Event['credentials-updated']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.credentials.updated',
			payload: { ...user, ...rest },
		});
	}

	/**
	 * Community package
	 */

	@Redactable()
	private communityPackageInstalled({ user, ...rest }: Event['community-package-installed']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.package.installed',
			payload: { ...user, ...rest },
		});
	}

	@Redactable()
	private communityPackageUpdated({ user, ...rest }: Event['community-package-updated']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.package.updated',
			payload: { ...user, ...rest },
		});
	}

	@Redactable()
	private communityPackageDeleted({ user, ...rest }: Event['community-package-deleted']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.package.deleted',
			payload: { ...user, ...rest },
		});
	}
}
