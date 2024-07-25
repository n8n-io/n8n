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
 * Events sent by `EventService` and forwarded by relays, e.g. `AuditEventRelay` and `TelemetryEventRelay`.
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

	'public-api-invoked': {
		userId: string;
		path: string;
		method: string;
		apiVersion: string;
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

	'execution-throttled': {
		executionId: string;
	};

	'execution-started-during-bootup': {
		executionId: string;
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

	'source-control-settings-updated': {
		branchName: string;
		readOnlyInstance: boolean;
		repoType: 'github' | 'gitlab' | 'other';
		connected: boolean;
	};

	'source-control-user-started-pull-ui': {
		workflowUpdates: number;
		workflowConflicts: number;
		credConflicts: number;
	};

	'source-control-user-finished-pull-ui': {
		workflowUpdates: number;
	};

	'source-control-user-pulled-api': {
		workflowUpdates: number;
		forced: boolean;
	};

	'source-control-user-started-push-ui': {
		workflowsEligible: number;
		workflowsEligibleWithConflicts: number;
		credsEligible: number;
		credsEligibleWithConflicts: number;
		variablesEligible: number;
	};

	'source-control-user-finished-push-ui': {
		workflowsEligible: number;
		workflowsPushed: number;
		credsPushed: number;
		variablesPushed: number;
	};

	'license-renewal-attempted': {
		success: boolean;
	};

	'variable-created': {};

	'external-secrets-provider-settings-saved': {
		userId?: string;
		vaultType: string;
		isValid: boolean;
		isNew: boolean;
		errorMessage?: string;
	};

	'ldap-general-sync-finished': {
		type: string;
		succeeded: boolean;
		usersSynced: number;
		error: string;
	};

	'ldap-settings-updated': {
		userId: string;
		loginIdAttribute: string;
		firstNameAttribute: string;
		lastNameAttribute: string;
		emailAttribute: string;
		ldapIdAttribute: string;
		searchPageSize: number;
		searchTimeout: number;
		synchronizationEnabled: boolean;
		synchronizationInterval: number;
		loginLabel: string;
		loginEnabled: boolean;
	};

	'ldap-login-sync-failed': {
		error: string;
	};

	'login-failed-due-to-ldap-disabled': {
		userId: string;
	};

	/**
	 * Events listened to by more than one relay
	 */

	'public-api-key-created': {
		user: UserLike; // audit and telemetry
		publicApi: boolean; // telemetry only
	};

	'public-api-key-deleted': {
		user: UserLike; // audit and telemetry
		publicApi: boolean; // telemetry only
	};
};
