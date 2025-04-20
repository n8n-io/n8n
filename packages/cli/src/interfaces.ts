import type { AssignableRole, GlobalRole, Scope } from '@n8n/permissions';
import type { Application } from 'express';
import type {
	ExecutionError,
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialsEncrypted,
	IDataObject,
	IDeferredPromise,
	IExecuteResponsePromiseData,
	IRun,
	IRunExecutionData,
	ITelemetryTrackProperties,
	IWorkflowBase,
	CredentialLoadingDetails,
	WorkflowExecuteMode,
	ExecutionStatus,
	ExecutionSummary,
	FeatureFlags,
	INodeProperties,
	IUserSettings,
	IWorkflowExecutionDataProcess,
	DeduplicationMode,
	DeduplicationItemTypes,
} from 'n8n-workflow';
import type PCancelable from 'p-cancelable';

import type { ActiveWorkflowManager } from '@/active-workflow-manager';
import type { AnnotationTagEntity } from '@/databases/entities/annotation-tag-entity.ee';
import type { AuthProviderType } from '@/databases/entities/auth-identity';
import type { SharedCredentials } from '@/databases/entities/shared-credentials';
import type { TagEntity } from '@/databases/entities/tag-entity';
import type { User } from '@/databases/entities/user';

import type { LICENSE_FEATURES, LICENSE_QUOTAS } from './constants';
import type { Folder } from './databases/entities/folder';
import type { ExternalHooks } from './external-hooks';
import type { WorkflowWithSharingsAndCredentials } from './workflows/workflows.types';

export interface ICredentialsTypeData {
	[key: string]: CredentialLoadingDetails;
}

export interface ICredentialsOverwrite {
	[key: string]: ICredentialDataDecryptedObject;
}

// ----------------------------------
//               ProcessedData
// ----------------------------------

export interface IProcessedDataLatest {
	mode: DeduplicationMode;
	data: DeduplicationItemTypes;
}

export interface IProcessedDataEntries {
	mode: DeduplicationMode;
	data: DeduplicationItemTypes[];
}

// ----------------------------------
//               tags
// ----------------------------------

export interface ITagBase {
	id: string;
	name: string;
}

export interface ITagToImport extends ITagBase {
	createdAt?: string;
	updatedAt?: string;
}

export type UsageCount = {
	usageCount: number;
};

export type ITagDb = Pick<TagEntity, 'id' | 'name' | 'createdAt' | 'updatedAt'>;

export type ITagWithCountDb = ITagDb & UsageCount;

export type IAnnotationTagDb = Pick<AnnotationTagEntity, 'id' | 'name' | 'createdAt' | 'updatedAt'>;

export type IAnnotationTagWithCountDb = IAnnotationTagDb & UsageCount;

// ----------------------------------
//            workflows
// ----------------------------------

// Almost identical to editor-ui.Interfaces.ts
export interface IWorkflowDb extends IWorkflowBase {
	triggerCount: number;
	tags?: TagEntity[];
	parentFolder?: Folder | null;
}

export interface IWorkflowResponse extends IWorkflowBase {
	id: string;
}

export interface IWorkflowToImport
	extends Omit<IWorkflowBase, 'staticData' | 'pinData' | 'createdAt' | 'updatedAt'> {
	owner: {
		type: 'personal';
		personalEmail: string;
	};
	parentFolderId: string | null;
}

// ----------------------------------
//            credentials
// ----------------------------------

export interface ICredentialsBase {
	createdAt: Date;
	updatedAt: Date;
}

export interface ICredentialsDb extends ICredentialsBase, ICredentialsEncrypted {
	id: string;
	name: string;
	shared?: SharedCredentials[];
}

export type ICredentialsDecryptedDb = ICredentialsBase & ICredentialsDecrypted;

export type ICredentialsDecryptedResponse = ICredentialsDecryptedDb;

export type SaveExecutionDataType = 'all' | 'none';

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

// Data in regular format with references
export interface IExecutionDb extends IExecutionBase {
	data: IRunExecutionData;
	workflowData: IWorkflowBase;
}

/** Payload for creating an execution. */
export type CreateExecutionPayload = Omit<IExecutionDb, 'id' | 'createdAt' | 'startedAt'>;

/** Payload for updating an execution. */
export type UpdateExecutionPayload = Omit<IExecutionDb, 'id' | 'createdAt'>;

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

// Flatted data to save memory when saving in database or transferring
// via REST API
export interface IExecutionFlatted extends IExecutionBase {
	data: string;
	workflowData: IWorkflowBase;
}

export interface IExecutionFlattedDb extends IExecutionBase {
	id: string;
	data: string;
	workflowData: Omit<IWorkflowBase, 'pinData'>;
	customData: Record<string, string>;
}

export interface IExecutionFlattedResponse extends IExecutionFlatted {
	id: string;
	retryOf?: string;
}

export interface IExecutionsListResponse {
	count: number;
	results: ExecutionSummary[];
	estimated: boolean;
}

export interface ExecutionStopResult {
	finished?: boolean;
	mode: WorkflowExecuteMode;
	startedAt: Date;
	stoppedAt?: Date;
	status: ExecutionStatus;
}

export interface IExecutionsCurrentSummary {
	id: string;
	retryOf?: string;
	startedAt: Date;
	mode: WorkflowExecuteMode;
	workflowId: string;
	status: ExecutionStatus;
}

export interface IExecutingWorkflowData {
	executionData: IWorkflowExecutionDataProcess;
	startedAt: Date;
	/** This promise rejects when the execution is stopped. When the execution finishes (successfully or not), the promise resolves. */
	postExecutePromise: IDeferredPromise<IRun | undefined>;
	responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>;
	workflowExecution?: PCancelable<IRun>;
	status: ExecutionStatus;
}

export interface IPersonalizationSurveyAnswers {
	email: string | null;
	codingSkill: string | null;
	companyIndustry: string[];
	companySize: string | null;
	otherCompanyIndustry: string | null;
	otherWorkArea: string | null;
	workArea: string[] | string | null;
}

export interface IActiveDirectorySettings {
	enabled: boolean;
}

export interface IPackageVersions {
	cli: string;
}

export interface IWorkflowErrorData {
	[key: string]: any;
	execution?: {
		id?: string;
		url?: string;
		retryOf?: string;
		error: ExecutionError;
		lastNodeExecuted: string;
		mode: WorkflowExecuteMode;
	};
	trigger?: {
		error: ExecutionError;
		mode: WorkflowExecuteMode;
	};
	workflow: {
		id?: string;
		name: string;
	};
}

export interface IWorkflowStatisticsDataLoaded {
	dataLoaded: boolean;
}

// ----------------------------------
//          community nodes
// ----------------------------------

export namespace CommunityPackages {
	export type ParsedPackageName = {
		packageName: string;
		rawString: string;
		scope?: string;
		version?: string;
	};

	export type AvailableUpdates = {
		[packageName: string]: {
			current: string;
			wanted: string;
			latest: string;
			location: string;
		};
	};

	export type PackageStatusCheck = {
		status: 'OK' | 'Banned';
		reason?: string;
	};
}

// ----------------------------------
//               telemetry
// ----------------------------------

export interface IExecutionTrackProperties extends ITelemetryTrackProperties {
	workflow_id: string;
	success: boolean;
	error_node_type?: string;
	is_manual: boolean;
}

// ----------------------------------
//               license
// ----------------------------------

type ValuesOf<T> = T[keyof T];

export type BooleanLicenseFeature = ValuesOf<typeof LICENSE_FEATURES>;
export type NumericLicenseFeature = ValuesOf<typeof LICENSE_QUOTAS>;

export interface ILicenseReadResponse {
	usage: {
		activeWorkflowTriggers: {
			limit: number;
			value: number;
			warningThreshold: number;
		};
	};
	license: {
		planId: string;
		planName: string;
	};
}

export interface ILicensePostResponse extends ILicenseReadResponse {
	managementToken: string;
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
	settings?: IUserSettings | null;
	inviteAcceptUrl?: string;
	isOwner?: boolean;
	featureFlags?: FeatureFlags;
}

export interface Invitation {
	email: string;
	role: AssignableRole;
}

export interface N8nApp {
	app: Application;
	restEndpoint: string;
	externalHooks: ExternalHooks;
	activeWorkflowManager: ActiveWorkflowManager;
}

export type UserSettings = Pick<User, 'id' | 'settings'>;

export interface SecretsProviderSettings<T = IDataObject> {
	connected: boolean;
	connectedAt: Date | null;
	settings: T;
}

export interface ExternalSecretsSettings {
	[key: string]: SecretsProviderSettings;
}

export type SecretsProviderState = 'initializing' | 'connected' | 'error';

export abstract class SecretsProvider {
	displayName: string;

	name: string;

	properties: INodeProperties[];

	state: SecretsProviderState;

	abstract init(settings: SecretsProviderSettings): Promise<void>;
	abstract connect(): Promise<void>;
	abstract disconnect(): Promise<void>;
	abstract update(): Promise<void>;
	abstract test(): Promise<[boolean] | [boolean, string]>;
	abstract getSecret(name: string): unknown;
	abstract hasSecret(name: string): boolean;
	abstract getSecretNames(): string[];
}
