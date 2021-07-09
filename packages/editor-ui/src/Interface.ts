
import {
	IConnections,
	ICredentialsDecrypted,
	ICredentialsEncrypted,
	ICredentialType,
	IDataObject,
	GenericValue,
	IWorkflowSettings as IWorkflowSettingsWorkflow,
	INode,
	INodeCredentials,
	INodeIssues,
	INodeParameters,
	INodePropertyOptions,
	INodeTypeDescription,
	IRunExecutionData,
	IRun,
	IRunData,
	ITaskData,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import {
	PaintStyle,
} from 'jsplumb';

declare module 'jsplumb' {
	interface Anchor {
		lastReturnValue: number[];
	}

	interface Connection {
		// bind(event: string, (connection: Connection): void;): void; // tslint:disable-line:no-any
		bind(event: string, callback: Function): void; // tslint:disable-line:no-any
		removeOverlay(name: string): void;
		removeOverlays(): void;
		setParameter(name: string, value: any): void; // tslint:disable-line:no-any
		setPaintStyle(arg0: PaintStyle): void;
		addOverlay(arg0: any[]): void; // tslint:disable-line:no-any
		setConnector(arg0: any[]): void; // tslint:disable-line:no-any
	}

	interface Endpoint {
		getOverlay(name: string): any; // tslint:disable-line:no-any
	}

	interface Overlay {
		setVisible(visible: boolean): void;
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
	isSource?: boolean;
	isTarget?: boolean;
	maxConnections?: number;
	overlays?: any; // tslint:disable-line:no-any
	parameters?: any; // tslint:disable-line:no-any
	uuid?: string;
}

export interface IConnectionsUi {
	[key: string]: {
		[key: string]: IEndpointOptions;
	};
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

export type XYPositon = [number, number];

export type MessageType = 'success' | 'warning' | 'info' | 'error';

export interface INodeUi extends INode {
	position: XYPositon;
	color?: string;
	notes?: string;
	issues?: INodeIssues;
	_jsPlumb?: {
		endpoints?: {
			[key: string]: IEndpointOptions[];
		};
	};
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
	getSettings(): Promise<IN8nUISettings>;
	getNodeTypes(): Promise<INodeTypeDescription[]>;
	getNodesInformation(nodeList: string[]): Promise<INodeTypeDescription[]>;
	getNodeParameterOptions(nodeType: string, path: string, methodName: string, currentNodeParameters: INodeParameters, credentials?: INodeCredentials): Promise<INodePropertyOptions[]>;
	removeTestWebhook(workflowId: string): Promise<boolean>;
	runWorkflow(runData: IStartRunData): Promise<IExecutionPushResponse>;
	createNewWorkflow(sendData: IWorkflowDataUpdate): Promise<IWorkflowDb>;
	updateWorkflow(id: string, data: IWorkflowDataUpdate): Promise<IWorkflowDb>;
	deleteWorkflow(name: string): Promise<void>;
	getWorkflow(id: string): Promise<IWorkflowDb>;
	getWorkflows(filter?: object): Promise<IWorkflowShortResponse[]>;
	getWorkflowFromUrl(url: string): Promise<IWorkflowDb>;
	createNewCredentials(sendData: ICredentialsDecrypted): Promise<ICredentialsResponse>;
	deleteCredentials(id: string): Promise<void>;
	updateCredentials(id: string, data: ICredentialsDecrypted): Promise<ICredentialsResponse>;
	getAllCredentials(filter?: object): Promise<ICredentialsResponse[]>;
	getCredentials(id: string, includeData?: boolean): Promise<ICredentialsDecryptedResponse | ICredentialsResponse | undefined>;
	getCredentialTypes(): Promise<ICredentialType[]>;
	getExecution(id: string): Promise<IExecutionResponse>;
	deleteExecutions(sendData: IExecutionDeleteFilter): Promise<void>;
	retryExecution(id: string, loadWorkflow?: boolean): Promise<boolean>;
	getTimezones(): Promise<IDataObject>;
	oAuth1CredentialAuthorize(sendData: ICredentialsResponse): Promise<string>;
	oAuth2CredentialAuthorize(sendData: ICredentialsResponse): Promise<string>;
	oAuth2Callback(code: string, state: string): Promise<string>;
}

export interface IBinaryDisplayData {
	index: number;
	key: string;
	node: string;
	outputIndex: number;
	runIndex: number;
}

export interface ICredentialsCreatedEvent {
	data: ICredentialsDecryptedResponse;
	options: {
		closeDialog: boolean,
	};
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
	id?: string;
	name?: string;
	active?: boolean;
	nodes: INode[];
	connections: IConnections;
	settings?: IWorkflowSettings;
	tags?: string[];
}

export interface IWorkflowDataUpdate {
	id?: string;
	name?: string;
	nodes?: INode[];
	connections?: IConnections;
	settings?: IWorkflowSettings;
	active?: boolean;
	tags?: ITag[] | string[]; // string[] when store or requested, ITag[] from API response
}

export interface IWorkflowTemplate {
	id: string;
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
	id?: string;
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
	message: string;
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
}

export interface IRootState {
	activeExecutions: IExecutionsCurrentSummaryExtended[];
	activeWorkflows: string[];
	activeActions: string[];
	activeNode: string | null;
	baseUrl: string;
	credentials: ICredentialsResponse[] | null;
	credentialTypes: ICredentialType[] | null;
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
	nodeViewOffsetPosition: XYPositon;
	nodeViewMoveInProgress: boolean;
	selectedNodes: INodeUi[];
	sessionId: string;
	urlBaseWebhook: string;
	workflow: IWorkflowDb;
	sidebarMenuItems: IMenuItem[];
}

export interface ITagsState {
	tags: { [id: string]: ITag };
	isLoading: boolean;
	fetchedAll: boolean;
	fetchedUsageCount: boolean;
}

export interface IModalState {
	open: boolean;
}

export interface IUiState {
	sidebarMenuCollapsed: boolean;
	modalStack: string[];
	modals: {
		[key: string]: IModalState;
	};
	isPageLoading: boolean;
}

export interface IWorkflowsState {
}

export interface IRestApiContext {
	baseUrl: string;
	sessionId: string;
}

export interface IZoomConfig {
	scale: number;
	offset: XYPositon;
}
