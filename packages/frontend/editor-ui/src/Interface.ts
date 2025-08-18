import type { Component } from 'vue';
import type { NotificationOptions as ElementNotificationOptions } from 'element-plus';
import type {
	BannerName,
	FrontendSettings,
	Iso8601DateTimeString,
	IUserManagementSettings,
	IVersionNotificationSettings,
	ROLE,
	Role,
} from '@n8n/api-types';
import type { Scope } from '@n8n/permissions';
import type { NodeCreatorTag } from '@n8n/design-system';
import type {
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
	IRunData,
	IWorkflowSettings as IWorkflowSettingsWorkflow,
	WorkflowExecuteMode,
	PublicInstalledPackage,
	INodeListSearchItems,
	NodeParameterValueType,
	IDisplayOptions,
	ExecutionSummary,
	FeatureFlags,
	ExecutionStatus,
	ITelemetryTrackProperties,
	WorkflowSettings,
	INodeExecutionData,
	INodeProperties,
	NodeConnectionType,
	StartNodeData,
	AnnotationVote,
	ITaskData,
	ISourceData,
} from 'n8n-workflow';
import type { Version } from '@n8n/rest-api-client/api/versions';
import type { Cloud, InstanceUsage } from '@n8n/rest-api-client/api/cloudPlans';
import type {
	WorkflowMetadata,
	WorkflowData,
	WorkflowDataCreate,
	WorkflowDataUpdate,
} from '@n8n/rest-api-client/api/workflows';
import type { ITag } from '@n8n/rest-api-client/api/tags';

import type {
	AI_NODE_CREATOR_VIEW,
	CREDENTIAL_EDIT_MODAL_KEY,
	TRIGGER_NODE_CREATOR_VIEW,
	REGULAR_NODE_CREATOR_VIEW,
	AI_OTHERS_NODE_CREATOR_VIEW,
	AI_UNCATEGORIZED_CATEGORY,
	AI_EVALUATION,
} from '@/constants';
import type { BulkCommand, Undoable } from '@/models/history';

import type { ProjectSharingData } from '@/types/projects.types';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import type { IconName } from '@n8n/design-system/src/components/N8nIcon/icons';
import type { IUser, IUserResponse } from '@n8n/rest-api-client/api/users';

export * from '@n8n/design-system/types';

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
			get_session_id?(): string | null;
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
		Cypress: unknown;
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

export interface IUpdateInformation<T extends NodeParameterValueType = NodeParameterValueType> {
	name: string;
	key?: string;
	value: T;
	node?: string;
	oldValue?: string | number;
	type?: 'optionsOrderChanged';
}

export interface INodeUpdatePropertiesInformation {
	name: string; // Node-Name
	properties: Partial<INodeUi>;
}

export type XYPosition = [number, number];

export type DraggableMode = 'mapping' | 'panel-resize' | 'move';

export interface INodeUi extends INode {
	position: XYPosition;
	color?: string;
	notes?: string;
	issues?: INodeIssues;
	name: string;
	pinData?: IDataObject;
	draggable?: boolean;
}

export interface INodeTypesMaxCount {
	[key: string]: {
		exist: number;
		max: number;
		nodeNames: string[];
	};
}

export interface IAiDataContent {
	data: INodeExecutionData[] | null;
	inOut: 'input' | 'output';
	type: NodeConnectionType;
	source?: Array<ISourceData | null>;
	metadata: {
		executionTime: number;
		startTime: number;
		subExecution?: {
			workflowId: string;
			executionId: string;
		};
	};
}

export interface IAiData {
	data: IAiDataContent[];
	node: string;
	runIndex: number;
}

export interface IStartRunData {
	workflowData: WorkflowData;
	startNodes?: StartNodeData[];
	destinationNode?: string;
	runData?: IRunData;
	dirtyNodeNames?: string[];
	triggerToStartFrom?: {
		name: string;
		data?: ITaskData;
	};
	agentRequest?: {
		query: NodeParameterValueType;
		tool: {
			name: NodeParameterValueType;
		};
	};
}

export interface ITableData {
	columns: string[];
	data: GenericValue[][];
	hasJson: { [key: string]: boolean };
	metadata: {
		hasExecutionIds: boolean;
		data: Array<INodeExecutionData['metadata'] | undefined>;
	};
}

/**
 * Workflow data with mandatory `templateId`
 * This is used to identify sample workflows that we create for onboarding
 */
export interface WorkflowDataWithTemplateId extends Omit<WorkflowDataCreate, 'meta'> {
	meta: WorkflowMetadata & {
		templateId: Required<WorkflowMetadata>['templateId'];
	};
}

export interface IWorkflowToShare extends WorkflowDataUpdate {
	meta: WorkflowMetadata;
}

export interface NewWorkflowResponse {
	name: string;
	defaultSettings: IWorkflowSettings;
}

export interface INewWorkflowData {
	name: string;
}

// Almost identical to cli.Interfaces.ts
export interface IWorkflowDb {
	id: string;
	name: string;
	active: boolean;
	isArchived: boolean;
	createdAt: number | string;
	updatedAt: number | string;
	nodes: INodeUi[];
	connections: IConnections;
	settings?: IWorkflowSettings;
	tags?: ITag[] | string[]; // string[] when store or requested, ITag[] from API response
	pinData?: IPinData;
	sharedWithProjects?: ProjectSharingData[];
	homeProject?: ProjectSharingData;
	scopes?: Scope[];
	versionId: string;
	usedCredentials?: IUsedCredential[];
	meta?: WorkflowMetadata;
	parentFolder?: {
		id: string;
		name: string;
		parentFolderId: string | null;
		createdAt?: string;
		updatedAt?: string;
	};
}

// For workflow list we don't need the full workflow data
export type BaseResource = {
	id: string;
	name: string;
};

export type FolderResource = BaseFolderItem & {
	resourceType: 'folder';
};

export type WorkflowResource = BaseResource & {
	resourceType: 'workflow';
	updatedAt: string;
	createdAt: string;
	active: boolean;
	isArchived: boolean;
	homeProject?: ProjectSharingData;
	scopes?: Scope[];
	tags?: ITag[] | string[];
	sharedWithProjects?: ProjectSharingData[];
	readOnly: boolean;
	parentFolder?: ResourceParentFolder;
};

export type VariableResource = BaseResource & {
	resourceType: 'variable';
	key?: string;
	value?: string;
};

export type CredentialsResource = BaseResource & {
	resourceType: 'credential';
	updatedAt: string;
	createdAt: string;
	type: string;
	homeProject?: ProjectSharingData;
	scopes?: Scope[];
	sharedWithProjects?: ProjectSharingData[];
	readOnly: boolean;
	needsSetup: boolean;
};

// Base resource types that are always available
export type CoreResource =
	| WorkflowResource
	| FolderResource
	| CredentialsResource
	| VariableResource;

// This interface can be extended by modules to add their own resource types
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ModuleResources {}

// The Resource type is the union of core resources and any module resources
export type Resource = CoreResource | ModuleResources[keyof ModuleResources];

export type BaseFilters = {
	search: string;
	homeProject: string;
	[key: string]: boolean | string | string[];
};

export type SortingAndPaginationUpdates = {
	page?: number;
	pageSize?: number;
	sort?: string;
};

export type WorkflowListItem = Omit<
	IWorkflowDb,
	'nodes' | 'connections' | 'settings' | 'pinData' | 'usedCredentials' | 'meta'
> & {
	resource: 'workflow';
};

export type FolderShortInfo = {
	id: string;
	name: string;
	parentFolder?: string;
};

export type BaseFolderItem = BaseResource & {
	createdAt: string;
	updatedAt: string;
	workflowCount: number;
	subFolderCount: number;
	parentFolder?: ResourceParentFolder;
	homeProject?: ProjectSharingData;
	tags?: ITag[];
};

export type ResourceParentFolder = {
	id: string;
	name: string;
	parentFolderId: string | null;
};

export interface FolderListItem extends BaseFolderItem {
	resource: 'folder';
}

export interface ChangeLocationSearchResponseItem extends BaseFolderItem {
	path: string[];
}

export type FolderPathItem = PathItem & { parentFolder?: string };

export interface ChangeLocationSearchResult extends ChangeLocationSearchResponseItem {
	resource: 'folder' | 'project';
}

export type WorkflowListResource = WorkflowListItem | FolderListItem;

export type FolderCreateResponse = Omit<
	FolderListItem,
	'workflowCount' | 'tags' | 'sharedWithProjects' | 'homeProject'
>;

export type FolderTreeResponseItem = {
	id: string;
	name: string;
	children: FolderTreeResponseItem[];
};

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
	sharedWithProjects?: ProjectSharingData[];
	homeProject?: ProjectSharingData;
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
	createdAt: Iso8601DateTimeString;
	updatedAt: Iso8601DateTimeString;
	sharedWithProjects?: ProjectSharingData[];
	homeProject?: ProjectSharingData;
	currentUserHasAccess?: boolean;
	scopes?: Scope[];
	ownedBy?: Pick<IUserResponse, 'id' | 'firstName' | 'lastName' | 'email'>;
	isManaged: boolean;
}

export interface ICredentialsBase {
	createdAt: Iso8601DateTimeString;
	updatedAt: Iso8601DateTimeString;
}

export interface ICredentialsDecryptedResponse extends ICredentialsBase, ICredentialsDecrypted {
	id: string;
}

export interface IExecutionBase {
	id?: string;
	finished: boolean;
	mode: WorkflowExecuteMode;
	status: ExecutionStatus;
	retryOf?: string;
	retrySuccessId?: string;
	startedAt: Date | string;
	createdAt: Date | string;
	stoppedAt?: Date | string;
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
	triggerNode?: string;
}

export type ExecutionSummaryWithScopes = ExecutionSummary & { scopes: Scope[] };

export interface IExecutionsListResponse {
	count: number;
	results: ExecutionSummaryWithScopes[];
	estimated: boolean;
}

export interface IExecutionsCurrentSummaryExtended {
	id: string;
	status: ExecutionStatus;
	mode: WorkflowExecuteMode;
	startedAt: Date;
	workflowId: string;
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

export type InvitableRoleName = (typeof ROLE)['Member' | 'Admin'];

export interface IUserListAction {
	label: string;
	value: string;
	guard?: (user: IUser) => boolean;
}

export const enum UserManagementAuthenticationMethod {
	Email = 'email',
	Ldap = 'ldap',
	Saml = 'saml',
	Oidc = 'oidc',
}

export interface IPermissionGroup {
	loginStatus?: ILogInStatus[];
	role?: Role[];
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

export type WorkflowCallerPolicyDefaultOption = 'any' | 'none' | 'workflowsFromAList';

export interface IWorkflowSettings extends IWorkflowSettingsWorkflow {
	errorWorkflow?: string;
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
	| 'iconColor'
	| 'badgeIconUrl'
	| 'codex'
	| 'defaults'
	| 'outputs'
> & {
	tag?: string;
};
export interface SubcategoryItemProps {
	description?: string;
	iconType?: string;
	icon?: IconName;
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
	tag?: NodeCreatorTag;
	borderless?: boolean;
}
export interface LabelItemProps {
	key: string;
}
export interface LinkItemProps {
	url: string;
	key: string;
	newTab?: boolean;
	title: string;
	description: string;
	icon: string;
	tag?: NodeCreatorTag;
}

export interface OpenTemplateItemProps {
	templateId: string;
	title: string;
	description: string;
	nodes?: INodeTypeDescription[];
	icon?: string;
	tag?: NodeCreatorTag;
	compact?: boolean;
}

export interface ActionTypeDescription extends SimplifiedNodeType {
	displayOptions?: IDisplayOptions;
	values?: IDataObject;
	actionKey: string;
	outputConnectionType?: NodeConnectionType;
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
	resource?: string;
	operation?: string;
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

export interface LinkCreateElement extends CreateElementBase {
	type: 'link';
	properties: LinkItemProps;
}

export interface OpenTemplateElement extends CreateElementBase {
	type: 'openTemplate';
	properties: OpenTemplateItemProps;
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
	| ActionCreateElement
	| LinkCreateElement
	| OpenTemplateElement;

export type NodeTypeSelectedPayload = {
	type: string;
	parameters?: {
		resource?: string;
		operation?: string;
	};
	actionName?: string;
};

export interface SubcategorizedNodeTypes {
	[subcategory: string]: INodeCreateElement[];
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

export interface INodeMetadata {
	parametersLastUpdatedAt?: number;
	pinnedDataLastUpdatedAt?: number;
	pinnedDataLastRemovedAt?: number;
	pristine: boolean;
}

export interface IUsedCredential {
	id: string;
	name: string;
	credentialType: string;
	currentUserHasAccess: boolean;
	homeProject?: ProjectSharingData;
	sharedWithProjects?: ProjectSharingData[];
}

export interface WorkflowsState {
	activeWorkflows: string[];
	activeWorkflowExecution: ExecutionSummary | null;
	currentWorkflowExecutions: ExecutionSummary[];
	activeExecutionId: string | null;
	executingNode: string[];
	executionWaitingForWebhook: boolean;
	nodeMetadata: NodeMetadataMap;
	subWorkflowExecutionError: Error | null;
	usedCredentials: Record<string, IUsedCredential>;
	workflow: IWorkflowDb;
	workflowExecutionData: IExecutionResponse | null;
	workflowExecutionPairedItemMappings: { [itemId: string]: Set<string> };
	workflowsById: IWorkflowsMap;
	chatMessages: string[];
	isInDebugMode?: boolean;
}

export interface NodeMetadataMap {
	[nodeName: string]: INodeMetadata;
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

export type ModalKey = keyof Modals;

export type ModalState = {
	open: boolean;
	mode?: string | null;
	data?: Record<string, unknown>;
	activeId?: string | null;
	curlCommand?: string;
	httpNodeParameters?: string;
};

export interface NewCredentialsModal extends ModalState {
	showAuthSelector?: boolean;
}

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
	pushRef: string;
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
	focusedInputPath: string;
	mappingTelemetry: { [key: string]: string | number | boolean };
	hoveringItem: null | TargetItem;
	expressionOutputItemIndex: number;
	draggable: {
		isDragging: boolean;
		type: string;
		data: string;
		dimensions: DOMRect | null;
		activeTarget: { id: string; stickyPosition: null | XYPosition } | null;
	};
	isMappingOnboarded: boolean;
	isTableHoverOnboarded: boolean;
	isAutocompleteOnboarded: boolean;
	highlightDraggables: boolean;
}

export type TargetNodeParameterContext = {
	nodeName: string;
	parameterPath: string;
};

export interface NotificationOptions extends Partial<ElementNotificationOptions> {
	message: string | ElementNotificationOptions['message'];
}

export type NodeFilterType =
	| typeof REGULAR_NODE_CREATOR_VIEW
	| typeof TRIGGER_NODE_CREATOR_VIEW
	| typeof AI_NODE_CREATOR_VIEW
	| typeof AI_OTHERS_NODE_CREATOR_VIEW
	| typeof AI_UNCATEGORIZED_CATEGORY
	| typeof AI_EVALUATION;

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
	| 'add_node_button'
	| 'add_evaluation_trigger_button'
	| 'add_evaluation_node_button'
	| 'templates_callout';

export interface INodeCreatorState {
	itemsFilter: string;
	showScrim: boolean;
	rootViewHistory: NodeFilterType[];
	selectedView: NodeFilterType;
	openSource: NodeCreatorOpenSource;
}

export interface ISettingsState {
	initialized: boolean;
	settings: FrontendSettings;
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
	saveDataErrorExecution: WorkflowSettings.SaveDataExecution;
	saveDataSuccessExecution: WorkflowSettings.SaveDataExecution;
	saveManualExecutions: boolean;
	saveDataProgressExecution: boolean;
}

export type NodeTypesByTypeNameAndVersion = {
	[nodeType: string]: {
		[version: number]: INodeTypeDescription;
	};
};

export interface INodeTypesState {
	nodeTypes: NodeTypesByTypeNameAndVersion;
}

export interface IVersionsState {
	versionNotificationSettings: IVersionNotificationSettings;
	nextVersions: Version[];
	currentVersion: Version | undefined;
}

export interface IWorkflowsMap {
	[name: string]: IWorkflowDb;
}

export interface CommunityNodesState {
	availablePackageCount: number;
	installedPackages: CommunityPackageMap;
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
		role: Role;
	};
	error?: string;
}

export interface ITab<Value extends string | number = string | number> {
	value: Value;
	label?: string;
	href?: string;
	icon?: IconName;
	align?: 'right';
	tooltip?: string;
	notification?: boolean;
}

export interface ITabBarItem {
	value: string;
	label: string;
	disabled?: boolean;
}

export interface IResourceLocatorResultExpanded extends INodeListSearchItems {
	linkAlt?: string;
	isArchived?: boolean;
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

export type Schema = { type: SchemaType; key?: string; value: string | Schema[]; path: string };

export type UsageState = {
	loading: boolean;
	data: {
		usage: {
			activeWorkflowTriggers: {
				limit: number; // -1 for unlimited, from license
				value: number;
				warningThreshold: number; // hardcoded value in BE
			};
			workflowsHavingEvaluations: {
				limit: number; // -1 for unlimited, from license
				value: number;
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

export interface EnvironmentVariable {
	id: string;
	key: string;
	value: string;
}

export type ExecutionFilterMetadata = {
	key: string;
	value: string;
	exactMatch?: boolean;
};

export type ExecutionFilterVote = AnnotationVote | 'all';

export type ExecutionFilterType = {
	status: string;
	workflowId: string;
	startDate: string | Date;
	endDate: string | Date;
	tags: string[];
	annotationTags: string[];
	vote: ExecutionFilterVote;
	metadata: ExecutionFilterMetadata[];
};

export type ExecutionsQueryFilter = {
	status?: ExecutionStatus[];
	projectId?: string;
	workflowId?: string;
	finished?: boolean;
	waitTill?: boolean;
	metadata?: Array<{ key: string; value: string }>;
	startedAfter?: string;
	startedBefore?: string;
	annotationTags?: string[];
	vote?: ExecutionFilterVote;
};

export interface CloudPlanState {
	initialized: boolean;
	data: Cloud.PlanData | null;
	usage: InstanceUsage | null;
	loadingPlan: boolean;
}

export type CloudPlanAndUsageData = Cloud.PlanData & { usage: InstanceUsage };

export interface ExternalSecretsProviderSecret {
	key: string;
}

export type ExternalSecretsProviderData = Record<string, IUpdateInformation['value']>;

export type ExternalSecretsProviderProperty = INodeProperties;

export type ExternalSecretsProviderState = 'connected' | 'tested' | 'initializing' | 'error';

export interface ExternalSecretsProvider {
	icon: string;
	name: string;
	displayName: string;
	connected: boolean;
	connectedAt: string | false;
	state: ExternalSecretsProviderState;
	data?: ExternalSecretsProviderData;
	properties?: ExternalSecretsProviderProperty[];
}

export type CloudUpdateLinkSourceType =
	| 'advanced-permissions'
	| 'canvas-nav'
	| 'concurrency'
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
	| 'worker-view'
	| 'external-secrets'
	| 'rbac'
	| 'debug'
	| 'insights'
	| 'evaluations';

export type UTMCampaign =
	| 'upgrade-custom-data-filter'
	| 'upgrade-canvas-nav'
	| 'upgrade-concurrency'
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
	| 'upgrade-worker-view'
	| 'upgrade-external-secrets'
	| 'upgrade-rbac'
	| 'upgrade-debug'
	| 'upgrade-insights'
	| 'upgrade-evaluations';

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
	actionName?: string;
} & Partial<INodeUi>;

export type AddedNodeConnection = {
	from: { nodeIndex: number; outputIndex?: number; type?: NodeConnectionType };
	to: { nodeIndex: number; inputIndex?: number; type?: NodeConnectionType };
};

export type AddedNodesAndConnections = {
	nodes: AddedNode[];
	connections: AddedNodeConnection[];
};

export type ToggleNodeCreatorOptions = {
	createNodeActive: boolean;
	source?: NodeCreatorOpenSource;
	nodeCreatorView?: NodeFilterType;
	hasAddedNodes?: boolean;
	connectionType?: NodeConnectionType;
};

export type AppliedThemeOption = 'light' | 'dark';
export type ThemeOption = AppliedThemeOption | 'system';

export type EnterpriseEditionFeatureKey =
	| 'AdvancedExecutionFilters'
	| 'Sharing'
	| 'Ldap'
	| 'LogStreaming'
	| 'Variables'
	| 'Saml'
	| 'Oidc'
	| 'SourceControl'
	| 'ExternalSecrets'
	| 'AuditLogs'
	| 'DebugInEditor'
	| 'WorkflowHistory'
	| 'WorkerView'
	| 'AdvancedPermissions'
	| 'ApiKeyScopes'
	| 'EnforceMFA';

export type EnterpriseEditionFeatureValue = keyof Omit<FrontendSettings['enterprise'], 'projects'>;

export type InputPanel = {
	nodeName?: string;
	run?: number;
	branch?: number;
	data: {
		isEmpty: boolean;
	};
};

export type OutputPanel = {
	run?: number;
	branch?: number;
	data: {
		isEmpty: boolean;
	};
	editMode: {
		enabled: boolean;
		value: string;
	};
};

export type Draggable = {
	isDragging: boolean;
	type: string;
	data: string;
	dimensions: DOMRect | null;
	activeTarget: { id: string; stickyPosition: null | XYPosition } | null;
};

export type MainPanelType = 'regular' | 'dragless' | 'inputless' | 'unknown' | 'wide';

export type MainPanelDimensions = Record<
	MainPanelType,
	{
		relativeLeft: number;
		relativeRight: number;
		relativeWidth: number;
	}
>;

export interface LlmTokenUsageData {
	completionTokens: number;
	promptTokens: number;
	totalTokens: number;
	isEstimate: boolean;
}
