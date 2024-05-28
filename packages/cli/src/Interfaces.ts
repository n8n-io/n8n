import type { Application, Request, Response } from 'express';
import type {
	ExecutionError,
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialsEncrypted,
	IDataObject,
	IDeferredPromise,
	IExecuteResponsePromiseData,
	IPinData,
	IRun,
	IRunData,
	IRunExecutionData,
	ITaskData,
	ITelemetryTrackProperties,
	IWorkflowBase,
	CredentialLoadingDetails,
	Workflow,
	WorkflowExecuteMode,
	ExecutionStatus,
	ExecutionSummary,
	FeatureFlags,
	INodeProperties,
	IUserSettings,
	IHttpRequestMethods,
	StartNodeData,
} from 'n8n-workflow';

import type { ActiveWorkflowManager } from '@/ActiveWorkflowManager';

import type { WorkflowExecute } from 'n8n-core';

import type PCancelable from 'p-cancelable';

import type { AuthProviderType } from '@db/entities/AuthIdentity';
import type { SharedCredentials } from '@db/entities/SharedCredentials';
import type { TagEntity } from '@db/entities/TagEntity';
import type { GlobalRole, User } from '@db/entities/User';
import type { CredentialsRepository } from '@db/repositories/credentials.repository';
import type { SettingsRepository } from '@db/repositories/settings.repository';
import type { UserRepository } from '@db/repositories/user.repository';
import type { WorkflowRepository } from '@db/repositories/workflow.repository';
import type { ExternalHooks } from './ExternalHooks';
import type { LICENSE_FEATURES, LICENSE_QUOTAS } from './constants';
import type { WorkflowWithSharingsAndCredentials } from './workflows/workflows.types';
import type { WorkerJobStatusSummary } from './services/orchestration/worker/types';
import type { Scope } from '@n8n/permissions';

export interface ICredentialsTypeData {
	[key: string]: CredentialLoadingDetails;
}

export interface ICredentialsOverwrite {
	[key: string]: ICredentialDataDecryptedObject;
}

// ----------------------------------
//               tags
// ----------------------------------

export interface ITagToImport {
	id: string;
	name: string;
	createdAt?: string;
	updatedAt?: string;
}

export type UsageCount = {
	usageCount: number;
};

export type ITagWithCountDb = Pick<TagEntity, 'id' | 'name' | 'createdAt' | 'updatedAt'> &
	UsageCount;

// ----------------------------------
//            workflows
// ----------------------------------

// Almost identical to editor-ui.Interfaces.ts
export interface IWorkflowDb extends IWorkflowBase {
	tags?: TagEntity[];
}

export interface IWorkflowToImport extends IWorkflowBase {
	tags: ITagToImport[];
}

export interface IWorkflowResponse extends IWorkflowBase {
	id: string;
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
	startedAt: Date;
	stoppedAt?: Date; // empty value means execution is still running
	workflowId: string;
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

/**
 * Payload for creating or updating an execution.
 */
export type ExecutionPayload = Omit<IExecutionDb, 'id'>;

export interface IExecutionPushResponse {
	executionId?: string;
	waitingForWebhook?: boolean;
}

export interface IExecutionResponse extends IExecutionBase {
	id: string;
	data: IRunExecutionData;
	retryOf?: string;
	retrySuccessId?: string;
	workflowData: IWorkflowBase | WorkflowWithSharingsAndCredentials;
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
	status?: ExecutionStatus;
}

export interface IExecutingWorkflowData {
	executionData: IWorkflowExecutionDataProcess;
	startedAt: Date;
	postExecutePromises: Array<IDeferredPromise<IRun | undefined>>;
	responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>;
	workflowExecution?: PCancelable<IRun>;
	status: ExecutionStatus;
}

export interface IExternalHooks {
	credentials?: {
		create?: Array<{
			(this: IExternalHooksFunctions, credentialsData: ICredentialsEncrypted): Promise<void>;
		}>;
		delete?: Array<{ (this: IExternalHooksFunctions, credentialId: string): Promise<void> }>;
		update?: Array<{
			(this: IExternalHooksFunctions, credentialsData: ICredentialsDb): Promise<void>;
		}>;
	};
	workflow?: {
		activate?: Array<{ (this: IExternalHooksFunctions, workflowData: IWorkflowDb): Promise<void> }>;
		create?: Array<{ (this: IExternalHooksFunctions, workflowData: IWorkflowBase): Promise<void> }>;
		delete?: Array<{ (this: IExternalHooksFunctions, workflowId: string): Promise<void> }>;
		execute?: Array<{
			(
				this: IExternalHooksFunctions,
				workflowData: IWorkflowDb,
				mode: WorkflowExecuteMode,
			): Promise<void>;
		}>;
		update?: Array<{ (this: IExternalHooksFunctions, workflowData: IWorkflowDb): Promise<void> }>;
	};
}

export interface IExternalHooksFileData {
	[key: string]: {
		[key: string]: Array<(...args: any[]) => Promise<void>>;
	};
}

export interface IExternalHooksFunctions {
	dbCollections: {
		/* eslint-disable @typescript-eslint/naming-convention */
		User: UserRepository;
		Settings: SettingsRepository;
		Credentials: CredentialsRepository;
		Workflow: WorkflowRepository;
		/* eslint-enable @typescript-eslint/naming-convention */
	};
}

export type WebhookCORSRequest = Request & { method: 'OPTIONS' };

export type WebhookRequest = Request<{ path: string }> & {
	method: IHttpRequestMethods;
	params: Record<string, string>;
};

export type WaitingWebhookRequest = WebhookRequest & {
	params: WebhookRequest['path'] & { suffix?: string };
};

export interface WebhookAccessControlOptions {
	allowedOrigins?: string;
}

export interface IWebhookManager {
	/** Gets all request methods associated with a webhook path*/
	getWebhookMethods?: (path: string) => Promise<IHttpRequestMethods[]>;

	/** Find the CORS options matching a path and method */
	findAccessControlOptions?: (
		path: string,
		httpMethod: IHttpRequestMethods,
	) => Promise<WebhookAccessControlOptions | undefined>;

	executeWebhook(req: WebhookRequest, res: Response): Promise<IResponseCallbackData>;
}

export interface ITelemetryUserDeletionData {
	user_id: string;
	target_user_old_status: 'active' | 'invited';
	migration_strategy?: 'transfer_data' | 'delete_data';
	target_user_id?: string;
	migration_user_id?: string;
}

export interface IVersionNotificationSettings {
	enabled: boolean;
	endpoint: string;
	infoUrl: string;
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

export type IPushDataType = IPushData['type'];

export type IPushData =
	| PushDataExecutionFinished
	| PushDataExecutionStarted
	| PushDataExecuteAfter
	| PushDataExecuteBefore
	| PushDataConsoleMessage
	| PushDataReloadNodeType
	| PushDataRemoveNodeType
	| PushDataTestWebhook
	| PushDataNodeDescriptionUpdated
	| PushDataExecutionRecovered
	| PushDataActiveWorkflowUsersChanged
	| PushDataWorkerStatusMessage
	| PushDataWorkflowActivated
	| PushDataWorkflowDeactivated
	| PushDataWorkflowFailedToActivate;

type PushDataWorkflowFailedToActivate = {
	data: IWorkflowFailedToActivate;
	type: 'workflowFailedToActivate';
};

type PushDataWorkflowActivated = {
	data: IActiveWorkflowChanged;
	type: 'workflowActivated';
};

type PushDataWorkflowDeactivated = {
	data: IActiveWorkflowChanged;
	type: 'workflowDeactivated';
};

type PushDataActiveWorkflowUsersChanged = {
	data: IActiveWorkflowUsersChanged;
	type: 'activeWorkflowUsersChanged';
};

export type PushDataExecutionRecovered = {
	data: IPushDataExecutionRecovered;
	type: 'executionRecovered';
};

export type PushDataExecutionFinished = {
	data: IPushDataExecutionFinished;
	type: 'executionFinished';
};

export type PushDataExecutionStarted = {
	data: IPushDataExecutionStarted;
	type: 'executionStarted';
};

export type PushDataExecuteAfter = {
	data: IPushDataNodeExecuteAfter;
	type: 'nodeExecuteAfter';
};

export type PushDataExecuteBefore = {
	data: IPushDataNodeExecuteBefore;
	type: 'nodeExecuteBefore';
};

export type PushDataConsoleMessage = {
	data: IPushDataConsoleMessage;
	type: 'sendConsoleMessage';
};

type PushDataWorkerStatusMessage = {
	data: IPushDataWorkerStatusMessage;
	type: 'sendWorkerStatusMessage';
};

type PushDataReloadNodeType = {
	data: IPushDataReloadNodeType;
	type: 'reloadNodeType';
};

export type PushDataRemoveNodeType = {
	data: IPushDataRemoveNodeType;
	type: 'removeNodeType';
};

export type PushDataTestWebhook = {
	data: IPushDataTestWebhook;
	type: 'testWebhookDeleted' | 'testWebhookReceived';
};

export type PushDataNodeDescriptionUpdated = {
	data: undefined;
	type: 'nodeDescriptionUpdated';
};

export interface IActiveWorkflowUser {
	user: User;
	lastSeen: Date;
}

export interface IActiveWorkflowAdded {
	workflowId: Workflow['id'];
}

export interface IActiveWorkflowUsersChanged {
	workflowId: Workflow['id'];
	activeUsers: IActiveWorkflowUser[];
}

interface IActiveWorkflowChanged {
	workflowId: Workflow['id'];
}

interface IWorkflowFailedToActivate {
	workflowId: Workflow['id'];
	errorMessage: string;
}

export interface IPushDataExecutionRecovered {
	executionId: string;
}

export interface IPushDataExecutionFinished {
	data: IRun;
	executionId: string;
	retryOf?: string;
}

export interface IPushDataExecutionStarted {
	executionId: string;
	mode: WorkflowExecuteMode;
	startedAt: Date;
	retryOf?: string;
	workflowId: string;
	workflowName?: string;
}

export interface IPushDataNodeExecuteAfter {
	data: ITaskData;
	executionId: string;
	nodeName: string;
}

export interface IPushDataNodeExecuteBefore {
	executionId: string;
	nodeName: string;
}

export interface IPushDataReloadNodeType {
	name: string;
	version: number;
}

export interface IPushDataRemoveNodeType {
	name: string;
	version: number;
}

export interface IPushDataTestWebhook {
	executionId: string;
	workflowId: string;
}

export interface IPushDataConsoleMessage {
	source: string;
	message: string;
}

export interface IPushDataWorkerStatusMessage {
	workerId: string;
	status: IPushDataWorkerStatusPayload;
}

export interface IPushDataWorkerStatusPayload {
	workerId: string;
	runningJobsSummary: WorkerJobStatusSummary[];
	freeMem: number;
	totalMem: number;
	uptime: number;
	loadAvg: number[];
	cpus: string;
	arch: string;
	platform: NodeJS.Platform;
	hostname: string;
	interfaces: Array<{
		family: 'IPv4' | 'IPv6';
		address: string;
		internal: boolean;
	}>;
	version: string;
}

export interface IResponseCallbackData {
	data?: IDataObject | IDataObject[];
	headers?: object;
	noWebhookResponse?: boolean;
	responseCode?: number;
}

export interface INodesTypeData {
	[key: string]: {
		className: string;
		sourcePath: string;
	};
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

export interface IWorkflowExecutionDataProcess {
	destinationNode?: string;
	restartExecutionId?: string;
	executionMode: WorkflowExecuteMode;
	executionData?: IRunExecutionData;
	runData?: IRunData;
	pinData?: IPinData;
	retryOf?: string;
	pushRef?: string;
	startNodes?: StartNodeData[];
	workflowData: IWorkflowBase;
	userId?: string;
	projectId?: string;
}

export interface IWorkflowExecuteProcess {
	startedAt: Date;
	workflow: Workflow;
	workflowExecute: WorkflowExecute;
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
		executions: {
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
	hasRecoveryCodesLeft: boolean;
	role?: GlobalRole;
	globalScopes?: Scope[];
	signInType: AuthProviderType;
	disabled: boolean;
	settings?: IUserSettings | null;
	inviteAcceptUrl?: string;
	isOwner?: boolean;
	featureFlags?: FeatureFlags;
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

export type N8nInstanceType = 'main' | 'webhook' | 'worker';
