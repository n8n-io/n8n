import { EventEmitter } from 'node:events';
import { Service } from 'typedi';
import { MessageEventBus } from './MessageEventBus/MessageEventBus';
import { Redactable } from '@/decorators/Redactable';
import type { AuditEventArgs } from './audit.types';
import type { IWorkflowBase } from 'n8n-workflow';

/**
 * Service for adding events from `EventSender` to the audit log.
 */
@Service()
export class AuditorService extends EventEmitter {
	constructor(private readonly eventBus: MessageEventBus) {
		super();
		this.setupHandlers();
	}

	on<K extends keyof AuditEventArgs>(eventName: K, handler: (arg: AuditEventArgs[K]) => void) {
		super.on(eventName, handler);
		return this;
	}

	private setupHandlers() {
		this.on('workflow-created', (arg) => this.workflowCreated(arg));
		this.on('workflow-deleted', (arg) => this.workflowDeleted(arg));
		this.on('workflow-saved', (arg) => this.workflowSaved(arg));
		this.on('workflow-pre-execute', (arg) => this.workflowPreExecute(arg));
		this.on('workflow-post-execute', (arg) => this.workflowPostExecute(arg));
		this.on('node-pre-execute', (arg) => this.nodePreExecute(arg));
		this.on('node-post-execute', (arg) => this.nodePostExecute(arg));
		this.on('user-deleted', (arg) => this.userDeleted(arg));
		this.on('user-invited', (arg) => this.userInvited(arg));
		this.on('user-reinvited', (arg) => this.userReinvited(arg));
		this.on('user-updated', (arg) => this.userUpdated(arg));
		this.on('user-signed-up', (arg) => this.userSignedUp(arg));
		this.on('user-logged-in', (arg) => this.userLoggedIn(arg));
		this.on('user-login-failed', (arg) => this.userLoginFailed(arg));
		this.on('user-invite-email-click', (arg) => this.userInviteEmailClick(arg));
		this.on('user-password-reset-email-click', (arg) => this.userPasswordResetEmailClick(arg));
		this.on('user-password-reset-request-click', (arg) => this.userPasswordResetRequestClick(arg));
		this.on('api-key-created', (arg) => this.apiKeyCreated(arg));
		this.on('api-key-deleted', (arg) => this.apiKeyDeleted(arg));
		this.on('email-failed', (arg) => this.emailFailed(arg));
		this.on('credentials-created', (arg) => this.credentialsCreated(arg));
		this.on('credentials-deleted', (arg) => this.credentialsDeleted(arg));
		this.on('credentials-shared', (arg) => this.credentialsShared(arg));
		this.on('credentials-updated', (arg) => this.credentialsUpdated(arg));
		this.on('credentials-deleted', (arg) => this.credentialsDeleted(arg));
		this.on('community-package-installed', (arg) => this.communityPackageInstalled(arg));
		this.on('community-package-updated', (arg) => this.communityPackageUpdated(arg));
		this.on('community-package-deleted', (arg) => this.communityPackageDeleted(arg));
	}

	/**
	 * Workflow
	 */

	@Redactable()
	private workflowCreated({ user, workflow }: AuditEventArgs['workflow-created']) {
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
	private workflowDeleted({ user, workflow }: AuditEventArgs['workflow-deleted']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.workflow.deleted',
			payload: { ...user, workflow: workflow.id },
		});
	}

	@Redactable()
	private workflowSaved({ user, workflow }: AuditEventArgs['workflow-saved']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.workflow.updated',
			payload: {
				...user,
				workflowId: workflow.id,
				workflowName: workflow.name,
			},
		});
	}

	private workflowPreExecute({ data, executionId }: AuditEventArgs['workflow-pre-execute']) {
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

	private workflowPostExecute(arg: AuditEventArgs['workflow-post-execute']) {
		void this.eventBus.sendWorkflowEvent({
			eventName: 'n8n.workflow.success',
			payload: arg,
		});
	}

	/**
	 * Node
	 */

	private nodePreExecute({ executionId, workflow, nodeName }: AuditEventArgs['node-pre-execute']) {
		void this.eventBus.sendNodeEvent({
			eventName: 'n8n.node.started',
			payload: {
				executionId,
				nodeName,
				workflowId: workflow.id,
				workflowName: workflow.name,
				nodeType: workflow.nodes.find((n) => n.name === nodeName)?.type,
			},
		});
	}

	private nodePostExecute({
		executionId,
		nodeName,
		workflow,
	}: AuditEventArgs['node-post-execute']) {
		void this.eventBus.sendNodeEvent({
			eventName: 'n8n.node.finished',
			payload: {
				executionId,
				nodeName,
				workflowId: workflow.id,
				workflowName: workflow.name,
				nodeType: workflow.nodes.find((n) => n.name === nodeName)?.type,
			},
		});
	}

	/**
	 * User
	 */

	@Redactable()
	private userDeleted({ user }: AuditEventArgs['user-deleted']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.deleted',
			payload: user,
		});
	}

	@Redactable()
	private userInvited({ user, targetUserId }: AuditEventArgs['user-invited']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.invited',
			payload: { ...user, targetUserId },
		});
	}

	@Redactable()
	private userReinvited({ user, targetUserId }: AuditEventArgs['user-reinvited']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.reinvited',
			payload: { ...user, targetUserId },
		});
	}

	@Redactable()
	private userUpdated({ user, fieldsChanged }: AuditEventArgs['user-updated']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.updated',
			payload: { ...user, fieldsChanged },
		});
	}

	/**
	 * Auth
	 */

	@Redactable()
	private userSignedUp({ user }: AuditEventArgs['user-signed-up']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.signedup',
			payload: user,
		});
	}

	@Redactable()
	private userLoggedIn({ user, authenticationMethod }: AuditEventArgs['user-logged-in']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.login.success',
			payload: { ...user, authenticationMethod },
		});
	}

	private userLoginFailed(
		arg: AuditEventArgs['user-login-failed'] /* exception: no `UserLike` to redact */,
	) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.login.failed',
			payload: arg,
		});
	}

	/**
	 * Click
	 */

	@Redactable('inviter')
	@Redactable('invitee')
	private userInviteEmailClick(arg: AuditEventArgs['user-invite-email-click']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.invitation.accepted',
			payload: arg,
		});
	}

	@Redactable()
	private userPasswordResetEmailClick({ user }: AuditEventArgs['user-password-reset-email-click']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.reset',
			payload: user,
		});
	}

	@Redactable()
	private userPasswordResetRequestClick({
		user,
	}: AuditEventArgs['user-password-reset-request-click']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.reset.requested',
			payload: user,
		});
	}

	/**
	 * API key
	 */

	@Redactable()
	private apiKeyCreated({ user }: AuditEventArgs['api-key-created']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.api.created',
			payload: user,
		});
	}

	@Redactable()
	private apiKeyDeleted({ user }: AuditEventArgs['api-key-deleted']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.api.deleted',
			payload: user,
		});
	}

	/**
	 * Emailing
	 */

	@Redactable()
	private emailFailed({ user, messageType }: AuditEventArgs['email-failed']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.email.failed',
			payload: { ...user, messageType },
		});
	}

	/**
	 * Credentials
	 */

	@Redactable()
	private credentialsCreated({ user, ...rest }: AuditEventArgs['credentials-created']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.credentials.created',
			payload: { ...user, ...rest },
		});
	}

	@Redactable()
	private credentialsDeleted({ user, ...rest }: AuditEventArgs['credentials-deleted']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.credentials.deleted',
			payload: { ...user, ...rest },
		});
	}

	@Redactable()
	private credentialsShared({ user, ...rest }: AuditEventArgs['credentials-shared']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.credentials.shared',
			payload: { ...user, ...rest },
		});
	}

	@Redactable()
	private credentialsUpdated({ user, ...rest }: AuditEventArgs['credentials-updated']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.user.credentials.updated',
			payload: { ...user, ...rest },
		});
	}

	/**
	 * Community package
	 */

	@Redactable()
	private communityPackageInstalled({
		user,
		...rest
	}: AuditEventArgs['community-package-installed']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.package.installed',
			payload: { ...user, ...rest },
		});
	}

	@Redactable()
	private communityPackageUpdated({ user, ...rest }: AuditEventArgs['community-package-updated']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.package.updated',
			payload: { ...user, ...rest },
		});
	}

	@Redactable()
	private communityPackageDeleted({ user, ...rest }: AuditEventArgs['community-package-deleted']) {
		void this.eventBus.sendAuditEvent({
			eventName: 'n8n.audit.package.deleted',
			payload: { ...user, ...rest },
		});
	}
}
