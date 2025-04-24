import type { IExecutionBase, ITagBase, IExecutionDb } from '@n8n/api-types';
import type { ExecutionStatus } from '@n8n/constants';
import type {
	IPersonalizationSurveyAnswers,
	AnnotationTagEntity,
	AuthProviderType,
	TagEntity,
	ICredentialsBase,
} from '@n8n/db';
import type { AssignableRole, GlobalRole, Scope } from '@n8n/permissions';
import type { Application } from 'express';
import type {
	ExecutionError,
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	IDeferredPromise,
	IExecuteResponsePromiseData,
	IRun,
	ITelemetryTrackProperties,
	IWorkflowBase,
	CredentialLoadingDetails,
	WorkflowExecuteMode,
	ExecutionSummary,
	FeatureFlags,
	IUserSettings,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import type PCancelable from 'p-cancelable';

import type { ActiveWorkflowManager } from '@/active-workflow-manager';

import type { ExternalHooks } from './external-hooks';

export interface ICredentialsTypeData {
	[key: string]: CredentialLoadingDetails;
}

export interface ICredentialsOverwrite {
	[key: string]: ICredentialDataDecryptedObject;
}

// ----------------------------------
//               tags
// ----------------------------------

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

export type ICredentialsDecryptedDb = ICredentialsBase & ICredentialsDecrypted;

export type ICredentialsDecryptedResponse = ICredentialsDecryptedDb;

export type SaveExecutionDataType = 'all' | 'none';

/** Payload for updating an execution. */
export type UpdateExecutionPayload = Omit<IExecutionDb, 'id' | 'createdAt'>;

// Flatted data to save memory when saving in database or transferring
// via REST API
export interface IExecutionFlatted extends IExecutionBase {
	data: string;
	workflowData: IWorkflowBase;
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
