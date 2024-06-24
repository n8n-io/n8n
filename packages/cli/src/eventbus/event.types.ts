import type { AuthenticationMethod, IWorkflowBase } from 'n8n-workflow';
import type { IWorkflowExecutionDataProcess } from '@/Interfaces';
import type { ProjectRole } from '@/databases/entities/ProjectRelation';
import type { GlobalRole } from '@/databases/entities/User';

export type UserLike = {
	id: string;
	email?: string;
	firstName?: string;
	lastName?: string;
	role: string;
};

/**
 * Events sent by services and consumed by relays, e.g. `AuditEventRelay` and `TelemetryEventRelay`.
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
		target_user_old_status: string;
		target_user_id?: string;
		migration_strategy?: string;
		migration_user_id?: string;
		public_api: boolean;
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

	'user-invoked-api': {
		user: UserLike;
		path: string;
		method: string;
		api_version: string;
	};

	'user-signed-up': {
		user: UserLike;
		signUpMetadata?: {
			user_type: string;
			was_disabled_ldap_user: boolean;
		};
	};

	'user-retrieved-user': {
		user: UserLike;
	};

	'user-retrieved-all-users': {
		user: UserLike;
	};

	'user-retrieved-execution': {
		user: UserLike;
	};

	'user-retrieved-all-executions': {
		user: UserLike;
	};

	'user-retrieved-all-workflows': {
		user: UserLike;
	};

	'user-retrieved-workflow': {
		user: UserLike;
	};

	'user-owner-setup': {
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

	'user-clicked-password-reset-email': {
		user: UserLike;
	};

	'n8n-stopped': {};

	'api-key-created': {
		user: UserLike;
		public_api?: boolean;
	};

	'api-key-deleted': {
		user: UserLike;
		public_api?: boolean;
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

	'team-project-updated': {
		userId: string;
		role: GlobalRole;
		members: Array<{
			userId: string;
			role: ProjectRole;
		}>;
		projectId: string;
	};

	'team-project-deleted': {
		userId: string;
		role: GlobalRole;
		projectId: string;
		removalType: 'transfer' | 'delete';
		targetProjectId?: string;
	};

	'team-project-created': {
		userId: string;
		role: GlobalRole;
	};

	'license-renew-attempted': {
		success: boolean;
	};
};
