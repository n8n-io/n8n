import type { GlobalRole, Scope } from '@n8n/permissions';
import type {
	ICredentialsEncrypted,
	IRunExecutionData,
	IWorkflowBase,
	WorkflowExecuteMode,
	ExecutionStatus,
	FeatureFlags,
	IUserSettings,
} from 'n8n-workflow';

import type { AnnotationTagEntity } from '@/databases/entities/annotation-tag-entity.ee';
import type { AuthProviderType } from '@/databases/entities/auth-identity';
import type { Folder } from '@/databases/entities/folder';
import type { Project } from '@/databases/entities/project';
import type { SharedCredentials } from '@/databases/entities/shared-credentials';
import type { SharedWorkflow } from '@/databases/entities/shared-workflow';
import type { TagEntity } from '@/databases/entities/tag-entity';
import type { User } from '@/databases/entities/user';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';

export type UsageCount = {
	usageCount: number;
};

export interface ITagBase {
	id: string;
	name: string;
}

export interface ICredentialsBase {
	createdAt: Date;
	updatedAt: Date;
}

export interface IExecutionBase {
	id: string;
	mode: WorkflowExecuteMode;
	createdAt: Date; // set by DB
	startedAt: Date;
	stoppedAt?: Date; // empty value means execution is still running
	workflowId: string;

	/**
	 * @deprecated Use `status` instead
	 */
	finished: boolean;
	retryOf?: string; // If it is a retry, the id of the execution it is a retry of.
	retrySuccessId?: string; // If it failed and a retry did succeed. The id of the successful retry.
	status: ExecutionStatus;
	waitTill?: Date | null;
}

// Required by PublicUser
export interface IPersonalizationSurveyAnswers {
	email: string | null;
	codingSkill: string | null;
	companyIndustry: string[];
	companySize: string | null;
	otherCompanyIndustry: string | null;
	otherWorkArea: string | null;
	workArea: string[] | string | null;
}

export type ITagDb = Pick<TagEntity, 'id' | 'name' | 'createdAt' | 'updatedAt'>;

export type ITagWithCountDb = ITagDb & UsageCount;

export type IAnnotationTagDb = Pick<AnnotationTagEntity, 'id' | 'name' | 'createdAt' | 'updatedAt'>;

export type IAnnotationTagWithCountDb = IAnnotationTagDb & UsageCount;

// Almost identical to editor-ui.Interfaces.ts
export interface IWorkflowDb extends IWorkflowBase {
	triggerCount: number;
	tags?: TagEntity[];
	parentFolder?: Folder | null;
}

export interface ICredentialsDb extends ICredentialsBase, ICredentialsEncrypted {
	id: string;
	name: string;
	shared?: SharedCredentials[];
}

export interface IExecutionResponse extends IExecutionBase {
	id: string;
	data: IRunExecutionData;
	retryOf?: string;
	retrySuccessId?: string;
	workflowData: IWorkflowBase | WorkflowWithSharingsAndCredentials;
	customData: Record<string, string>;
	annotation: {
		tags: ITagBase[];
	};
}

export interface PublicUser {
	id: string;
	email?: string;
	firstName?: string;
	lastName?: string;
	personalizationAnswers?: IPersonalizationSurveyAnswers | null;
	password?: string;
	passwordResetToken?: string;
	createdAt: Date;
	isPending: boolean;
	role?: GlobalRole;
	globalScopes?: Scope[];
	signInType: AuthProviderType;
	disabled: boolean;
	settings?: IUserSettings | null; // External type from n8n-workflow
	inviteAcceptUrl?: string;
	isOwner?: boolean;
	featureFlags?: FeatureFlags; // External type from n8n-workflow
}

export type UserSettings = Pick<User, 'id' | 'settings'>;

export type SlimProject = Pick<Project, 'id' | 'type' | 'name' | 'icon'>;

export interface CredentialUsedByWorkflow {
	id: string;
	name: string;
	type?: string;
	currentUserHasAccess: boolean;
	homeProject: SlimProject | null;
	sharedWithProjects: SlimProject[];
}

export interface WorkflowWithSharingsAndCredentials extends Omit<WorkflowEntity, 'shared'> {
	homeProject?: SlimProject;
	sharedWithProjects?: SlimProject[];
	usedCredentials?: CredentialUsedByWorkflow[];
	shared?: SharedWorkflow[];
}

export interface WorkflowWithSharingsMetaDataAndCredentials extends Omit<WorkflowEntity, 'shared'> {
	homeProject?: SlimProject | null;
	sharedWithProjects: SlimProject[];
	usedCredentials?: CredentialUsedByWorkflow[];
}
