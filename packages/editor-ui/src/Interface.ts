
import {
	GenericValue,
	IConnections,
	ICredentialsDecrypted,
	ICredentialsEncrypted,
	ICredentialType,
	IDataObject,
	ILoadOptions,
	INode,
	INodeCredentials,
	INodeIssues,
	INodeParameters,
	INodePropertyOptions,
	INodeTypeDescription,
	INodeTypeNameVersion,
	IRunExecutionData,
	IRun,
	IRunData,
	ITaskData,
	ITelemetrySettings,
	IWorkflowSettings as IWorkflowSettingsWorkflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';

declare module 'jsplumb' {
	interface PaintStyle {
		stroke?: string;
		fill?: string;
		strokeWidth?: number;
		outlineStroke?: string;
		outlineWidth?: number;
	}

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
export interface IEndpointOptions {
	anchor?: any; // tslint:disable-line:no-any
	createEndpoint?: boolean;
	dragAllowedWhenFull?: boolean;
	dropOptions?: any; // tslint:disable-line:no-any
	dragProxy?: any; // tslint:disable-line:no-any
	endpoint?: string;
	endpointStyle?: object;
	endpointHoverStyle?: object;
	isSource?: boolean;
	isTarget?: boolean;
	maxConnections?: number;
	overlays?: any; // tslint:disable-line:no-any
	parameters?: any; // tslint:disable-line:no-any
	uuid?: string;
	enabled?: boolean;
	cssClass?: string;
}

export interface IUpdateInformation {
	name: string;
	key: string;
	value: string | number; // with null makes problems in NodeSettings.vue
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

export type MessageType = 'success' | 'warning' | 'info' | 'error';

export interface INodeUi extends INode {
	position: XYPosition;
	color?: string;
	notes?: string;
	issues?: INodeIssues;
	name: string;
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

export interface IRestApi {
	getActiveWorkflows(): Promise<string[]>;
	getActivationError(id: string): Promise<IActivationError | undefined >;
	getCurrentExecutions(filter: object): Promise<IExecutionsCurrentSummaryExtended[]>;
	getPastExecutions(filter: object, limit: number, lastId?: string | number, firstId?: string | number): Promise<IExecutionsListResponse>;
	stopCurrentExecution(executionId: string): Promise<IExecutionsStopData>;
	makeRestApiRequest(method: string, endpoint: string, data?: any): Promise<any>; // tslint:disable-line:no-any
	getCredentialTranslation(credentialType: string): Promise<object>;
	getNodeTranslationHeaders(): Promise<INodeTranslationHeaders>;
	getNodeTypes(onlyLatest?: boolean): Promise<INodeTypeDescription[]>;
	getNodesInformation(nodeInfos: INodeTypeNameVersion[]): Promise<INodeTypeDescription[]>;
	getNodeParameterOptions(sendData: { nodeTypeAndVersion: INodeTypeNameVersion, path: string, methodName?: string, loadOptions?: ILoadOptions, currentNodeParameters: INodeParameters, credentials?: INodeCredentials }): Promise<INodePropertyOptions[]> ;
	removeTestWebhook(workflowId: string): Promise<boolean>;
	runWorkflow(runData: IStartRunData): Promise<IExecutionPushResponse>;
	createNewWorkflow(sendData: IWorkflowDataUpdate): Promise<IWorkflowDb>;
	updateWorkflow(id: string, data: IWorkflowDataUpdate): Promise<IWorkflowDb>;
	deleteWorkflow(name: string): Promise<void>;
	getWorkflow(id: string): Promise<IWorkflowDb>;
	getWorkflows(filter?: object): Promise<IWorkflowShortResponse[]>;
	getWorkflowFromUrl(url: string): Promise<IWorkflowDb>;
	getExecution(id: string): Promise<IExecutionResponse>;
	deleteExecutions(sendData: IExecutionDeleteFilter): Promise<void>;
	retryExecution(id: string, loadWorkflow?: boolean): Promise<boolean>;
	getTimezones(): Promise<IDataObject>;
	getBinaryBufferString(dataPath: string): Promise<string>;
}

export interface INodeTranslationHeaders {
	data: {
		[key: string]: {
			displayName: string;
			description: string;
		},
	};
}

export interface IBinaryDisplayData {
	index: number;
	key: string;
	node: string;
	outputIndex: number;
	runIndex: number;
}

export interface IStartRunData {
	workflowData: IWorkflowData;
	startNodes?: string[];
	destinationNode?: string;
	runData?: IRunData;
}

export interface IRunDataUi {
	node?: string;
	workflowData: IWorkflowData;
}

export interface ITableData {
	columns: string[];
	data: GenericValue[][];
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
}

export interface IWorkflowDataUpdate {
	id?: string | number;
	name?: string;
	nodes?: INode[];
	connections?: IConnections;
	settings?: IWorkflowSettings;
	active?: boolean;
	tags?: ITag[] | string[]; // string[] when store or requested, ITag[] from API response
}

export interface IWorkflowTemplate {
	id: number;
	name: string;
	workflow: {
		nodes: INodeUi[];
		connections: IConnections;
	};
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


// Identical or almost identical to cli.Interfaces.ts

export interface IActivationError {
	time: number;
	error: {
		message: string;
	};
}

export interface ICredentialsResponse extends ICredentialsEncrypted {
	id: string;
	createdAt: number | string;
	updatedAt: number | string;
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
	data: IRunExecutionData;
	workflowData: IWorkflowDb;
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

export type IPushDataType = IPushData['type'];

export type IPushData =
	| PushDataExecutionFinished
	| PushDataExecutionStarted
	| PushDataExecuteAfter
	| PushDataExecuteBefore
	| PushDataConsoleMessage
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

export interface IPushDataTestWebhook {
	executionId: string;
	workflowId: string;
}

export interface IPushDataConsoleMessage {
	source: string;
	messages: string[];
}

export interface IVersionNotificationSettings {
	enabled: boolean;
	endpoint: string;
	infoUrl: string;
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
	mspFocus?: string[] | null;
	mspFocusOther?: string | null;
	otherAutomationGoal?: string | null;
	otherCompanyIndustryExtended?: string[] | null;
};

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
	um?: boolean;
}

export interface IPermissions {
	allow?: IPermissionGroup;
	deny?: IPermissionGroup;
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

export interface IN8nUISettings {
	endpointWebhook: string;
	endpointWebhookTest: string;
	saveDataErrorExecution: string;
	saveDataSuccessExecution: string;
	saveManualExecutions: boolean;
	timezone: string;
	executionTimeout: number;
	maxExecutionTimeout: number;
	oauthCallbackUrls: {
		oauth1: string;
		oauth2: string;
	};
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
}

export interface IWorkflowSettings extends IWorkflowSettingsWorkflow {
	errorWorkflow?: string;
	saveDataErrorExecution?: string;
	saveDataSuccessExecution?: string;
	saveManualExecutions?: boolean;
	timezone?: string;
	executionTimeout?: number;
}

export interface ITimeoutHMS {
	hours: number;
	minutes: number;
	seconds: number;
}

export type WorkflowTitleStatus = 'EXECUTING' | 'IDLE' | 'ERROR';

export type MenuItemType = 'link';
export type MenuItemPosition = 'top' | 'bottom';

export interface IMenuItem {
	id: string;
	type: MenuItemType;
	position?: MenuItemPosition;
	properties: ILinkMenuItemProperties;
}

export interface ILinkMenuItemProperties {
	title: string;
	icon: string;
	href: string;
	newWindow?: boolean;
}

export interface ISubcategoryItemProps {
	subcategory: string;
	description: string;
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

export interface IRootState {
	activeExecutions: IExecutionsCurrentSummaryExtended[];
	activeWorkflows: string[];
	activeActions: string[];
	activeCredentialType: string | null;
	activeNode: string | null;
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
	lastSelectedNode: string | null;
	lastSelectedNodeOutputIndex: number | null;
	nodeIndex: Array<string | null>;
	nodeTypes: INodeTypeDescription[];
	nodeViewOffsetPosition: XYPosition;
	nodeViewMoveInProgress: boolean;
	selectedNodes: INodeUi[];
	sessionId: string;
	urlBaseWebhook: string;
	workflow: IWorkflowDb;
	sidebarMenuItems: IMenuItem[];
	instanceId: string;
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
	isLoading: boolean;
	fetchedAll: boolean;
	fetchedUsageCount: boolean;
}

export interface IModalState {
	open: boolean;
	mode?: string | null;
	activeId?: string | null;
}

export interface IUiState {
	sidebarMenuCollapsed: boolean;
	modalStack: string[];
	modals: {
		[key: string]: IModalState;
	};
	isPageLoading: boolean;
	currentView: string;
}

export type ILogLevel = 'info' | 'debug' | 'warn' | 'error' | 'verbose';

export interface ISettingsState {
	settings: IN8nUISettings;
	promptsData: IN8nPrompts;
	userManagement: IUserManagementConfig;
	templatesEndpointHealthy: boolean;
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

export type IRole = 'default' | 'owner' | 'member';

export interface IUserResponse {
	id: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	globalRole?: {
		name: IRole;
		id: string;
	};
	personalizationAnswers?: IPersonalizationSurveyAnswersV1 | IPersonalizationSurveyAnswersV2 | null;
	isPending: boolean;
}

export interface IInviteResponse {
	user: {
		id: string;
		email: string;
	};
	error?: string;
}

export interface IUser extends IUserResponse {
	isDefaultUser: boolean;
	isPendingUser: boolean;
	isOwner: boolean;
	fullName?: string;
}

export type Rule = { name: string; config?: any}; // tslint:disable-line:no-any

export type RuleGroup = {
	rules: Array<Rule | RuleGroup>;
	defaultError?: {messageKey: string, options?: any}; // tslint:disable-line:no-any
};

export type IValidator = {
	validate: (value: string | number | boolean | null | undefined, config: any) => false | {messageKey: string, options?: any}; // tslint:disable-line:no-any
};

export type IFormInput = {
	name: string;
	initialValue?: string | number | boolean | null;
	properties: {
		label?: string;
		type?: 'text' | 'email' | 'password' | 'select' | 'multi-select' | 'info';
		maxlength?: number;
		required?: boolean;
		showRequiredAsterisk?: boolean;
		validators?: {
			[name: string]: IValidator;
		};
		validationRules?: Array<Rule | RuleGroup>;
		validateOnBlur?: boolean;
		infoText?: string;
		placeholder?: string;
		options?: Array<{label: string; value: string}>;
		autocomplete?: 'off' | 'new-password' | 'current-password' | 'given-name' | 'family-name' | 'email'; // https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete
		capitalize?: boolean;
		focusInitially?: boolean;
	};
	shouldDisplay?: (values: {[key: string]: unknown}) => boolean;
};

export type IFormInputs = IFormInput[];

export type IFormBoxConfig = {
	title: string;
	buttonText?: string;
	secondaryButtonText?: string;
	inputs: IFormInputs;
	redirectLink?: string;
	redirectText?: string;
};
