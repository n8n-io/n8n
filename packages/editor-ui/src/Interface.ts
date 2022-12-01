import { IMenuItem } from 'n8n-design-system';
import {
	jsPlumbInstance,
	DragOptions,
	DropOptions,
	ElementGroupRef,
	Endpoint,
	EndpointOptions,
	EndpointRectangle,
	EndpointRectangleOptions,
	EndpointSpec,
} from "jsplumb";
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
} from 'n8n-workflow';
import { FAKE_DOOR_FEATURES } from './constants';
import {ICredentialsDb} from "n8n";

export * from 'n8n-design-system/src/types';

declare module 'jsplumb' {
	interface PaintStyle {
		stroke?: string;
		fill?: string;
		strokeWidth?: number;
		outlineStroke?: string;
		outlineWidth?: number;
	}

	// Extend jsPlumb Anchor interface
	interface Anchor {
		lastReturnValue: number[];
	}

	interface Connection {
		__meta?: {
			sourceNodeName: string,
			sourceOutputIndex: number,
			targetNodeName: string,
			targetOutputIndex: number,
		};
		canvas?: HTMLElement;
		connector?: {
			setTargetEndpoint: (endpoint: Endpoint) => void;
			resetTargetEndpoint: () => void;
			bounds: {
				minX: number;
				maxX: number;
				minY: number;
				maxY: number;
			}
		};

		// bind(event: string, (connection: Connection): void;): void; // tslint:disable-line:no-any
		bind(event: string, callback: Function): void;
		removeOverlay(name: string): void;
		removeOverlays(): void;
		setParameter(name: string, value: any): void; // tslint:disable-line:no-any
		setPaintStyle(arg0: PaintStyle): void;
		addOverlay(arg0: any[]): void; // tslint:disable-line:no-any
		setConnector(arg0: any[]): void; // tslint:disable-line:no-any
		getUuids(): [string, string];
	}

	interface Endpoint {
		endpoint: any; // tslint:disable-line:no-any
		elementId: string;
		__meta?: {
			nodeName: string,
			nodeId: string,
			index: number,
			totalEndpoints: number;
		};
		getUuid(): string;
		getOverlay(name: string): any; // tslint:disable-line:no-any
		repaint(params?: object): void;
	}

	interface N8nPlusEndpoint extends Endpoint {
		setSuccessOutput(message: string): void;
		clearSuccessOutput(): void;
	}

	interface Overlay {
		setVisible(visible: boolean): void;
		setLocation(location: number): void;
		canvas?: HTMLElement;
	}

	interface OnConnectionBindInfo {
		originalSourceEndpoint: Endpoint;
		originalTargetEndpoint: Endpoint;
		getParameters(): { index: number };
	}
}

// EndpointOptions from jsplumb seems incomplete and wrong so we define an own one
export type IEndpointOptions = Omit<EndpointOptions, 'endpoint' | 'dragProxy'> & {
	endpointStyle: EndpointStyle
	endpointHoverStyle: EndpointStyle
	endpoint?: EndpointSpec | string
	dragAllowedWhenFull?: boolean
	dropOptions?: DropOptions & {
		tolerance: string
	};
	dragProxy?: string | string[] | EndpointSpec | [ EndpointRectangle,  EndpointRectangleOptions & { strokeWidth: number } ]
};

export type EndpointStyle = {
	width?: number
	height?: number
	fill?: string
	stroke?: string
	outlineStroke?:string
	lineWidth?: number
	hover?: boolean
	showOutputLabel?: boolean
	size?: string
	hoverMessage?: string
};

export type IDragOptions = DragOptions & {
	grid: [number, number]
	filter: string
};

export type IJsPlumbInstance = Omit<jsPlumbInstance, 'addEndpoint' | 'draggable'> & {
	clearDragSelection: () => void
	addEndpoint(el: ElementGroupRef, params?: IEndpointOptions, referenceParams?: IEndpointOptions): Endpoint | Endpoint[]
	draggable(el: {}, options?: IDragOptions): IJsPlumbInstance
};

export interface IUpdateInformation {
	name: string;
	key?: string;
	value: string | number | { [key: string]: string | number | boolean } | NodeParameterValueType | INodeParameters; // with null makes problems in NodeSettings.vue
	node?: string;
	oldValue?: string | number;
}

export interface INodeUpdatePropertiesInformation {
	name: string; // Node-Name
	properties: {
		[key: string]: IDataObject;
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
	getActivationError(id: string): Promise<IActivationError | undefined >;
	getCurrentExecutions(filter: object): Promise<IExecutionsCurrentSummaryExtended[]>;
	getPastExecutions(filter: object, limit: number, lastId?: string | number, firstId?: string | number): Promise<IExecutionsListResponse>;
	stopCurrentExecution(executionId: string): Promise<IExecutionsStopData>;
	makeRestApiRequest(method: string, endpoint: string, data?: any): Promise<any>; // tslint:disable-line:no-any
	getCredentialTranslation(credentialType: string): Promise<object>;
	removeTestWebhook(workflowId: string): Promise<boolean>;
	runWorkflow(runData: IStartRunData): Promise<IExecutionPushResponse>;
	createNewWorkflow(sendData: IWorkflowDataUpdate): Promise<IWorkflowDb>;
	updateWorkflow(id: string, data: IWorkflowDataUpdate): Promise<IWorkflowDb>;
	deleteWorkflow(name: string): Promise<void>;
	getWorkflow(id: string): Promise<IWorkflowDb>;
	getWorkflows(filter?: object): Promise<IWorkflowShortResponse[]>;
	getWorkflowFromUrl(url: string): Promise<IWorkflowDb>;
	getExecution(id: string): Promise<IExecutionResponse | undefined>;
	deleteExecutions(sendData: IExecutionDeleteFilter): Promise<void>;
	retryExecution(id: string, loadWorkflow?: boolean): Promise<boolean>;
	getTimezones(): Promise<IDataObject>;
	getBinaryBufferString(dataPath: string): Promise<string>;
	getBinaryUrl(dataPath: string): string;
}

export interface INodeTranslationHeaders {
	data: {
		[key: string]: {
			displayName: string;
			description: string;
		},
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
	hasJson: {[key: string]: boolean};
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
	id?: string | number;
	name?: string;
	active?: boolean;
	nodes: INode[];
	connections: IConnections;
	settings?: IWorkflowSettings;
	tags?: string[];
	pinData?: IPinData;
	hash?: string;
}

export interface IWorkflowDataUpdate {
	id?: string | number;
	name?: string;
	nodes?: INode[];
	connections?: IConnections;
	settings?: IWorkflowSettings;
	active?: boolean;
	tags?: ITag[] | string[]; // string[] when store or requested, ITag[] from API response
	pinData?: IPinData;
	hash?: string;
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
	hash: string;
	usedCredentials?: Array<Partial<ICredentialsDb>>;
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

export interface ICredentialsDecryptedResponse extends ICredentialsBase, ICredentialsDecrypted{
	id: string;
}

export interface IExecutionBase {
	id?: number | string;
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
}

export interface IExecutionsSummary {
	id: string;
	mode: WorkflowExecuteMode;
	finished?: boolean;
	retryOf?: string;
	retrySuccessId?: string;
	waitTill?: Date;
	startedAt: Date;
	stoppedAt?: Date;
	workflowId: string;
	workflowName?: string;
}

export interface IExecutionDeleteFilter {
	deleteBefore?: Date;
	filters?: IDataObject;
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
	| PushDataTestWebhook;

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

export interface IPushDataExecutionFinished {
	data: IRun;
	executionId: string;
	retryOf?: string;
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
};

export type IPersonalizationLatestVersion = IPersonalizationSurveyAnswersV3;

export type IPersonalizationSurveyVersions = IPersonalizationSurveyAnswersV1 | IPersonalizationSurveyAnswersV2 | IPersonalizationSurveyAnswersV3;

export type IRole = 'default' | 'owner' | 'member';

export interface IUserResponse {
	id: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	globalRole?: {
		name: IRole;
		id: string;
		createdAt: Date;
	};
	personalizationAnswers?: IPersonalizationSurveyVersions | null;
	isPending: boolean;
}

export interface IUser extends IUserResponse {
	isDefaultUser: boolean;
	isPendingUser: boolean;
	isOwner: boolean;
	fullName?: string;
	createdAt?: Date;
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

export interface IUserManagementConfig {
	enabled: boolean;
	showSetupOnFirstLoad?: boolean;
	smtpSetup: boolean;
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
	workflows: Array<{id: number}>;
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
	executionMode: string;
	communityNodesEnabled: boolean;
	isNpmAvailable: boolean;
	publicApi: {
		enabled: boolean;
		latestVersion: number;
		path: string;
	};
	onboardingCallPromptEnabled: boolean;
	allowedModules: {
		builtIn?: string[];
		external?: string[];
	};
	enterprise: Record<string, boolean>;
	deployment?: {
		type: string;
	};
	isWorkflowSharingEnabled: boolean;
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
	icon?: string;
	defaults?: INodeParameters;
	iconData?: {
		type: string;
		icon?: string;
		fileBuffer?: string;
	};
}

export interface INodeItemProps {
	subcategory: string;
	nodeType: INodeTypeDescription;
}

export interface ICategoryItemProps {
	expanded: boolean;
}

export interface INodeCreateElement {
	type: 'node' | 'category' | 'subcategory';
	category: string;
	key: string;
	includedByTrigger?: boolean;
	includedByRegular?: boolean;
	properties: ISubcategoryItemProps | INodeItemProps | ICategoryItemProps;
}

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
}

export interface IUsedCredential {
	id: string;
	name: string;
	credentialType: string;
	currentUserHasAccess: boolean;
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
	workflowExecutionPairedItemMappings: {[itemId: string]: Set<string>};
	workflowsById: IWorkflowsMap;
}

export interface RootState {
	baseUrl: string;
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
	workflowExecutionPairedItemMappings: {[itemId: string]: Set<string>};
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

export interface IModalState {
	open: boolean;
	mode?: string | null;
	data?: Record<string, unknown>;
	activeId?: string | null;
	curlCommand?: string;
	httpNodeParameters?: string;
}

export interface NestedRecord<T> {
	[key: string]: T | NestedRecord<T>;
}

export type IRunDataDisplayMode = 'table' | 'json' | 'binary';
export type nodePanelType = 'input' | 'output';

export interface TargetItem {
	nodeName: string;
	itemIndex: number;
	runIndex: number;
	outputIndex: number;
}

export interface NDVState {
	activeNodeName: string | null;
	mainPanelDimensions: {[key: string]: {[key: string]: number}};
	sessionId: string;
	input: {
		displayMode: IRunDataDisplayMode;
		nodeName?: string;
		run?: number;
		branch?: number;
		data: {
			isEmpty: boolean;
		}
	};
	output: {
		branch?: number;
		displayMode: IRunDataDisplayMode;
		data: {
			isEmpty: boolean;
		}
		editMode: {
			enabled: boolean;
			value: string;
		};
	};
	focusedMappableInput: string;
	mappingTelemetry: {[key: string]: string | number | boolean};
	hoveringItem: null | TargetItem;
	draggable: {
		isDragging: boolean;
		type: string;
		data: string;
		canDrop: boolean;
		stickyPosition: null | XYPosition;
	};
}


export interface IUiState {
	sidebarMenuCollapsed: boolean;
	modalStack: string[];
	modals: {
		[key: string]: IModalState;
	};
	isPageLoading: boolean;
	currentView: string;
	fakeDoorFeatures: IFakeDoor[];
	nodeViewInitialized: boolean;
	addFirstStepOnLoad: boolean;
	executionSidebarAutoRefresh: boolean;
}

export interface UIState {
	activeActions: string[];
	activeCredentialType: string | null;
	sidebarMenuCollapsed: boolean;
	modalStack: string[];
	modals: {
		[key: string]: IModalState;
	};
	isPageLoading: boolean;
	currentView: string;
	mainPanelPosition: number;
	fakeDoorFeatures: IFakeDoor[];
	dynamicTranslations: NestedRecord<string>;
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
	id: FAKE_DOOR_FEATURES,
	featureName: string,
	icon?: string,
	infoText?: string,
	actionBoxTitle: string,
	actionBoxDescription: string,
	actionBoxButtonLabel?: string,
	linkURL: string,
	uiLocations: IFakeDoorLocation[],
};

export type IFakeDoorLocation = 'settings' | 'credentialsModal' | 'workflowShareModal';

export type INodeFilterType = "Regular" | "Trigger" | "All";

export interface INodeCreatorState {
	itemsFilter: string;
	showTabs: boolean;
	showScrim: boolean;
	selectedType: INodeFilterType;
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
		}
	};
}

export interface ITemplateState {
	categories: {[id: string]: ITemplatesCategory};
	collections: {[id: string]: ITemplatesCollection};
	workflows: {[id: string]: ITemplatesWorkflow};
	workflowSearches: {
		[search: string]: {
			workflowIds: string[];
			totalWorkflows: number;
			loadingMore?: boolean;
		}
	};
	collectionSearches: {
		[search: string]: {
			collectionIds: string[];
		}
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
	users: {[userId: string]: IUser};
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
	"parameters.url": string;
	"parameters.authentication": string;
	"parameters.method": string;
	"parameters.sendHeaders": boolean;
	"parameters.headerParameters.parameters.0.name": string;
	"parameters.headerParameters.parameters.0.value": string;
	"parameters.sendQuery": boolean;
	"parameters.sendBody": boolean;
}
