import type { NotificationOptions as ElementNotificationOptions } from 'element-plus';
import type {
	FrontendSettings,
	IUserManagementSettings,
	IVersionNotificationSettings,
	Role,
} from '@n8n/api-types';
import type { ILogInStatus } from '@/features/settings/users/users.types';
import type { IUsedCredential } from '@/features/credentials/credentials.types';
import type { Scope } from '@n8n/permissions';
import type { NodeCreatorTag, BinaryMetadata } from '@n8n/design-system';
import type {
	GenericValue,
	IConnections,
	IDataObject,
	INode,
	INodeIssues,
	INodeParameters,
	INodeTypeDescription,
	IPinData,
	IRunData,
	IWorkflowSettings as IWorkflowSettingsWorkflow,
	INodeListSearchItems,
	NodeParameterValueType,
	IDisplayOptions,
	FeatureFlags,
	ITelemetryTrackProperties,
	WorkflowSettings,
	WorkflowSettingsBinaryMode,
	INodeExecutionData,
	NodeConnectionType,
	StartNodeData,
	ITaskData,
	ISourceData,
	PublicInstalledPackage,
	IDestinationNode,
	AgentRequestQuery,
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
	TRIGGER_NODE_CREATOR_VIEW,
	REGULAR_NODE_CREATOR_VIEW,
	AI_OTHERS_NODE_CREATOR_VIEW,
	AI_UNCATEGORIZED_CATEGORY,
	AI_EVALUATION,
	HUMAN_IN_THE_LOOP_CATEGORY,
} from '@/app/constants';
import type { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import type { BulkCommand, Undoable } from '@/app/models/history';

import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';
import type { IconName } from '@n8n/design-system/src/components/N8nIcon/icons';
import type {
	BaseFolderItem,
	FolderListItem,
	ResourceParentFolder,
} from '@/features/core/folders/folders.types';
import type { WorkflowHistory } from '@n8n/rest-api-client/api/workflowHistory';

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

export interface IStartRunData {
	workflowData: WorkflowData;
	startNodes?: StartNodeData[];
	destinationNode?: IDestinationNode;
	runData?: IRunData;
	dirtyNodeNames?: string[];
	triggerToStartFrom?: {
		name: string;
		data?: ITaskData;
	};
	agentRequest?: {
		query: AgentRequestQuery;
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
	description?: string | null;
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
	activeVersionId: string | null;
	usedCredentials?: IUsedCredential[];
	meta?: WorkflowMetadata;
	parentFolder?: {
		id: string;
		name: string;
		parentFolderId: string | null;
		createdAt?: string;
		updatedAt?: string;
	};
	activeVersion?: WorkflowHistory | null;
	checksum?: string;
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
	description?: string;
	updatedAt: string;
	createdAt: string;
	active: boolean;
	activeVersionId: string | null;
	isArchived: boolean;
	homeProject?: ProjectSharingData;
	scopes?: Scope[];
	tags?: ITag[] | string[];
	sharedWithProjects?: ProjectSharingData[];
	readOnly: boolean;
	parentFolder?: ResourceParentFolder;
	settings?: Partial<IWorkflowSettings>;
	hasResolvableCredentials?: boolean;
};

export type VariableResource = BaseResource & {
	resourceType: 'variable';
	key?: string;
	value?: string;
	project?: { id: string; name: string };
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
	isGlobal?: boolean;
	isResolvable?: boolean;
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
	'nodes' | 'connections' | 'pinData' | 'usedCredentials' | 'meta'
> & {
	resource: 'workflow';
	description?: string;
	hasResolvableCredentials?: boolean;
};

export type WorkflowListResource = WorkflowListItem | FolderListItem;

// Identical to cli.Interfaces.ts
export interface IWorkflowShortResponse {
	id: string;
	name: string;
	active: boolean;
	activeVersionId: string | null;
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

export interface IShareWorkflowsPayload {
	shareWithIds: string[];
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
	binaryMode?: WorkflowSettingsBinaryMode;
	availableInMCP?: boolean;
}

export interface ITimeoutHMS {
	hours: number;
	minutes: number;
	seconds: number;
}

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
	tag?: NodeCreatorTag;
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
	items?: INodeCreateElement[];
	new?: boolean;
	hideActions?: boolean;
	actionsFilter?: (items: ActionTypeDescription[]) => ActionTypeDescription[];
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
	/**
	 * Whether to show a separator at the bottom of the expanded section
	 */
	showSeparator?: boolean;
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
		language?: string;
	};
	actionName?: string;
};

export interface SubcategorizedNodeTypes {
	[subcategory: string]: INodeCreateElement[];
}

export interface INodeMetadata {
	parametersLastUpdatedAt?: number;
	pinnedDataLastUpdatedAt?: number;
	pinnedDataLastRemovedAt?: number;
	pristine: boolean;
}

export interface NodeMetadataMap {
	[nodeName: string]: INodeMetadata;
}

export interface CommunityPackageMap {
	[name: string]: PublicInstalledPackage;
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

export interface TargetItem {
	nodeName: string;
	itemIndex: number;
	runIndex: number;
	outputIndex: number;
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
	| typeof AI_EVALUATION
	| typeof HUMAN_IN_THE_LOOP_CATEGORY;

export type NodeCreatorOpenSource =
	| ''
	| 'context_menu'
	| 'no_trigger_execution_tooltip'
	| 'plus_endpoint'
	| 'add_input_endpoint'
	| 'trigger_placeholder_button'
	| 'tab'
	| 'replace_node_action'
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
	active?: boolean;
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
	| 'undefined'
	| 'binary';

export type Schema = {
	type: SchemaType;
	key?: string;
	value: string | Schema[];
	path: string;
	binaryData?: BinaryMetadata;
};

export type NodeAuthenticationOption = {
	name: string;
	value: string;
	displayOptions?: IDisplayOptions;
};

export interface CloudPlanState {
	initialized: boolean;
	data: Cloud.PlanData | null;
	usage: InstanceUsage | null;
	loadingPlan: boolean;
}

export type CloudPlanAndUsageData = Cloud.PlanData & { usage: InstanceUsage };

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
	| 'evaluations'
	| 'ai-builder-sidebar'
	| 'ai-builder-canvas'
	| 'custom-roles'
	| 'main-sidebar'
	| 'chat-hub';

export type UTMCampaign =
	| 'upgrade-custom-data-filter'
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
	| 'upgrade-evaluations'
	| 'upgrade-builder'
	| 'upgrade-custom-roles'
	| 'upgrade-canvas-nav'
	| 'upgrade-main-sidebar';

export type AddedNode = {
	type: string;
	openDetail?: boolean;
	isAutoAdd?: boolean;
	positionOffset?: XYPosition;
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
	| 'WorkerView'
	| 'AdvancedPermissions'
	| 'ApiKeyScopes'
	| 'EnforceMFA'
	| 'Provisioning';

export type EnterpriseEditionFeatureValue = keyof Omit<FrontendSettings['enterprise'], 'projects'>;

export type Draggable = {
	isDragging: boolean;
	type: string;
	data: string;
	dimensions: DOMRect | null;
	activeTarget: { id: string; stickyPosition: null | XYPosition } | null;
};

export interface LlmTokenUsageData {
	completionTokens: number;
	promptTokens: number;
	totalTokens: number;
	isEstimate: boolean;
}

export interface WorkflowValidationIssue {
	node: string;
	type: string;
	value: string | string[];
}
