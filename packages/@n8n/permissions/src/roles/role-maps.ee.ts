import {
	CREDENTIALS_SHARING_OWNER_SCOPES,
	CREDENTIALS_SHARING_USER_SCOPES,
} from './scopes/credential-sharing-scopes.ee';
import {
	GLOBAL_OWNER_SCOPES,
	GLOBAL_ADMIN_SCOPES,
	GLOBAL_MEMBER_SCOPES,
} from './scopes/global-scopes.ee';
import {
	REGULAR_PROJECT_ADMIN_SCOPES,
	PERSONAL_PROJECT_OWNER_SCOPES,
	PROJECT_EDITOR_SCOPES,
	PROJECT_VIEWER_SCOPES,
} from './scopes/project-scopes.ee';
import {
	WORKFLOW_SHARING_OWNER_SCOPES,
	WORKFLOW_SHARING_EDITOR_SCOPES,
} from './scopes/workflow-sharing-scopes.ee';
import type {
	CredentialSharingRole,
	GlobalRole,
	ProjectRole,
	Scope,
	WorkflowSharingRole,
} from '../types.ee';

export const GLOBAL_SCOPE_MAP: Record<GlobalRole, Scope[]> = {
	'global:owner': GLOBAL_OWNER_SCOPES,
	'global:admin': GLOBAL_ADMIN_SCOPES,
	'global:member': GLOBAL_MEMBER_SCOPES,
};

export const PROJECT_SCOPE_MAP: Record<ProjectRole, Scope[]> = {
	'project:admin': REGULAR_PROJECT_ADMIN_SCOPES,
	'project:personalOwner': PERSONAL_PROJECT_OWNER_SCOPES,
	'project:editor': PROJECT_EDITOR_SCOPES,
	'project:viewer': PROJECT_VIEWER_SCOPES,
};

export const CREDENTIALS_SHARING_SCOPE_MAP: Record<CredentialSharingRole, Scope[]> = {
	'credential:owner': CREDENTIALS_SHARING_OWNER_SCOPES,
	'credential:user': CREDENTIALS_SHARING_USER_SCOPES,
};

export const WORKFLOW_SHARING_SCOPE_MAP: Record<WorkflowSharingRole, Scope[]> = {
	'workflow:owner': WORKFLOW_SHARING_OWNER_SCOPES,
	'workflow:editor': WORKFLOW_SHARING_EDITOR_SCOPES,
};

export const ALL_ROLE_MAPS = {
	global: GLOBAL_SCOPE_MAP,
	project: PROJECT_SCOPE_MAP,
	credential: CREDENTIALS_SHARING_SCOPE_MAP,
	workflow: WORKFLOW_SHARING_SCOPE_MAP,
} as const;
