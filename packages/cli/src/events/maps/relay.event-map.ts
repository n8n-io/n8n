import type { AuthenticationMethod, ProjectRelation } from '@n8n/api-types';
import type { AuthProviderType, User, IWorkflowDb } from '@n8n/db';
import type { GlobalRole } from '@n8n/permissions';
import type {
	IPersonalizationSurveyAnswersV4,
	IRun,
	IWorkflowBase,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';

import type { ConcurrencyQueueType } from '@/concurrency/concurrency-control.service';

import type { AiEventMap } from './ai.event-map';

export type UserLike = {
	id: string;
	email?: string;
	firstName?: string;
	lastName?: string;
	role: string;
};

export type RelayEventMap = {
	// #region Lifecycle

	'server-started': {};

	'session-started': {
		pushRef?: string;
	};

	'instance-stopped': {};

	'instance-owner-setup': {
		userId: string;
	};

	'first-production-workflow-succeeded': {
		projectId: string;
		workflowId: string;
		userId: string;
	};

	'first-workflow-data-loaded': {
		userId: string;
		workflowId: string;
		nodeType: string;
		nodeId: string;
		credentialType?: string;
		credentialId?: string;
	};

	// #endregion

	// #region Workflow

	'workflow-created': {
		user: UserLike;
		workflow: IWorkflowBase;
		publicApi: boolean;
		projectId: string;
		projectType: string;
	};

	'workflow-deleted': {
		user: UserLike;
		workflowId: string;
		publicApi: boolean;
	};

	'workflow-archived': {
		user: UserLike;
		workflowId: string;
		publicApi: boolean;
	};

	'workflow-unarchived': {
		user: UserLike;
		workflowId: string;
		publicApi: boolean;
	};

	'workflow-saved': {
		user: UserLike;
		workflow: IWorkflowDb;
		publicApi: boolean;
	};

	'workflow-pre-execute': {
		executionId: string;
		data: IWorkflowExecutionDataProcess /* main process */ | IWorkflowBase /* worker */;
	};

	'workflow-post-execute': {
		executionId: string;
		userId?: string;
		workflow: IWorkflowBase;
		runData?: IRun;
	};

	'workflow-sharing-updated': {
		workflowId: string;
		userIdSharer: string;
		userIdList: string[];
	};

	// #endregion

	// #region Node

	'node-pre-execute': {
		executionId: string;
		workflow: IWorkflowBase;
		nodeId?: string;
		nodeName: string;
		nodeType?: string;
	};

	'node-post-execute': {
		executionId: string;
		workflow: IWorkflowBase;
		nodeId?: string;
		nodeName: string;
		nodeType?: string;
	};

	// #endregion

	// #region User

	'user-submitted-personalization-survey': {
		userId: string;
		answers: IPersonalizationSurveyAnswersV4;
	};

	'user-deleted': {
		user: UserLike;
		publicApi: boolean;
		targetUserOldStatus: 'active' | 'invited';
		migrationStrategy?: 'transfer_data' | 'delete_data';
		targetUserId?: string;
		migrationUserId?: string;
	};

	'user-invited': {
		user: UserLike;
		targetUserId: string[];
		publicApi: boolean;
		emailSent: boolean;
		inviteeRole: string;
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
		userType: AuthProviderType;
		wasDisabledLdapUser: boolean;
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

	'user-changed-role': {
		userId: string;
		targetUserId: string;
		publicApi: boolean;
		targetUserNewRole: string;
	};

	'user-retrieved-user': {
		userId: string;
		publicApi: boolean;
	};

	'user-retrieved-all-users': {
		userId: string;
		publicApi: boolean;
	};

	'user-retrieved-execution': {
		userId: string;
		publicApi: boolean;
	};

	'user-retrieved-all-executions': {
		userId: string;
		publicApi: boolean;
	};

	'user-retrieved-workflow': {
		userId: string;
		publicApi: boolean;
	};

	'user-retrieved-all-workflows': {
		userId: string;
		publicApi: boolean;
	};

	// #endregion

	// #region Click

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

	'user-transactional-email-sent': {
		userId: string;
		messageType:
			| 'Reset password'
			| 'New user invite'
			| 'Resend invite'
			| 'Workflow shared'
			| 'Credentials shared'
			| 'Project shared';
		publicApi: boolean;
	};

	// #endregion

	// #region Public API

	'public-api-key-created': {
		user: UserLike;
		publicApi: boolean;
	};

	'public-api-key-deleted': {
		user: UserLike;
		publicApi: boolean;
	};

	'public-api-invoked': {
		userId: string;
		path: string;
		method: string;
		apiVersion: string;
	};

	// #endregion

	// #region Email

	'email-failed': {
		user: UserLike;
		messageType:
			| 'Reset password'
			| 'New user invite'
			| 'Resend invite'
			| 'Workflow shared'
			| 'Credentials shared'
			| 'Project shared';
		publicApi: boolean;
	};

	// #endregion

	// #region Credentials

	'credentials-created': {
		user: UserLike;
		credentialType: string;
		credentialId: string;
		publicApi: boolean;
		projectId?: string;
		projectType?: string;
	};

	'credentials-shared': {
		user: UserLike;
		credentialType: string;
		credentialId: string;
		userIdSharer: string;
		userIdsShareesAdded: string[];
		shareesRemoved: number | null;
	};

	'credentials-updated': {
		user: UserLike;
		credentialType: string;
		credentialId: string;
	};

	'credentials-deleted': {
		user: UserLike;
		credentialType: string;
		credentialId: string;
	};

	// #endregion

	// #region Community package

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

	// #endregion

	// #region Execution

	'execution-throttled': {
		executionId: string;
		type: ConcurrencyQueueType;
	};

	'execution-started-during-bootup': {
		executionId: string;
	};

	// #endregion

	// #region Project

	'team-project-updated': {
		userId: string;
		role: GlobalRole;
		members: ProjectRelation[];
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

	// #endregion

	// #region Source control

	'source-control-settings-updated': {
		branchName: string;
		readOnlyInstance: boolean;
		repoType: 'github' | 'gitlab' | 'other';
		connected: boolean;
	};

	'source-control-user-started-pull-ui': {
		userId?: string;
		workflowUpdates: number;
		workflowConflicts: number;
		credConflicts: number;
	};

	'source-control-user-finished-pull-ui': {
		userId?: string;
		workflowUpdates: number;
	};

	'source-control-user-pulled-api': {
		workflowUpdates: number;
		forced: boolean;
	};

	'source-control-user-started-push-ui': {
		userId?: string;
		workflowsEligible: number;
		workflowsEligibleWithConflicts: number;
		credsEligible: number;
		credsEligibleWithConflicts: number;
		variablesEligible: number;
	};

	'source-control-user-finished-push-ui': {
		userId: string;
		workflowsEligible: number;
		workflowsPushed: number;
		credsPushed: number;
		variablesPushed: number;
	};

	// #endregion

	// #region License

	'license-renewal-attempted': {
		success: boolean;
	};

	'license-community-plus-registered': {
		userId: User['id'];
		email: string;
		licenseKey: string;
	};

	// #endregion

	// #region Variable

	'variable-created': {};

	// #endregion

	// #region External secrets

	'external-secrets-provider-settings-saved': {
		userId?: string;
		vaultType: string;
		isValid: boolean;
		isNew: boolean;
		errorMessage?: string;
	};

	// #endregion

	// #region LDAP

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

	// #endregion

	// #region runner

	'runner-task-requested': {
		taskId: string;
		nodeId: string;
		workflowId: string;
		executionId: string;
	};

	'runner-response-received': {
		taskId: string;
		nodeId: string;
		workflowId: string;
		executionId: string;
	};

	// #endregion

	// #region queue

	'job-enqueued': {
		executionId: string;
		workflowId: string;
		hostId: string;
		jobId: string;
	};

	'job-dequeued': {
		executionId: string;
		workflowId: string;
		hostId: string;
		jobId: string;
	};

	'job-stalled': {
		executionId: string;
		workflowId: string;
		hostId: string;
		jobId: string;
	};

	// #endregion
} & AiEventMap;
