import type { GlobalRole, Scope } from '@n8n/permissions';
import type { FindOperator } from '@n8n/typeorm';
import type {
	ICredentialsEncrypted,
	IRunExecutionData,
	IWorkflowBase,
	WorkflowExecuteMode,
	ExecutionStatus,
	FeatureFlags,
	IUserSettings,
	AnnotationVote,
	ExecutionSummary,
	IUser,
} from 'n8n-workflow';

import type { CredentialsEntity } from './credentials-entity';
import type { Folder } from './folder';
import type { Project } from './project';
import type { SharedCredentials } from './shared-credentials';
import type { SharedWorkflow } from './shared-workflow';
import type { TagEntity } from './tag-entity';
import type { User } from './user';
import type { WorkflowEntity } from './workflow-entity';

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

/** Payload for creating an execution. */
export type CreateExecutionPayload = Omit<IExecutionDb, 'id' | 'createdAt' | 'startedAt'>;

// Data in regular format with references
export interface IExecutionDb extends IExecutionBase {
	data: IRunExecutionData;
	workflowData: IWorkflowBase;
}

export interface IExecutionFlattedDb extends IExecutionBase {
	id: string;
	data: string;
	workflowData: Omit<IWorkflowBase, 'pinData'>;
	customData: Record<string, string>;
}

export namespace ExecutionSummaries {
	export type Query = RangeQuery | CountQuery;

	export type RangeQuery = { kind: 'range' } & FilterFields &
		AccessFields &
		RangeFields &
		OrderFields;

	export type CountQuery = { kind: 'count' } & FilterFields & AccessFields;

	type FilterFields = Partial<{
		id: string;
		finished: boolean;
		mode: string;
		retryOf: string;
		retrySuccessId: string;
		status: ExecutionStatus[];
		workflowId: string;
		waitTill: boolean;
		metadata: Array<{ key: string; value: string }>;
		startedAfter: string;
		startedBefore: string;
		annotationTags: string[]; // tag IDs
		vote: AnnotationVote;
		projectId: string;
	}>;

	type AccessFields = {
		accessibleWorkflowIds?: string[];
	};

	type RangeFields = {
		range: {
			limit: number;
			firstId?: string;
			lastId?: string;
		};
	};

	type OrderFields = {
		order?: {
			top?: ExecutionStatus;
			startedAt?: 'DESC';
		};
	};

	export type ExecutionSummaryWithScopes = ExecutionSummary & { scopes: Scope[] };
}

export namespace ListQueryDb {
	/**
	 * Slim workflow returned from a list query operation.
	 */
	export namespace Workflow {
		type OptionalBaseFields = 'name' | 'active' | 'versionId' | 'createdAt' | 'updatedAt' | 'tags';

		type BaseFields = Pick<WorkflowEntity, 'id'> &
			Partial<Pick<WorkflowEntity, OptionalBaseFields>>;

		type SharedField = Partial<Pick<WorkflowEntity, 'shared'>>;

		type SortingField = 'createdAt' | 'updatedAt' | 'name';

		export type SortOrder = `${SortingField}:asc` | `${SortingField}:desc`;

		type OwnedByField = { ownedBy: SlimUser | null; homeProject: SlimProject | null };

		export type Plain = BaseFields;

		export type WithSharing = BaseFields & SharedField;

		export type WithOwnership = BaseFields & OwnedByField;

		type SharedWithField = { sharedWith: SlimUser[]; sharedWithProjects: SlimProject[] };

		export type WithOwnedByAndSharedWith = BaseFields &
			OwnedByField &
			SharedWithField &
			SharedField;

		export type WithScopes = BaseFields & ScopesField & SharedField;
	}

	export namespace Credentials {
		type OwnedByField = { homeProject: SlimProject | null };

		type SharedField = Partial<Pick<CredentialsEntity, 'shared'>>;

		type SharedWithField = { sharedWithProjects: SlimProject[] };

		export type WithSharing = CredentialsEntity & SharedField;

		export type WithOwnedByAndSharedWith = CredentialsEntity &
			OwnedByField &
			SharedWithField &
			SharedField;

		export type WithScopes = CredentialsEntity & ScopesField & SharedField;
	}
}

type SlimUser = Pick<IUser, 'id' | 'email' | 'firstName' | 'lastName'>;

export type ScopesField = { scopes: Scope[] };

export const enum StatisticsNames {
	productionSuccess = 'production_success',
	productionError = 'production_error',
	manualSuccess = 'manual_success',
	manualError = 'manual_error',
	dataLoaded = 'data_loaded',
}

export type AuthProviderType = 'ldap' | 'email' | 'saml'; // | 'google';

export type FolderWithWorkflowAndSubFolderCount = Folder & {
	workflowCount?: boolean;
	subFolderCount?: number;
};

export type FolderWithWorkflowAndSubFolderCountAndPath = FolderWithWorkflowAndSubFolderCount & {
	path?: string[];
};

export type TestRunFinalResult = 'success' | 'error' | 'warning';

export type TestRunErrorCode =
	| 'TEST_CASES_NOT_FOUND'
	| 'INTERRUPTED'
	| 'UNKNOWN_ERROR'
	| 'EVALUATION_TRIGGER_NOT_FOUND'
	| 'EVALUATION_TRIGGER_NOT_CONFIGURED'
	| 'SET_OUTPUTS_NODE_NOT_FOUND'
	| 'SET_OUTPUTS_NODE_NOT_CONFIGURED'
	| 'SET_METRICS_NODE_NOT_FOUND'
	| 'SET_METRICS_NODE_NOT_CONFIGURED'
	| 'CANT_FETCH_TEST_CASES';

export type TestCaseExecutionErrorCode =
	| 'NO_METRICS_COLLECTED'
	| 'MOCKED_NODE_NOT_FOUND' // This will be used when node mocking will be implemented
	| 'FAILED_TO_EXECUTE_WORKFLOW'
	| 'INVALID_METRICS'
	| 'UNKNOWN_ERROR';

export type AggregatedTestRunMetrics = Record<string, number | boolean>;

// Entity representing a node in a workflow under test, for which data should be mocked during test execution
export type MockedNodeItem = {
	name?: string;
	id: string;
};

export type RunningMode = 'dry' | 'live';

export type SyncStatus = 'success' | 'error';

/** @deprecated This is tech debt. Do not rely on request-level types in repositories. */
export namespace ListQuery {
	export type Options = {
		filter?: Record<string, unknown>;
		select?: Record<string, true>;
		skip?: number;
		take?: number;
		sortBy?: string;
	};
}

export type ProjectRole =
	| 'project:personalOwner'
	| 'project:admin'
	| 'project:editor'
	| 'project:viewer';

export interface IGetExecutionsQueryFilter {
	id?: FindOperator<string> | string;
	finished?: boolean;
	mode?: string;
	retryOf?: string;
	retrySuccessId?: string;
	status?: ExecutionStatus[];
	workflowId?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	waitTill?: FindOperator<any> | boolean;
	metadata?: Array<{ key: string; value: string }>;
	startedAfter?: string;
	startedBefore?: string;
}

export type ResourceType = 'folder' | 'workflow';

export type WorkflowFolderUnionFull = (
	| ListQueryDb.Workflow.Plain
	| ListQueryDb.Workflow.WithSharing
	| FolderWithWorkflowAndSubFolderCount
) & {
	resource: ResourceType;
};
