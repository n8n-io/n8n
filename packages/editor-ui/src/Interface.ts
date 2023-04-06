import { CREDENTIAL_EDIT_MODAL_KEY } from './constants';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { IMenuItem } from 'n8n-design-system';
import {
	GenericValue,
	IConnections,
	ICredentialsDecrypted,
	ICredentialsEncrypted,
	ICredentialType,
	IDataObject,
	INode,
	INodeIssues,
	INodeParameters,
	INodeTypeDescription,
	IPinData,
	IRunExecutionData,
	IRun,
	IRunData,
	ITaskData,
	ITelemetrySettings,
	IWorkflowSettings as IWorkflowSettingsWorkflow,
	WorkflowExecuteMode,
	PublicInstalledPackage,
	INodeTypeNameVersion,
	ILoadOptions,
	INodeCredentials,
	INodeListSearchItems,
	NodeParameterValueType,
	INodeActionTypeDescription,
	IDisplayOptions,
	IExecutionsSummary,
	IAbstractEventMessage,
	FeatureFlags,
	ExecutionStatus,
	ITelemetryTrackProperties,
} from 'n8n-workflow';
import { SignInType } from './constants';
import { FAKE_DOOR_FEATURES, TRIGGER_NODE_FILTER, REGULAR_NODE_FILTER } from './constants';
import { BulkCommand, Undoable } from '@/models/history';
import { PartialBy } from '@/utils/typeHelpers';

export * from 'n8n-design-system/types';

declare global {
	interface Window {
		posthog?: {
			init(
				key: string,
				options?: {
					api_host?: string;
					autocapture?: boolean;
					disable_session_recording?: boolean;
					debug?: boolean;
					bootstrap?: {
						distinctId?: string;
						isIdentifiedID?: boolean;
						featureFlags: FeatureFlags;
					};
				},
			): void;
			isFeatureEnabled?(flagName: string): boolean;
			getFeatureFlag?(flagName: string): boolean | string;
			identify?(
				id: string,
				userProperties?: Record<string, string | number>,
				userPropertiesOnce?: Record<string, string>,
			): void;
			reset?(resetDeviceId?: boolean): void;
			onFeatureFlags?(callback: (keys: string[], map: FeatureFlags) => void): void;
			reloadFeatureFlags?(): void;
		};
		analytics?: {
			track(event: string, proeprties?: ITelemetryTrackProperties): void;
		};
		featureFlags?: {
			getAll: () => FeatureFlags;
			getVariant: (name: string) => string | boolean | undefined;
			override: (name: string, value: string) => void;
		};
	}
}

export type EndpointStyle = {
	width?: number;
	height?: number;
	fill?: string;
	stroke?: string;
	outlineStroke?: string;
	lineWidth?: number;
	hover?: boolean;
	showOutputLabel?: boolean;
	size?: string;
	hoverMessage?: string;
};

export interface IUpdateInformation {
	name: string;
	key?: string;
	value:
		| string
		| number
		| { [key: string]: string | number | boolean }
		| NodeParameterValueType
		| INodeParameters; // with null makes problems in NodeSettings.vue
	node?: string;
	oldValue?: string | number;
}

export interface INodeUpdatePropertiesInformation {
	name: string; // Node-Name
	properties: {
		position: XYPosition;
		[key: string]: IDataObject | XYPosition;
	};
}

export type XYPosition = [number, number];

export interface INodeUi extends INode {
	position: XYPosition;
	color?: string;
	notes?: string;
	issues?: INodeIssues;
	name: string;
	pinData?: IDataObject;
}

export interface INodeTypesMaxCount {
	[key: string]: {
		exist: number;
		max: number;
		nodeNames: string[];
	};
}

export interface IExternalHooks {
	run(eventName: string, metadata?: IDataObject): Promise<void>;
}

/**
 * @deprecated Do not add methods to this interface.
 */
export interface IRestApi {
	getActiveWorkflows(): Promise<string[]>;
	getActivationError(id: string): Promise<IActivationError | undefined>;
	getCurrentExecutions(filter: ExecutionsQueryFilter): Promise<IExecutionsCurrentSummaryExtended[]>;
	getPastExecutions(
		filter: ExecutionsQueryFilter,
		limit: number,
		lastId?: string,
		firstId?: string,
	): Promise<IExecutionsListResponse>;
	stopCurrentExecution(executionId: string): Promise<IExecutionsStopData>;
	makeRestApiRequest(method: string, endpoint: string, data?: any): Promise<any>;
	getCredentialTranslation(credentialType: string): Promise<object>;
	removeTestWebhook(workflowId: string): Promise<boolean>;
	runWorkflow(runData: IStartRunData): Promise<IExecutionPushResponse>;
	createNewWorkflow(sendData: IWorkflowDataUpdate): Promise<IWorkflowDb>;
	updateWorkflow(id: string, data: IWorkflowDataUpdate, forceSave?: boolean): Promise<IWorkflowDb>;
	deleteWorkflow(name: string): Promise<void>;
	getWorkflow(id: string): Promise<IWorkflowDb>;
	getWorkflows(filter?: object): Promise<IWorkflowShortResponse[]>;
	getWorkflowFromUrl(url: string): Promise<IWorkflowDb>;
	getExecution(id: string): Promise<IExecutionResponse | undefined>;
	deleteExecutions(sendData: IExecutionDeleteFilter): Promise<void>;
	retryExecution(id: string, loadWorkflow?: boolean): Promise<boolean>;
	getTimezones(): Promise<IDataObject>;
	getBinaryUrl(
		dataPath: string,
		mode: 'view' | 'download',
		fileName?: string,
		mimeType?: string,
	): string;
	getExecutionEvents(id: string): Promise<IAbstractEventMessage[]>;
}

export interface INodeTranslationHeaders {
	data: {
		[key: string]: {
			displayName: string;
			description: string;
		};
	};
}

export interface IStartRunData {
	workflowData: IWorkflowData;
	startNodes?: string[];
	destinationNode?: string;
	runData?: IRunData;
	pinData?: IPinData;
}

export interface ITableData {
	columns: string[];
	data: GenericValue[][];
	hasJson: { [key: string]: boolean };
}

export interface IVariableItemSelected {
	variable: string;
}

export interface IVariableSelectorOption {
	name: string;
	key?: string;
	value?: string;
	options?: IVariableSelectorOption[] | null;
	allowParentSelect?: boolean;
	dataType?: string;
}

// Simple version of n8n-workflow.Workflow
export interface IWorkflowData {
	id?: string;
	name?: string;
	active?: boolean;
	nodes: INode[];
	connections: IConnections;
	settings?: IWorkflowSettings;
	tags?: string[];
	pinData?: IPinData;
	versionId?: string;
}

export interface IWorkflowDataUpdate {
	id?: string;
	name?: string;
	nodes?: INode[];
	connections?: IConnections;
	settings?: IWorkflowSettings;
	active?: boolean;
	tags?: ITag[] | string[]; // string[] when store or requested, ITag[] from API response
	pinData?: IPinData;
	versionId?: string;
}

export interface IWorkflowToShare extends IWorkflowDataUpdate {
	meta?: {
		instanceId: string;
	};
}

export interface IWorkflowTemplate {
	id: number;
	name: string;
	workflow: {
		nodes: INodeUi[];
		connections: IConnections;
	};
}

export interface INewWorkflowData {
	name: string;
	onboardingFlowEnabled: boolean;
}

// Almost identical to cli.Interfaces.ts
export interface IWorkflowDb {
	id: string;
	name: string;
	active: boolean;
	createdAt: number | string;
	updatedAt: number | string;
	nodes: INodeUi[];
	connections: IConnections;
	settings?: IWorkflowSettings;
	tags?: ITag[] | string[]; // string[] when store or requested, ITag[] from API response
	pinData?: IPinData;
	sharedWith?: Array<Partial<IUser>>;
	ownedBy?: Partial<IUser>;
	versionId: string;
	usedCredentials?: IUsedCredential[];
}

// Identical to cli.Interfaces.ts
export interface IWorkflowShortResponse {
	id: string;
	name: string;
	active: boolean;
	createdAt: number | string;
	updatedAt: number | string;
	tags: ITag[];
}

export interface IWorkflowsShareResponse {
	id: string;
	createdAt: number | string;
	updatedAt: number | string;
	sharedWith?: Array<Partial<IUser>>;
	ownedBy?: Partial<IUser>;
}

// Identical or almost identical to cli.Interfaces.ts

export interface IActivationError {
	time: number;
	error: {
		message: string;
	};
}

export interface IShareCredentialsPayload {
	shareWithIds: string[];
}

export interface IShareWorkflowsPayload {
	shareWithIds: string[];
}

export interface ICredentialsResponse extends ICredentialsEncrypted {
	id: string;
	createdAt: number | string;
	updatedAt: number | string;
	sharedWith?: Array<Partial<IUser>>;
	ownedBy?: Partial<IUser>;
	currentUserHasAccess?: boolean;
}

export interface ICredentialsBase {
	createdAt: number | string;
	updatedAt: number | string;
}

export interface ICredentialsDecryptedResponse extends ICredentialsBase, ICredentialsDecrypted {
	id: string;
}

export interface IExecutionBase {
	id?: string;
	finished: boolean;
	mode: WorkflowExecuteMode;
	retryOf?: string;
	retrySuccessId?: string;
	startedAt: Date;
	stoppedAt?: Date;
	workflowId?: string; // To be able to filter executions easily //
}

export interface IExecutionFlatted extends IExecutionBase {
	data: string;
	workflowData: IWorkflowDb;
}

export interface IExecutionFlattedResponse extends IExecutionFlatted {
	id: string;
}

export interface IExecutionPushResponse {
	executionId?: string;
	waitingForWebhook?: boolean;
}

export interface IExecutionResponse extends IExecutionBase {
	id: string;
	data?: IRunExecutionData;
	workflowData: IWorkflowDb;
	executedNode?: string;
}

export interface IExecutionShortResponse {
	id: string;
	workflowData: {
		id: string;
		name: string;
	};
	mode: WorkflowExecuteMode;
	finished: boolean;
	startedAt: Date;
	stoppedAt: Date;
	executionTime?: number;
}

export interface IExecutionsListResponse {
	count: number;
	results: IExecutionsSummary[];
	estimated: boolean;
}

export interface IExecutionsCurrentSummaryExtended {
	id: string;
	finished?: boolean;
	mode: WorkflowExecuteMode;
	retryOf?: string;
	retrySuccessId?: string;
	startedAt: Date;
	stoppedAt?: Date;
	workflowId: string;
	workflowName?: string;
}

export interface IExecutionsStopData {
	finished?: boolean;
	mode: WorkflowExecuteMode;
	startedAt: Date;
	stoppedAt: Date;
	status: ExecutionStatus;
}

export interface IExecutionDeleteFilter {
	deleteBefore?: Date;
	filters?: ExecutionsQueryFilter;
	ids?: string[];
}

export type IPushData =
	| PushDataExecutionFinished
	| PushDataExecutionStarted
	| PushDataExecuteAfter
	| PushDataExecuteBefore
	| PushDataConsoleMessage
	| PushDataReloadNodeType
	| PushDataRemoveNodeType
	| PushDataTestWebhook
	| PushDataExecutionRecovered;

type PushDataExecutionRecovered = {
	data: IPushDataExecutionRecovered;
	type: 'executionRecovered';
};

type PushDataExecutionFinished = {
	data: IPushDataExecutionFinished;
	type: 'executionFinished';
};

type PushDataExecutionStarted = {
	data: IPushDataExecutionStarted;
	type: 'executionStarted';
};

type PushDataExecuteAfter = {
	data: IPushDataNodeExecuteAfter;
	type: 'nodeExecuteAfter';
};

type PushDataExecuteBefore = {
	data: IPushDataNodeExecuteBefore;
	type: 'nodeExecuteBefore';
};

type PushDataConsoleMessage = {
	data: IPushDataConsoleMessage;
	type: 'sendConsoleMessage';
};

type PushDataReloadNodeType = {
	data: IPushDataReloadNodeType;
	type: 'reloadNodeType';
};

type PushDataRemoveNodeType = {
	data: IPushDataRemoveNodeType;
	type: 'removeNodeType';
};

type PushDataTestWebhook = {
	data: IPushDataTestWebhook;
	type: 'testWebhookDeleted' | 'testWebhookReceived';
};

export interface IPushDataExecutionStarted {
	executionId: string;
	mode: WorkflowExecuteMode;
	startedAt: Date;
	retryOf?: string;
	workflowId: string;
	workflowName?: string;
}
export interface IPushDataExecutionRecovered {
	executionId: string;
}

export interface IPushDataExecutionFinished {
	data: IRun;
	executionId: string;
	retryOf?: string;
}

export interface IPushDataUnsavedExecutionFinished {
	executionId: string;
	data: { finished: true; stoppedAt: Date };
}

export interface IPushDataExecutionStarted {
	executionId: string;
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
	messages: string[];
}

export type IPersonalizationSurveyAnswersV1 = {
	codingSkill?: string | null;
	companyIndustry?: string[] | null;
	companySize?: string | null;
	otherCompanyIndustry?: string | null;
	otherWorkArea?: string | null;
	workArea?: string[] | string | null;
};

export type IPersonalizationSurveyAnswersV2 = {
	version: 'v2';
	automationGoal?: string | null;
	codingSkill?: string | null;
	companyIndustryExtended?: string[] | null;
	companySize?: string | null;
	companyType?: string | null;
	customerType?: string | null;
	mspFocus?: string[] | null;
	mspFocusOther?: string | null;
	otherAutomationGoal?: string | null;
	otherCompanyIndustryExtended?: string[] | null;
};

export type IPersonalizationSurveyAnswersV3 = {
	version: 'v3';
	automationGoal?: string | null;
	otherAutomationGoal?: string | null;
	companyIndustryExtended?: string[] | null;
	otherCompanyIndustryExtended?: string[] | null;
	companySize?: string | null;
	companyType?: string | null;
	automationGoalSm?: string[] | null;
	automationGoalSmOther?: string | null;
	usageModes?: string[] | null;
	email?: string | null;
};

export type IPersonalizationSurveyAnswersV4 = {
	version: 'v4';
	automationGoalDevops?: string[] | null;
	automationGoalDevopsOther?: string | null;
	companyIndustryExtended?: string[] | null;
	otherCompanyIndustryExtended?: string[] | null;
	companySize?: string | null;
	companyType?: string | null;
	automationGoalSm?: string[] | null;
	automationGoalSmOther?: string | null;
	usageModes?: string[] | null;
	email?: string | null;
	role?: string | null;
	roleOther?: string | null;
	reportedSource?: string | null;
	reportedSourceOther?: string | null;
};

export type IPersonalizationLatestVersion = IPersonalizationSurveyAnswersV4;

export type IPersonalizationSurveyVersions =
	| IPersonalizationSurveyAnswersV1
	| IPersonalizationSurveyAnswersV2
	| IPersonalizationSurveyAnswersV3;

export type IRole = 'default' | 'owner' | 'member';

export interface IUserResponse {
	id: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	createdAt?: string;
	globalRole?: {
		name: IRole;
		id: string;
		createdAt: Date;
	};
	personalizationAnswers?: IPersonalizationSurveyVersions | null;
	isPending: boolean;
	signInType?: SignInType;
}

export interface CurrentUserResponse extends IUserResponse {
	featureFlags?: FeatureFlags;
}

export interface IUser extends IUserResponse {
	isDefaultUser: boolean;
	isPendingUser: boolean;
	isOwner: boolean;
	inviteAcceptUrl?: string;
	fullName?: string;
}

export interface IVersionNotificationSettings {
	enabled: boolean;
	endpoint: string;
	infoUrl: string;
}

export interface IN8nPrompts {
	message: string;
	title: string;
	showContactPrompt: boolean;
	showValueSurvey: boolean;
}

export interface IN8nValueSurveyData {
	[key: string]: string;
}

export interface IN8nPromptResponse {
	updated: boolean;
}

export enum UserManagementAuthenticationMethod {
	Email = 'email',
	Ldap = 'ldap',
	Saml = 'saml',
}

export interface IUserManagementConfig {
	enabled: boolean;
	showSetupOnFirstLoad?: boolean;
	smtpSetup: boolean;
	authenticationMethod: UserManagementAuthenticationMethod;
}

export interface IPermissionGroup {
	loginStatus?: ILogInStatus[];
	role?: IRole[];
}

export interface IPermissionAllowGroup extends IPermissionGroup {
	shouldAllow?: () => boolean;
}

export interface IPermissionDenyGroup extends IPermissionGroup {
	shouldDeny?: () => boolean;
}

export interface IPermissions {
	allow?: IPermissionAllowGroup;
	deny?: IPermissionDenyGroup;
}

export interface IUserPermissions {
	[category: string]: {
		[permission: string]: IPermissions;
	};
}

export interface ITemplatesCollection {
	id: number;
	name: string;
	nodes: ITemplatesNode[];
	workflows: Array<{ id: number }>;
}

interface ITemplatesImage {
	id: number;
	url: string;
}

interface ITemplatesCollectionExtended extends ITemplatesCollection {
	description: string | null;
	image: ITemplatesImage[];
	categories: ITemplatesCategory[];
	createdAt: string;
}

export interface ITemplatesCollectionFull extends ITemplatesCollectionExtended {
	full: true;
}

export interface ITemplatesCollectionResponse extends ITemplatesCollectionExtended {
	workflows: ITemplatesWorkflow[];
}

export interface ITemplatesWorkflow {
	id: number;
	createdAt: string;
	name: string;
	nodes: ITemplatesNode[];
	totalViews: number;
	user: {
		username: string;
	};
}

export interface ITemplatesWorkflowResponse extends ITemplatesWorkflow, IWorkflowTemplate {
	description: string | null;
	image: ITemplatesImage[];
	categories: ITemplatesCategory[];
}

export interface ITemplatesWorkflowFull extends ITemplatesWorkflowResponse {
	full: true;
}

export interface ITemplatesQuery {
	categories: number[];
	search: string;
}

export interface ITemplatesCategory {
	id: number;
	name: string;
}

export type WorkflowCallerPolicyDefaultOption = 'any' | 'none' | 'workflowsFromAList';

export interface IN8nUISettings {
	endpointWebhook: string;
	endpointWebhookTest: string;
	saveDataErrorExecution: string;
	saveDataSuccessExecution: string;
	saveManualExecutions: boolean;
	workflowCallerPolicyDefaultOption: WorkflowCallerPolicyDefaultOption;
	timezone: string;
	executionTimeout: number;
	maxExecutionTimeout: number;
	oauthCallbackUrls: {
		oauth1: string;
		oauth2: string;
	};
	urlBaseEditor: string;
	urlBaseWebhook: string;
	versionCli: string;
	n8nMetadata?: {
		[key: string]: string | number | undefined;
	};
	versionNotifications: IVersionNotificationSettings;
	instanceId: string;
	personalizationSurveyEnabled: boolean;
	telemetry: ITelemetrySettings;
	userManagement: IUserManagementConfig;
	defaultLocale: string;
	workflowTagsDisabled: boolean;
	logLevel: ILogLevel;
	hiringBannerEnabled: boolean;
	templates: {
		enabled: boolean;
		host: string;
	};
	posthog: {
		enabled: boolean;
		apiHost: string;
		apiKey: string;
		autocapture: boolean;
		disableSessionRecording: boolean;
		debug: boolean;
	};
	executionMode: string;
	pushBackend: 'sse' | 'websocket';
	communityNodesEnabled: boolean;
	isNpmAvailable: boolean;
	publicApi: {
		enabled: boolean;
		latestVersion: number;
		path: string;
		swaggerUi: {
			enabled: boolean;
		};
	};
	sso: {
		saml: {
			loginLabel: string;
			loginEnabled: boolean;
		};
		ldap: {
			loginLabel: string;
			loginEnabled: boolean;
		};
	};
	onboardingCallPromptEnabled: boolean;
	allowedModules: {
		builtIn?: string[];
		external?: string[];
	};
	enterprise: Record<string, boolean>;
	deployment?: {
		type: string | 'default' | 'n8n-internal' | 'cloud' | 'desktop_mac' | 'desktop_win';
	};
	hideUsagePage: boolean;
	license: {
		environment: 'development' | 'production';
	};
}

export interface IWorkflowSettings extends IWorkflowSettingsWorkflow {
	errorWorkflow?: string;
	saveDataErrorExecution?: string;
	saveDataSuccessExecution?: string;
	saveManualExecutions?: boolean;
	timezone?: string;
	executionTimeout?: number;
	callerIds?: string;
	callerPolicy?: WorkflowCallerPolicyDefaultOption;
}

export interface ITimeoutHMS {
	hours: number;
	minutes: number;
	seconds: number;
}

export type WorkflowTitleStatus = 'EXECUTING' | 'IDLE' | 'ERROR';

export interface ISubcategoryItemProps {
	subcategory: string;
	description: string;
	key?: string;
	iconType: string;
	icon?: string;
	defaults?: INodeParameters;
}
export interface ViewItemProps {
	withTopBorder: boolean;
	title: string;
	description: string;
	icon: string;
}

export interface INodeItemProps {
	subcategory: string;
	nodeType: INodeTypeDescription;
}

export interface IActionItemProps {
	subcategory: string;
	nodeType: INodeActionTypeDescription;
}

export interface ICategoryItemProps {
	expanded: boolean;
	category: string;
	name: string;
}

export interface CreateElementBase {
	key: string;
	includedByTrigger?: boolean;
	includedByRegular?: boolean;
}

export interface NodeCreateElement extends CreateElementBase {
	type: 'node';
	category?: string[];
	properties: INodeItemProps;
}

export interface CategoryCreateElement extends CreateElementBase {
	type: 'category';
	properties: ICategoryItemProps;
}

export interface SubcategoryCreateElement extends CreateElementBase {
	type: 'subcategory';
	properties: ISubcategoryItemProps;
}
export interface ViewCreateElement extends CreateElementBase {
	type: 'view';
	properties: ViewItemProps;
}

export interface ActionCreateElement extends CreateElementBase {
	type: 'action';
	category: string;
	properties: IActionItemProps;
}

export type INodeCreateElement =
	| NodeCreateElement
	| CategoryCreateElement
	| SubcategoryCreateElement
	| ViewCreateElement
	| ActionCreateElement;

export interface ICategoriesWithNodes {
	[category: string]: {
		[subcategory: string]: {
			regularCount: number;
			triggerCount: number;
			nodes: INodeCreateElement[];
		};
	};
}

export interface ITag {
	id: string;
	name: string;
	usageCount?: number;
	createdAt?: string;
	updatedAt?: string;
}

export interface ITagRow {
	tag?: ITag;
	usage?: string;
	create?: boolean;
	disable?: boolean;
	update?: boolean;
	delete?: boolean;
	canDelete?: boolean;
}

export interface IVersion {
	name: string;
	nodes: IVersionNode[];
	createdAt: string;
	description: string;
	documentationUrl: string;
	hasBreakingChange: boolean;
	hasSecurityFix: boolean;
	hasSecurityIssue: boolean;
	securityIssueFixVersion: string;
}

export interface IVersionNode {
	name: string;
	displayName: string;
	icon: string;
	iconUrl?: string;
	defaults: INodeParameters;
	iconData: {
		type: string;
		icon?: string;
		fileBuffer?: string;
	};
	typeVersion?: number;
}

export interface ITemplatesNode extends IVersionNode {
	categories?: ITemplatesCategory[];
}

export interface INodeMetadata {
	parametersLastUpdatedAt?: number;
	pristine: boolean;
}

export interface IUsedCredential {
	id: string;
	name: string;
	credentialType: string;
	currentUserHasAccess: boolean;
	ownedBy: Partial<IUser>;
	sharedWith: Array<Partial<IUser>>;
}

export interface WorkflowsState {
	activeExecutions: IExecutionsCurrentSummaryExtended[];
	activeWorkflows: string[];
	activeWorkflowExecution: IExecutionsSummary | null;
	currentWorkflowExecutions: IExecutionsSummary[];
	activeExecutionId: string | null;
	executingNode: string | null;
	executionWaitingForWebhook: boolean;
	finishedExecutionsCount: number;
	nodeMetadata: NodeMetadataMap;
	subWorkflowExecutionError: Error | null;
	usedCredentials: Record<string, IUsedCredential>;
	workflow: IWorkflowDb;
	workflowExecutionData: IExecutionResponse | null;
	workflowExecutionPairedItemMappings: { [itemId: string]: Set<string> };
	workflowsById: IWorkflowsMap;
}

export interface RootState {
	baseUrl: string;
	restEndpoint: string;
	defaultLocale: string;
	endpointWebhook: string;
	endpointWebhookTest: string;
	pushConnectionActive: boolean;
	timezone: string;
	executionTimeout: number;
	maxExecutionTimeout: number;
	versionCli: string;
	oauthCallbackUrls: object;
	n8nMetadata: {
		[key: string]: string | number | undefined;
	};
	sessionId: string;
	urlBaseWebhook: string;
	urlBaseEditor: string;
	instanceId: string;
	isNpmAvailable: boolean;
}

export interface NodeMetadataMap {
	[nodeName: string]: INodeMetadata;
}
export interface IRootState {
	activeExecutions: IExecutionsCurrentSummaryExtended[];
	activeWorkflows: string[];
	activeActions: string[];
	activeCredentialType: string | null;
	baseUrl: string;
	defaultLocale: string;
	endpointWebhook: string;
	endpointWebhookTest: string;
	executionId: string | null;
	executingNode: string | null;
	executionWaitingForWebhook: boolean;
	pushConnectionActive: boolean;
	saveDataErrorExecution: string;
	saveDataSuccessExecution: string;
	saveManualExecutions: boolean;
	timezone: string;
	stateIsDirty: boolean;
	executionTimeout: number;
	maxExecutionTimeout: number;
	versionCli: string;
	oauthCallbackUrls: object;
	n8nMetadata: object;
	workflowExecutionData: IExecutionResponse | null;
	workflowExecutionPairedItemMappings: { [itemId: string]: Set<string> };
	lastSelectedNode: string | null;
	lastSelectedNodeOutputIndex: number | null;
	nodeViewOffsetPosition: XYPosition;
	nodeViewMoveInProgress: boolean;
	selectedNodes: INodeUi[];
	sessionId: string;
	urlBaseEditor: string;
	urlBaseWebhook: string;
	workflow: IWorkflowDb;
	workflowsById: IWorkflowsMap;
	sidebarMenuItems: IMenuItem[];
	instanceId: string;
	nodeMetadata: NodeMetadataMap;
	isNpmAvailable: boolean;
	subworkflowExecutionError: Error | null;
}

export interface CommunityPackageMap {
	[name: string]: PublicInstalledPackage;
}

export interface ICredentialTypeMap {
	[name: string]: ICredentialType;
}

export interface ICredentialMap {
	[name: string]: ICredentialsResponse;
}

export interface ICredentialsState {
	credentialTypes: ICredentialTypeMap;
	credentials: ICredentialMap;
}

export interface ITagsState {
	tags: { [id: string]: ITag };
	loading: boolean;
	fetchedAll: boolean;
	fetchedUsageCount: boolean;
}

export type Modals =
	| {
			[key: string]: ModalState;
	  }
	| {
			[CREDENTIAL_EDIT_MODAL_KEY]: NewCredentialsModal;
	  };

export type ModalState = {
	open: boolean;
	mode?: string | null;
	data?: Record<string, unknown>;
	activeId?: string | null;
	curlCommand?: string;
	httpNodeParameters?: string;
};

export type NewCredentialsModal = ModalState & {
	showAuthSelector?: boolean;
};

export type IRunDataDisplayMode = 'table' | 'json' | 'binary' | 'schema' | 'html';
export type NodePanelType = 'input' | 'output';

export interface TargetItem {
	nodeName: string;
	itemIndex: number;
	runIndex: number;
	outputIndex: number;
}

export interface NDVState {
	activeNodeName: string | null;
	mainPanelDimensions: { [key: string]: { [key: string]: number } };
	sessionId: string;
	input: {
		displayMode: IRunDataDisplayMode;
		nodeName?: string;
		run?: number;
		branch?: number;
		data: {
			isEmpty: boolean;
		};
	};
	output: {
		branch?: number;
		displayMode: IRunDataDisplayMode;
		data: {
			isEmpty: boolean;
		};
		editMode: {
			enabled: boolean;
			value: string;
		};
	};
	focusedMappableInput: string;
	mappingTelemetry: { [key: string]: string | number | boolean };
	hoveringItem: null | TargetItem;
	draggable: {
		isDragging: boolean;
		type: string;
		data: string;
		canDrop: boolean;
		stickyPosition: null | XYPosition;
	};
	isMappingOnboarded: boolean;
}

export interface UIState {
	activeActions: string[];
	activeCredentialType: string | null;
	sidebarMenuCollapsed: boolean;
	modalStack: string[];
	modals: Modals;
	isPageLoading: boolean;
	currentView: string;
	mainPanelPosition: number;
	fakeDoorFeatures: IFakeDoor[];
	draggable: {
		isDragging: boolean;
		type: string;
		data: string;
		canDrop: boolean;
		stickyPosition: null | XYPosition;
	};
	stateIsDirty: boolean;
	lastSelectedNode: string | null;
	lastSelectedNodeOutputIndex: number | null;
	nodeViewOffsetPosition: XYPosition;
	nodeViewMoveInProgress: boolean;
	selectedNodes: INodeUi[];
	sidebarMenuItems: IMenuItem[];
	nodeViewInitialized: boolean;
	addFirstStepOnLoad: boolean;
	executionSidebarAutoRefresh: boolean;
}

export type ILogLevel = 'info' | 'debug' | 'warn' | 'error' | 'verbose';

export type IFakeDoor = {
	id: FAKE_DOOR_FEATURES;
	featureName: string;
	icon?: string;
	infoText?: string;
	actionBoxTitle: string;
	actionBoxDescription: string;
	actionBoxButtonLabel?: string;
	linkURL: string;
	uiLocations: IFakeDoorLocation[];
};

export type IFakeDoorLocation =
	| 'settings'
	| 'settings/users'
	| 'credentialsModal'
	| 'workflowShareModal';

export type INodeFilterType = typeof REGULAR_NODE_FILTER | typeof TRIGGER_NODE_FILTER;

export type NodeCreatorOpenSource =
	| ''
	| 'no_trigger_execution_tooltip'
	| 'plus_endpoint'
	| 'trigger_placeholder_button'
	| 'tab'
	| 'node_connection_action'
	| 'node_connection_drop'
	| 'add_node_button';

export interface INodeCreatorState {
	itemsFilter: string;
	showScrim: boolean;
	rootViewHistory: INodeFilterType[];
	selectedView: INodeFilterType;
	openSource: NodeCreatorOpenSource;
}

export interface ISettingsState {
	settings: IN8nUISettings;
	promptsData: IN8nPrompts;
	userManagement: IUserManagementConfig;
	templatesEndpointHealthy: boolean;
	api: {
		enabled: boolean;
		latestVersion: number;
		path: string;
		swaggerUi: {
			enabled: boolean;
		};
	};
	ldap: {
		loginLabel: string;
		loginEnabled: boolean;
	};
	saml: {
		loginLabel: string;
		loginEnabled: boolean;
	};
	onboardingCallPromptEnabled: boolean;
	saveDataErrorExecution: string;
	saveDataSuccessExecution: string;
	saveManualExecutions: boolean;
}

export interface INodeTypesState {
	nodeTypes: {
		[nodeType: string]: {
			[version: number]: INodeTypeDescription;
		};
	};
}

export interface ITemplateState {
	categories: { [id: string]: ITemplatesCategory };
	collections: { [id: string]: ITemplatesCollection };
	workflows: { [id: string]: ITemplatesWorkflow };
	workflowSearches: {
		[search: string]: {
			workflowIds: string[];
			totalWorkflows: number;
			loadingMore?: boolean;
		};
	};
	collectionSearches: {
		[search: string]: {
			collectionIds: string[];
		};
	};
	currentSessionId: string;
	previousSessionId: string;
}

export interface IVersionsState {
	versionNotificationSettings: IVersionNotificationSettings;
	nextVersions: IVersion[];
	currentVersion: IVersion | undefined;
}

export interface IUsersState {
	currentUserId: null | string;
	users: { [userId: string]: IUser };
}

export interface IWorkflowsState {
	currentWorkflowExecutions: IExecutionsSummary[];
	activeWorkflowExecution: IExecutionsSummary | null;
	finishedExecutionsCount: number;
}
export interface IWorkflowsMap {
	[name: string]: IWorkflowDb;
}

export interface CommunityNodesState {
	availablePackageCount: number;
	installedPackages: CommunityPackageMap;
}

export interface IRestApiContext {
	baseUrl: string;
	sessionId: string;
}

export interface IZoomConfig {
	scale: number;
	offset: XYPosition;
}

export interface IBounds {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

export type ILogInStatus = 'LoggedIn' | 'LoggedOut';

export interface IInviteResponse {
	user: {
		id: string;
		email: string;
		emailSent: boolean;
		inviteAcceptUrl: string;
	};
	error?: string;
}

export interface IOnboardingCallPromptResponse {
	nextPrompt: IOnboardingCallPrompt;
}

export interface IOnboardingCallPrompt {
	title: string;
	description: string;
	toast_sequence_number: number;
}

export interface ITab {
	value: string | number;
	label?: string;
	href?: string;
	icon?: string;
	align?: 'right';
	tooltip?: string;
}

export interface ITabBarItem {
	value: string;
	label: string;
	disabled?: boolean;
}

export interface IResourceLocatorReqParams {
	nodeTypeAndVersion: INodeTypeNameVersion;
	path: string;
	methodName?: string;
	searchList?: ILoadOptions;
	currentNodeParameters: INodeParameters;
	credentials?: INodeCredentials;
	filter?: string;
	paginationToken?: unknown;
}

export interface IResourceLocatorResultExpanded extends INodeListSearchItems {
	linkAlt?: string;
}

export interface CurlToJSONResponse {
	'parameters.url': string;
	'parameters.authentication': string;
	'parameters.method': string;
	'parameters.sendHeaders': boolean;
	'parameters.headerParameters.parameters.0.name': string;
	'parameters.headerParameters.parameters.0.value': string;
	'parameters.sendQuery': boolean;
	'parameters.sendBody': boolean;
}

export interface HistoryState {
	redoStack: Undoable[];
	undoStack: Undoable[];
	currentBulkAction: BulkCommand | null;
	bulkInProgress: boolean;
}
export type Basic = string | number | boolean;
export type Primitives = Basic | bigint | symbol;

export type Optional<T> = T | undefined | null;

export type SchemaType =
	| 'string'
	| 'number'
	| 'boolean'
	| 'bigint'
	| 'symbol'
	| 'array'
	| 'object'
	| 'function'
	| 'null'
	| 'undefined';

export interface ILdapSyncData {
	id: number;
	startedAt: string;
	endedAt: string;
	created: number;
	updated: number;
	disabled: number;
	scanned: number;
	status: string;
	error: string;
	runMode: string;
}

export interface ILdapSyncTable {
	status: string;
	endedAt: string;
	runTime: string;
	runMode: string;
	details: string;
}

export interface ILdapConfig {
	loginEnabled: boolean;
	loginLabel: string;
	connectionUrl: string;
	allowUnauthorizedCerts: boolean;
	connectionSecurity: string;
	connectionPort: number;
	baseDn: string;
	bindingAdminDn: string;
	bindingAdminPassword: string;
	firstNameAttribute: string;
	lastNameAttribute: string;
	emailAttribute: string;
	loginIdAttribute: string;
	ldapIdAttribute: string;
	userFilter: string;
	synchronizationEnabled: boolean;
	synchronizationInterval: number; // minutes
	searchPageSize: number;
	searchTimeout: number;
}

export type Schema = { type: SchemaType; key?: string; value: string | Schema[]; path: string };

export type UsageState = {
	loading: boolean;
	data: {
		usage: {
			executions: {
				limit: number; // -1 for unlimited, from license
				value: number;
				warningThreshold: number; // hardcoded value in BE
			};
		};
		license: {
			planId: string; // community
			planName: string; // defaults to Community
		};
		managementToken?: string;
	};
};

export type NodeAuthenticationOption = {
	name: string;
	value: string;
	displayOptions?: IDisplayOptions;
};

export type ExecutionFilterMetadata = {
	key: string;
	value: string;
};

export type ExecutionFilterType = {
	status: string;
	workflowId: string;
	startDate: string | Date;
	endDate: string | Date;
	tags: string[];
	metadata: ExecutionFilterMetadata[];
};

export type ExecutionsQueryFilter = {
	status?: ExecutionStatus[];
	workflowId?: string;
	finished?: boolean;
	waitTill?: boolean;
	metadata?: Array<{ key: string; value: string }>;
	startedAfter?: string;
	startedBefore?: string;
};

export type SamlAttributeMapping = {
	email: string;
	firstName: string;
	lastName: string;
	userPrincipalName: string;
};

export type SamlLoginBinding = 'post' | 'redirect';

export type SamlSignatureConfig = {
	prefix: 'ds';
	location: {
		reference: '/samlp:Response/saml:Issuer';
		action: 'after';
	};
};

export type SamlPreferencesLoginEnabled = {
	loginEnabled: boolean;
};

export type SamlPreferences = {
	mapping?: SamlAttributeMapping;
	metadata?: string;
	metadataUrl?: string;
	ignoreSSL?: boolean;
	loginBinding?: SamlLoginBinding;
	acsBinding?: SamlLoginBinding;
	authnRequestsSigned?: boolean;
	loginLabel?: string;
	wantAssertionsSigned?: boolean;
	wantMessageSigned?: boolean;
	signatureConfig?: SamlSignatureConfig;
} & PartialBy<SamlPreferencesLoginEnabled, 'loginEnabled'>;

export type SamlPreferencesExtractedData = {
	entityID: string;
	returnUrl: string;
};
