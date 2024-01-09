import type {
	AI_NODE_CREATOR_VIEW,
	CREDENTIAL_EDIT_MODAL_KEY,
	SignInType,
	FAKE_DOOR_FEATURES,
	TRIGGER_NODE_CREATOR_VIEW,
	REGULAR_NODE_CREATOR_VIEW,
	AI_OTHERS_NODE_CREATOR_VIEW,
	VIEWS,
} from './constants';
import type { IMenuItem } from 'n8n-design-system';
import {
	type GenericValue,
	type IConnections,
	type ICredentialsDecrypted,
	type ICredentialsEncrypted,
	type ICredentialType,
	type IDataObject,
	type INode,
	type INodeIssues,
	type INodeParameters,
	type INodeTypeDescription,
	type IPinData,
	type IRunExecutionData,
	type IRun,
	type IRunData,
	type ITaskData,
	type IWorkflowSettings as IWorkflowSettingsWorkflow,
	type WorkflowExecuteMode,
	type PublicInstalledPackage,
	type INodeTypeNameVersion,
	type ILoadOptions,
	type INodeCredentials,
	type INodeListSearchItems,
	type NodeParameterValueType,
	type IDisplayOptions,
	type IExecutionsSummary,
	type FeatureFlags,
	type ExecutionStatus,
	type ITelemetryTrackProperties,
	type IUserManagementSettings,
	type WorkflowSettings,
	type IUserSettings,
	type IN8nUISettings,
	type BannerName,
	type INodeExecutionData,
	type INodeProperties,
	type NodeConnectionType,
	type INodeCredentialsDetails,
} from 'n8n-workflow';
import type { BulkCommand, Undoable } from '@/models/history';
import type { PartialBy, TupleToUnion } from '@/utils/typeHelpers';
import type { Component } from 'vue';
import type { Scope } from '@n8n/permissions';

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
					session_recording?: {
						maskAllInputs?: boolean;
						maskInputFn?: ((text: string, element?: HTMLElement) => string) | null;
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
			capture?(event: string, properties: IDataObject): void;
			register?(metadata: IDataObject): void;
			people?: {
				set?(metadata: IDataObject): void;
			};
			debug?(): void;
		};
		analytics?: {
			identify(userId: string): void;
			track(event: string, properties?: ITelemetryTrackProperties): void;
			page(category: string, name: string, properties?: ITelemetryTrackProperties): void;
		};
		featureFlags?: {
			getAll: () => FeatureFlags;
			getVariant: (name: string) => string | boolean | undefined;
			override: (name: string, value: string) => void;
		};
		// eslint-disable-next-line @typescript-eslint/naming-convention
		Cypress: unknown;
		Appcues?: {
			track(event: string, properties?: ITelemetryTrackProperties): void;
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

export interface INodeTranslationHeaders {
	data: {
		[key: string]: {
			displayName: string;
			description: string;
		};
	};
}

export interface IAiDataContent {
	data: INodeExecutionData[] | null;
	inOut: 'input' | 'output';
	type: NodeConnectionType;
	metadata: {
		executionTime: number;
		startTime: number;
	};
}

export interface IAiData {
	data: IAiDataContent[];
	node: string;
	runIndex: number;
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
	meta?: WorkflowMetadata;
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
	meta?: WorkflowMetadata;
}

export interface IWorkflowToShare extends IWorkflowDataUpdate {
	meta?: WorkflowMetadata;
}

export interface IWorkflowTemplateNode
	extends Pick<INodeUi, 'name' | 'type' | 'position' | 'parameters' | 'typeVersion' | 'webhookId'> {
	// The credentials in a template workflow have a different type than in a regular workflow
	credentials?: IWorkflowTemplateNodeCredentials;
}

export interface IWorkflowTemplateNodeCredentials {
	[key: string]: string | INodeCredentialsDetails;
}

export interface IWorkflowTemplate {
	id: number;
	name: string;
	workflow: Pick<IWorkflowData, 'connections' | 'settings' | 'pinData'> & {
		nodes: IWorkflowTemplateNode[];
	};
}

export interface INewWorkflowData {
	name: string;
	onboardingFlowEnabled: boolean;
}

export interface WorkflowMetadata {
	onboardingId?: string;
	templateId?: string;
	instanceId?: string;
	templateCredsSetupCompleted?: boolean;
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
	meta?: WorkflowMetadata;
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
	status: string;
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

export type PushDataUsersForWorkflow = {
	workflowId: string;
	activeUsers: Array<{ user: IUser; lastSeen: string }>;
};

type PushDataWorkflowUsersChanged = {
	data: PushDataUsersForWorkflow;
	type: 'activeWorkflowUsersChanged';
};

export type IPushData =
	| PushDataExecutionFinished
	| PushDataExecutionStarted
	| PushDataExecuteAfter
	| PushDataExecuteBefore
	| PushDataConsoleMessage
	| PushDataReloadNodeType
	| PushDataRemoveNodeType
	| PushDataTestWebhook
	| PushDataExecutionRecovered
	| PushDataWorkerStatusMessage
	| PushDataActiveWorkflowAdded
	| PushDataActiveWorkflowRemoved
	| PushDataWorkflowFailedToActivate
	| PushDataWorkflowUsersChanged;

type PushDataActiveWorkflowAdded = {
	data: IActiveWorkflowAdded;
	type: 'workflowActivated';
};

type PushDataActiveWorkflowRemoved = {
	data: IActiveWorkflowRemoved;
	type: 'workflowDeactivated';
};

type PushDataWorkflowFailedToActivate = {
	data: IWorkflowFailedToActivate;
	type: 'workflowFailedToActivate';
};

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

type PushDataWorkerStatusMessage = {
	data: IPushDataWorkerStatusMessage;
	type: 'sendWorkerStatusMessage';
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

export interface IActiveWorkflowAdded {
	workflowId: string;
}

export interface IActiveWorkflowRemoved {
	workflowId: string;
}

export interface IWorkflowFailedToActivate {
	workflowId: string;
	errorMessage: string;
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

export interface WorkerJobStatusSummary {
	jobId: string;
	executionId: string;
	retryOf?: string;
	startedAt: Date;
	mode: WorkflowExecuteMode;
	workflowName: string;
	workflowId: string;
	status: ExecutionStatus;
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

export interface IPushDataWorkerStatusMessage {
	workerId: string;
	status: IPushDataWorkerStatusPayload;
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

export type IRole = 'default' | 'owner' | 'member' | 'admin';

export type InvitableRoleName = 'member' | 'admin';

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
	globalScopes?: Scope[];
	personalizationAnswers?: IPersonalizationSurveyVersions | null;
	isPending: boolean;
	signInType?: SignInType;
	settings?: IUserSettings;
}

export interface CurrentUserResponse extends IUserResponse {
	featureFlags?: FeatureFlags;
}

export interface IUser extends IUserResponse {
	isDefaultUser: boolean;
	isPendingUser: boolean;
	hasRecoveryCodesLeft: boolean;
	isOwner: boolean;
	inviteAcceptUrl?: string;
	fullName?: string;
	createdAt?: string;
	mfaEnabled: boolean;
	globalRoleId?: number;
}

export interface IVersionNotificationSettings {
	enabled: boolean;
	endpoint: string;
	infoUrl: string;
}

export interface IUserListAction {
	label: string;
	value: string;
	guard?: (user: IUser) => boolean;
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

export const enum UserManagementAuthenticationMethod {
	Email = 'email',
	Ldap = 'ldap',
	Saml = 'saml',
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

/**
 * A template without the actual workflow definition
 */
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

export interface ITemplatesWorkflowInfo {
	nodeCount: number;
	nodeTypes: {
		[key: string]: {
			count: number;
		};
	};
}

export interface ITemplatesWorkflowResponse extends ITemplatesWorkflow, IWorkflowTemplate {
	description: string | null;
	image: ITemplatesImage[];
	categories: ITemplatesCategory[];
	workflowInfo: ITemplatesWorkflowInfo;
}

/**
 * A template with also the full workflow definition
 */
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

export interface IWorkflowSettings extends IWorkflowSettingsWorkflow {
	errorWorkflow?: string;
	saveManualExecutions?: boolean;
	timezone?: string;
	executionTimeout?: number;
	maxExecutionTimeout?: number;
	callerIds?: string;
	callerPolicy?: WorkflowSettings.CallerPolicy;
	executionOrder: NonNullable<IWorkflowSettingsWorkflow['executionOrder']>;
}

export interface ITimeoutHMS {
	hours: number;
	minutes: number;
	seconds: number;
}

export type WorkflowTitleStatus = 'EXECUTING' | 'IDLE' | 'ERROR' | 'DEBUG';

export type ExtractActionKeys<T> = T extends SimplifiedNodeType ? T['name'] : never;

export type ActionsRecord<T extends SimplifiedNodeType[]> = {
	[K in ExtractActionKeys<T[number]>]: ActionTypeDescription[];
};

export type SimplifiedNodeType = Pick<
	INodeTypeDescription,
	| 'displayName'
	| 'description'
	| 'name'
	| 'group'
	| 'icon'
	| 'iconUrl'
	| 'badgeIconUrl'
	| 'codex'
	| 'defaults'
	| 'outputs'
>;
export interface SubcategoryItemProps {
	description?: string;
	iconType?: string;
	icon?: string;
	iconProps?: {
		color?: string;
	};
	panelClass?: string;
	title?: string;
	subcategory?: string;
	defaults?: INodeParameters;
	forceIncludeNodes?: string[];
	sections?: string[];
}
export interface ViewItemProps {
	title: string;
	description: string;
	icon: string;
	tag?: string;
}
export interface LabelItemProps {
	key: string;
}
export interface ActionTypeDescription extends SimplifiedNodeType {
	displayOptions?: IDisplayOptions;
	values?: IDataObject;
	actionKey: string;
	codex: {
		label: string;
		categories: string[];
	};
}

export interface CategoryItemProps {
	name: string;
	count: number;
}

export interface CreateElementBase {
	uuid?: string;
	key: string;
}

export interface NodeCreateElement extends CreateElementBase {
	type: 'node';
	subcategory: string;
	properties: SimplifiedNodeType;
}

export interface CategoryCreateElement extends CreateElementBase {
	type: 'category';
	subcategory: string;
	properties: CategoryItemProps;
}

export interface SubcategoryCreateElement extends CreateElementBase {
	type: 'subcategory';
	properties: SubcategoryItemProps;
}

export interface SectionCreateElement extends CreateElementBase {
	type: 'section';
	title: string;
	children: INodeCreateElement[];
}

export interface ViewCreateElement extends CreateElementBase {
	type: 'view';
	properties: ViewItemProps;
}

export interface LabelCreateElement extends CreateElementBase {
	type: 'label';
	subcategory: string;
	properties: LabelItemProps;
}

export interface ActionCreateElement extends CreateElementBase {
	type: 'action';
	subcategory: string;
	properties: ActionTypeDescription;
}

export type INodeCreateElement =
	| NodeCreateElement
	| CategoryCreateElement
	| SubcategoryCreateElement
	| SectionCreateElement
	| ViewCreateElement
	| LabelCreateElement
	| ActionCreateElement;

export interface SubcategorizedNodeTypes {
	[subcategory: string]: INodeCreateElement[];
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
	id: number;
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
	executingNode: string[];
	executionWaitingForWebhook: boolean;
	finishedExecutionsCount: number;
	nodeMetadata: NodeMetadataMap;
	subWorkflowExecutionError: Error | null;
	usedCredentials: Record<string, IUsedCredential>;
	workflow: IWorkflowDb;
	workflowExecutionData: IExecutionResponse | null;
	workflowExecutionPairedItemMappings: { [itemId: string]: Set<string> };
	workflowsById: IWorkflowsMap;
	isInDebugMode?: boolean;
}

export interface RootState {
	baseUrl: string;
	restEndpoint: string;
	defaultLocale: string;
	endpointForm: string;
	endpointFormTest: string;
	endpointFormWaiting: string;
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
	endpointForm: string;
	endpointFormTest: string;
	endpointFormWaiting: string;
	endpointWebhook: string;
	endpointWebhookTest: string;
	executionId: string | null;
	executingNode: string[];
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

export type Modals = {
	[CREDENTIAL_EDIT_MODAL_KEY]: NewCredentialsModal;
	[key: string]: ModalState;
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

export type IRunDataDisplayMode = 'table' | 'json' | 'binary' | 'schema' | 'html' | 'ai';
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
		activeTargetId: string | null;
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
	lastSelectedNodeEndpointUuid: string | null;
	nodeViewOffsetPosition: XYPosition;
	nodeViewMoveInProgress: boolean;
	selectedNodes: INodeUi[];
	sidebarMenuItems: IMenuItem[];
	nodeViewInitialized: boolean;
	addFirstStepOnLoad: boolean;
	executionSidebarAutoRefresh: boolean;
	bannersHeight: number;
	bannerStack: BannerName[];
	theme: ThemeOption;
	suggestedTemplates?: SuggestedTemplates;
	pendingNotificationsForViews: {
		[key in VIEWS]?: NotificationOptions[];
	};
}

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

export type NodeFilterType =
	| typeof REGULAR_NODE_CREATOR_VIEW
	| typeof TRIGGER_NODE_CREATOR_VIEW
	| typeof AI_NODE_CREATOR_VIEW
	| typeof AI_OTHERS_NODE_CREATOR_VIEW;

export type NodeCreatorOpenSource =
	| ''
	| 'context_menu'
	| 'no_trigger_execution_tooltip'
	| 'plus_endpoint'
	| 'add_input_endpoint'
	| 'trigger_placeholder_button'
	| 'tab'
	| 'node_connection_action'
	| 'node_connection_drop'
	| 'notice_error_message'
	| 'add_node_button';

export interface INodeCreatorState {
	itemsFilter: string;
	showScrim: boolean;
	rootViewHistory: NodeFilterType[];
	selectedView: NodeFilterType;
	openSource: NodeCreatorOpenSource;
}

export interface ISettingsState {
	initialized: boolean;
	settings: IN8nUISettings;
	promptsData: IN8nPrompts;
	userManagement: IUserManagementSettings;
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
	mfa: {
		enabled: boolean;
	};
	onboardingCallPromptEnabled: boolean;
	saveDataErrorExecution: string;
	saveDataSuccessExecution: string;
	saveManualExecutions: boolean;
}

export type NodeTypesByTypeNameAndVersion = {
	[nodeType: string]: {
		[version: number]: INodeTypeDescription;
	};
};

export interface INodeTypesState {
	nodeTypes: NodeTypesByTypeNameAndVersion;
}

export interface ITemplateState {
	categories: { [id: string]: ITemplatesCategory };
	collections: { [id: string]: ITemplatesCollection };
	workflows: { [id: string]: ITemplatesWorkflow | ITemplatesWorkflowFull };
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
	initialized: boolean;
	currentUserId: null | string;
	users: { [userId: string]: IUser };
	currentUserCloudInfo: Cloud.UserAccount | null;
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
	origin?: XYPosition;
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

export declare namespace DynamicNodeParameters {
	interface BaseRequest {
		path: string;
		nodeTypeAndVersion: INodeTypeNameVersion;
		currentNodeParameters: INodeParameters;
		methodName?: string;
		credentials?: INodeCredentials;
	}

	interface OptionsRequest extends BaseRequest {
		loadOptions?: ILoadOptions;
	}

	interface ResourceLocatorResultsRequest extends BaseRequest {
		methodName: string;
		filter?: string;
		paginationToken?: string;
	}

	interface ResourceMapperFieldsRequest extends BaseRequest {
		methodName: string;
	}
}

export interface EnvironmentVariable {
	id: number;
	key: string;
	value: string;
}

export interface TemporaryEnvironmentVariable extends Omit<EnvironmentVariable, 'id'> {
	id: string;
}

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

export type SshKeyTypes = ['ed25519', 'rsa'];

export type SourceControlPreferences = {
	connected: boolean;
	repositoryUrl: string;
	branchName: string;
	branches: string[];
	branchReadOnly: boolean;
	branchColor: string;
	publicKey?: string;
	keyGeneratorType?: TupleToUnion<SshKeyTypes>;
	currentBranch?: string;
};

export interface SourceControlStatus {
	ahead: number;
	behind: number;
	conflicted: string[];
	created: string[];
	current: string;
	deleted: string[];
	detached: boolean;
	files: Array<{
		path: string;
		index: string;
		working_dir: string;
	}>;
	modified: string[];
	not_added: string[];
	renamed: string[];
	staged: string[];
	tracking: null;
}

export interface SourceControlAggregatedFile {
	conflict: boolean;
	file: string;
	id: string;
	location: string;
	name: string;
	status: string;
	type: string;
	updatedAt?: string;
}

export declare namespace Cloud {
	export interface PlanData {
		planId: number;
		monthlyExecutionsLimit: number;
		activeWorkflowsLimit: number;
		credentialsLimit: number;
		isActive: boolean;
		displayName: string;
		expirationDate: string;
		metadata: PlanMetadata;
	}

	export interface PlanMetadata {
		version: 'v1';
		group: 'opt-out' | 'opt-in' | 'trial';
		slug: 'pro-1' | 'pro-2' | 'starter' | 'trial-1';
		trial?: Trial;
	}

	interface Trial {
		length: number;
		gracePeriod: number;
	}

	export type UserAccount = {
		confirmed: boolean;
		username: string;
		email: string;
		hasEarlyAccess?: boolean;
	};
}

export interface CloudPlanState {
	initialized: boolean;
	data: Cloud.PlanData | null;
	usage: InstanceUsage | null;
	loadingPlan: boolean;
}

export interface InstanceUsage {
	timeframe?: string;
	executions: number;
	activeWorkflows: number;
}

export type CloudPlanAndUsageData = Cloud.PlanData & { usage: InstanceUsage };

export interface ExternalSecretsProviderSecret {
	key: string;
}

export type ExternalSecretsProviderData = Record<string, IUpdateInformation['value']>;

export interface ExternalSecretsProvider {
	icon: string;
	name: string;
	displayName: string;
	connected: boolean;
	connectedAt: string | false;
	state: 'connected' | 'tested' | 'initializing' | 'error';
	data?: ExternalSecretsProviderData;
}

export interface ExternalSecretsProviderWithProperties extends ExternalSecretsProvider {
	properties: INodeProperties[];
}

export type CloudUpdateLinkSourceType =
	| 'advanced-permissions'
	| 'canvas-nav'
	| 'custom-data-filter'
	| 'workflow_sharing'
	| 'credential_sharing'
	| 'settings-n8n-api'
	| 'audit-logs'
	| 'ldap'
	| 'log-streaming'
	| 'source-control'
	| 'sso'
	| 'usage_page'
	| 'settings-users'
	| 'variables'
	| 'community-nodes'
	| 'workflow-history'
	| 'worker-view';

export type UTMCampaign =
	| 'upgrade-custom-data-filter'
	| 'upgrade-canvas-nav'
	| 'upgrade-workflow-sharing'
	| 'upgrade-credentials-sharing'
	| 'upgrade-api'
	| 'upgrade-audit-logs'
	| 'upgrade-ldap'
	| 'upgrade-log-streaming'
	| 'upgrade-source-control'
	| 'upgrade-sso'
	| 'open'
	| 'upgrade-users'
	| 'upgrade-variables'
	| 'upgrade-community-nodes'
	| 'upgrade-workflow-history'
	| 'upgrade-advanced-permissions'
	| 'upgrade-worker-view';

export type N8nBanners = {
	[key in BannerName]: {
		priority: number;
		component: Component;
	};
};

export type AddedNode = {
	type: string;
	openDetail?: boolean;
	isAutoAdd?: boolean;
	name?: string;
	position?: XYPosition;
};

export type AddedNodeConnection = {
	from: { nodeIndex: number; outputIndex?: number };
	to: { nodeIndex: number; inputIndex?: number };
};

export type AddedNodesAndConnections = {
	nodes: AddedNode[];
	connections: AddedNodeConnection[];
};

export type ToggleNodeCreatorOptions = {
	createNodeActive: boolean;
	source?: NodeCreatorOpenSource;
	nodeCreatorView?: string;
};

export type AppliedThemeOption = 'light' | 'dark';
export type ThemeOption = AppliedThemeOption | 'system';

export type SuggestedTemplates = {
	sections: SuggestedTemplatesSection[];
};

export type SuggestedTemplatesSection = {
	name: string;
	title: string;
	description: string;
	workflows: SuggestedTemplatesWorkflowPreview[];
};

export type SuggestedTemplatesWorkflowPreview = {
	title: string;
	description: string;
	preview: IWorkflowData;
	nodes: Array<Pick<ITemplatesNode, 'id' | 'displayName' | 'icon' | 'defaults' | 'iconData'>>;
};
