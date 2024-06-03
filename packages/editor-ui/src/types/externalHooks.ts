import type { N8nInput } from 'n8n-design-system';
import type {
	IConnections,
	INodeProperties,
	INodeTypeDescription,
	ITelemetryTrackProperties,
	NodeParameterValueType,
} from 'n8n-workflow';
import type { RouteLocation } from 'vue-router';
import type {
	AuthenticationModalEventData,
	ExecutionFinishedEventData,
	ExecutionStartedEventData,
	ExpressionEditorEventsData,
	InsertedItemFromExpEditorEventData,
	NodeRemovedEventData,
	NodeTypeChangedEventData,
	OutputModeChangedEventData,
	UpdatedWorkflowSettingsEventData,
	UserSavedCredentialsEventData,
} from '@/hooks/segment';
import type {
	INodeCreateElement,
	INodeUi,
	INodeUpdatePropertiesInformation,
	IPersonalizationLatestVersion,
	IWorkflowDb,
	IWorkflowTemplateNode,
	NodeFilterType,
} from '@/Interface';
import type { ComponentPublicInstance } from 'vue/dist/vue';
import type { useWebhooksStore } from '@/stores/webhooks.store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ExternalHooksMethod<T = any, R = void> {
	(store: ReturnType<typeof useWebhooksStore>, metadata: T): R | Promise<R>;
}

export interface ExternalHooksGenericContext {
	[key: string]: ExternalHooksMethod[];
}

export interface ExternalHooks {
	parameterInput: {
		mount: Array<
			ExternalHooksMethod<{
				inputFieldRef?: InstanceType<typeof N8nInput>;
				parameter?: INodeProperties;
			}>
		>;
		modeSwitch: Array<ExternalHooksMethod<ITelemetryTrackProperties>>;
		updated: Array<ExternalHooksMethod<{ remoteParameterOptions: NodeListOf<Element> }>>;
	};
	nodeCreatorSearchBar: {
		mount: Array<ExternalHooksMethod<{ inputRef: HTMLElement | null }>>;
	};
	app: {
		mount: Array<ExternalHooksMethod<{}>>;
	};
	nodeView: {
		mount: Array<ExternalHooksMethod<{}>>;
		createNodeActiveChanged: Array<
			ExternalHooksMethod<{
				source?: string;
				mode: string;
				createNodeActive: boolean;
			}>
		>;
		addNodeButton: Array<ExternalHooksMethod<{ nodeTypeName: string }>>;
		onRunNode: Array<ExternalHooksMethod<ITelemetryTrackProperties>>;
		onRunWorkflow: Array<ExternalHooksMethod<ITelemetryTrackProperties>>;
		onOpenChat: Array<ExternalHooksMethod<ITelemetryTrackProperties>>;
	};
	main: {
		routeChange: Array<ExternalHooksMethod<{ to: RouteLocation; from: RouteLocation }>>;
	};
	credential: {
		saved: Array<ExternalHooksMethod<UserSavedCredentialsEventData>>;
	};
	copyInput: {
		mounted: Array<ExternalHooksMethod<{ copyInputValueRef: HTMLElement }>>;
	};
	credentialsEdit: {
		credentialTypeChanged: Array<
			ExternalHooksMethod<{
				newValue: string;
				setCredentialType: string;
				credentialType: string;
				editCredentials: string;
			}>
		>;
		credentialModalOpened: Array<
			ExternalHooksMethod<{
				activeNode: INodeUi | null;
				isEditingCredential: boolean;
				credentialType: string | null;
			}>
		>;
	};
	credentialsList: {
		mounted: Array<ExternalHooksMethod<{ tableRef: ComponentPublicInstance }>>;
		dialogVisibleChanged: Array<ExternalHooksMethod<{ dialogVisible: boolean }>>;
	};
	credentialsSelectModal: {
		openCredentialType: Array<ExternalHooksMethod<ITelemetryTrackProperties>>;
	};
	credentialEdit: {
		saveCredential: Array<ExternalHooksMethod<ITelemetryTrackProperties>>;
	};
	workflowSettings: {
		dialogVisibleChanged: Array<ExternalHooksMethod<{ dialogVisible: boolean }>>;
		saveSettings: Array<ExternalHooksMethod<UpdatedWorkflowSettingsEventData>>;
	};
	dataDisplay: {
		onDocumentationUrlClick: Array<
			ExternalHooksMethod<{
				nodeType: INodeTypeDescription;
				documentationUrl: string;
			}>
		>;
		nodeTypeChanged: Array<ExternalHooksMethod<NodeTypeChangedEventData>>;
		nodeEditingFinished: Array<ExternalHooksMethod<{}>>;
	};
	executionsList: {
		created: Array<
			ExternalHooksMethod<{ filtersRef: HTMLElement; tableRef: ComponentPublicInstance }>
		>;
		openDialog: Array<ExternalHooksMethod<{}>>;
	};
	showMessage: {
		showError: Array<
			ExternalHooksMethod<{ title: string; message?: string; errorMessage: string }>
		>;
	};
	expressionEdit: {
		itemSelected: Array<ExternalHooksMethod<InsertedItemFromExpEditorEventData>>;
		dialogVisibleChanged: Array<ExternalHooksMethod<ExpressionEditorEventsData>>;
		closeDialog: Array<ExternalHooksMethod<ITelemetryTrackProperties>>;
		mounted: Array<
			ExternalHooksMethod<{
				expressionInputRef: HTMLElement;
				expressionOutputRef: HTMLElement;
			}>
		>;
	};
	nodeSettings: {
		valueChanged: Array<ExternalHooksMethod<AuthenticationModalEventData>>;
		credentialSelected: Array<
			ExternalHooksMethod<{
				updateInformation: INodeUpdatePropertiesInformation;
			}>
		>;
	};
	workflowRun: {
		runWorkflow: Array<ExternalHooksMethod<ExecutionStartedEventData>>;
		runError: Array<ExternalHooksMethod<{ errorMessages: string[]; nodeName: string | undefined }>>;
	};
	runData: {
		updated: Array<ExternalHooksMethod<{ elements: HTMLElement[] }>>;
		onTogglePinData: Array<ExternalHooksMethod<ITelemetryTrackProperties>>;
		onDataPinningSuccess: Array<ExternalHooksMethod<ITelemetryTrackProperties>>;
		displayModeChanged: Array<ExternalHooksMethod<OutputModeChangedEventData>>;
	};
	pushConnection: {
		executionFinished: Array<ExternalHooksMethod<ExecutionFinishedEventData>>;
	};
	node: {
		deleteNode: Array<ExternalHooksMethod<NodeRemovedEventData>>;
	};
	nodeExecuteButton: {
		onClick: Array<ExternalHooksMethod<ITelemetryTrackProperties>>;
	};
	workflow: {
		activeChange: Array<ExternalHooksMethod<{ active: boolean; workflowId: string }>>;
		activeChangeCurrent: Array<ExternalHooksMethod<{ workflowId: string; active: boolean }>>;
		afterUpdate: Array<ExternalHooksMethod<{ workflowData: IWorkflowDb }>>;
		open: Array<ExternalHooksMethod<{ workflowId: string; workflowName: string }>>;
	};
	execution: {
		open: Array<
			ExternalHooksMethod<{ workflowId: string; workflowName: string; executionId: string }>
		>;
	};
	userInfo: {
		mounted: Array<ExternalHooksMethod<{ userInfoRef: HTMLElement }>>;
	};
	variableSelectorItem: {
		mounted: Array<ExternalHooksMethod<{ variableSelectorItemRef: HTMLElement }>>;
	};
	mainSidebar: {
		mounted: Array<ExternalHooksMethod<{ userRef: Element }>>;
	};
	nodeCreateList: {
		destroyed: Array<ExternalHooksMethod<{}>>;
		addAction: Array<
			ExternalHooksMethod<{
				node_type?: string;
				action: string;
				resource: NodeParameterValueType;
			}>
		>;
		selectedTypeChanged: Array<ExternalHooksMethod<{ oldValue: string; newValue: string }>>;
		filteredNodeTypesComputed: Array<
			ExternalHooksMethod<{
				nodeFilter: string;
				result: INodeCreateElement[];
				selectedType: NodeFilterType;
			}>
		>;
		nodeFilterChanged: Array<
			ExternalHooksMethod<{
				oldValue: string;
				newValue: string;
				selectedType: NodeFilterType;
				filteredNodes: INodeCreateElement[];
			}>
		>;
		onActionsCustmAPIClicked: Array<ExternalHooksMethod<{ app_identifier?: string }>>;
		onViewActions: Array<ExternalHooksMethod<ITelemetryTrackProperties>>;
	};
	personalizationModal: {
		onSubmit: Array<ExternalHooksMethod<IPersonalizationLatestVersion>>;
	};
	settingsPersonalView: {
		mounted: Array<ExternalHooksMethod<{ userRef: HTMLElement }>>;
	};
	workflowOpen: {
		mounted: Array<ExternalHooksMethod<{ tableRef: ComponentPublicInstance }>>;
	};
	workflowActivate: {
		updateWorkflowActivation: Array<ExternalHooksMethod<ITelemetryTrackProperties>>;
	};
	runDataTable: {
		onDragEnd: Array<ExternalHooksMethod<ITelemetryTrackProperties>>;
	};
	runDataJson: {
		onDragEnd: Array<ExternalHooksMethod<ITelemetryTrackProperties>>;
	};
	sticky: {
		mounted: Array<ExternalHooksMethod<{ stickyRef: HTMLElement }>>;
	};
	telemetry: {
		currentUserIdChanged: Array<ExternalHooksMethod<{}>>;
	};
	settingsCommunityNodesView: {
		openInstallModal: Array<ExternalHooksMethod<ITelemetryTrackProperties>>;
	};
	templatesWorkflowView: {
		openWorkflow: Array<ExternalHooksMethod<ITelemetryTrackProperties>>;
	};
	templatesCollectionView: {
		onUseWorkflow: Array<ExternalHooksMethod<ITelemetryTrackProperties>>;
	};
	template: {
		requested: Array<ExternalHooksMethod<{ templateId: string }>>;
		open: Array<
			ExternalHooksMethod<{
				templateId: string;
				templateName: string;
				workflow: { nodes: INodeUi[] | IWorkflowTemplateNode[]; connections: IConnections };
			}>
		>;
	};
}

export type ExternalHooksKey = {
	[K in keyof ExternalHooks]: `${K}.${Extract<keyof ExternalHooks[K], string>}`;
}[keyof ExternalHooks];

type ExtractHookMethodArray<P extends keyof ExternalHooks, S extends keyof ExternalHooks[P]> =
	ExternalHooks[P][S] extends Array<infer U> ? U : never;

type ExtractHookMethodFunction<T> = T extends ExternalHooksMethod ? T : never;

export type ExtractExternalHooksMethodPayloadFromKey<T extends ExternalHooksKey> =
	T extends `${infer P}.${infer S}`
		? P extends keyof ExternalHooks
			? S extends keyof ExternalHooks[P]
				? Parameters<ExtractHookMethodFunction<ExtractHookMethodArray<P, S>>>[1]
				: never
			: never
		: never;
