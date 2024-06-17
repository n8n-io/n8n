import type { AuthenticationMethod, IWorkflowBase } from 'n8n-workflow';
import type { IWorkflowExecutionDataProcess } from '@/Interfaces';

export type UserLike = {
	id: string;
	email?: string;
	firstName?: string;
	lastName?: string;
	role: string;
};

/**
 * Events sent by services and consumed by relays, e.g. `AuditEventRelay`.
 */
export type Event = {
	'workflow-created': {
		user: UserLike;
		workflow: IWorkflowBase;
	};

	'workflow-deleted': {
		user: UserLike;
		workflowId: string;
	};

	'workflow-saved': {
		user: UserLike;
		workflowId: string;
		workflowName: string;
	};

	'workflow-pre-execute': {
		executionId: string;
		data: IWorkflowExecutionDataProcess /* main process */ | IWorkflowBase /* worker */;
	};

	'workflow-post-execute': {
		executionId: string;
		success: boolean;
		userId?: string;
		workflowId: string;
		isManual: boolean;
		workflowName: string;
		metadata?: Record<string, string>;
	};

	'node-pre-execute': {
		executionId: string;
		workflow: IWorkflowBase;
		nodeName: string;
	};

	'node-post-execute': {
		executionId: string;
		workflow: IWorkflowBase;
		nodeName: string;
	};

	'user-deleted': {
		user: UserLike;
	};

	'user-invited': {
		user: UserLike;
		targetUserId: string[];
	};

	'user-reinvited': {
		user: UserLike;
		targetUserId: string[];
	};

	'user-updated': {
		user: UserLike;
		fieldsChanged: string[];
	};

	'user-signed-up': {
		user: UserLike;
	};

	'user-logged-in': {
		user: UserLike;
		authenticationMethod: AuthenticationMethod;
	};

	'user-login-failed': {
		userEmail: string;
		authenticationMethod: AuthenticationMethod;
		reason?: string;
	};

	'user-invite-email-click': {
		inviter: UserLike;
		invitee: UserLike;
	};

	'user-password-reset-email-click': {
		user: UserLike;
	};

	'user-password-reset-request-click': {
		user: UserLike;
	};

	'api-key-created': {
		user: UserLike;
	};

	'api-key-deleted': {
		user: UserLike;
	};

	'email-failed': {
		user: UserLike;
		messageType:
			| 'Reset password'
			| 'New user invite'
			| 'Resend invite'
			| 'Workflow shared'
			| 'Credentials shared';
	};

	'credentials-created': {
		user: UserLike;
		credentialName: string;
		credentialType: string;
		credentialId: string;
	};

	'credentials-shared': {
		user: UserLike;
		credentialName: string;
		credentialType: string;
		credentialId: string;
		userIdSharer: string;
		userIdsShareesRemoved: string[];
		shareesRemoved: number | null;
	};

	'credentials-updated': {
		user: UserLike;
		credentialName: string;
		credentialType: string;
		credentialId: string;
	};

	'credentials-deleted': {
		user: UserLike;
		credentialName: string;
		credentialType: string;
		credentialId: string;
	};

	'community-package-installed': {
		user: UserLike;
		inputString: string;
		packageName: string;
		success: boolean;
		packageVersion?: string;
		packageNodeNames?: string[];
		packageAuthor?: string;
		packageAuthorEmail?: string;
		failureReason?: string;
	};

	'community-package-updated': {
		user: UserLike;
		packageName: string;
		packageVersionCurrent: string;
		packageVersionNew: string;
		packageNodeNames: string[];
		packageAuthor?: string;
		packageAuthorEmail?: string;
	};

	'community-package-deleted': {
		user: UserLike;
		packageName: string;
		packageVersion: string;
		packageNodeNames: string[];
		packageAuthor?: string;
		packageAuthorEmail?: string;
	};
};
