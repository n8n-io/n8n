import {
	IExternalHooks,
	INodeCreateElement,
	INodeFilterType,
	INodeUi,
	INodeUpdatePropertiesInformation,
	IPersonalizationLatestVersion,
} from '@/Interface';
import { IDataObject, INode, INodeTypeDescription, ITelemetryTrackProperties } from 'n8n-workflow';
import Vue, { ComponentPublicInstance, VueConstructor } from 'vue';
import { Route } from 'vue-router/types/router';
import {
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
import { PartialDeep } from 'type-fest';

export interface ExternalHooks {
	parameterInput: {
		mount: Array<
			(meta: { inputFieldRef?: InstanceType<typeof Vue>; parameter: { name: string } }) => void
		>;
		modeSwitch: Array<(meta: ITelemetryTrackProperties) => void>;
		updated: Array<(meta: { remoteParameterOptions: NodeListOf<Element> }) => void>;
	};
	nodeCreatorSearchBar: {
		mount: Array<(meta: { inputRef: HTMLElement | null }) => void>;
	};
	app: {
		mount: Array<(meta: {}) => void>;
	};
	nodeView: {
		mount: Array<(meta: {}) => void>;
		createNodeActiveChanged: Array<(meta: { source: string }) => void>;
		addNodeButton: Array<(meta: { nodeTypeName: string }) => void>;
		onRunNode: Array<(meta: ITelemetryTrackProperties) => void>;
		onRunWorkflow: Array<(meta: ITelemetryTrackProperties) => void>;
	};
	main: {
		routeChange: Array<(meta: { to: Route; from: Route }) => void>;
	};
	credential: {
		saved: Array<(meta: UserSavedCredentialsEventData) => void>;
	};
	copyInput: {
		mounted: Array<(meta: { copyInputValueRef: HTMLElement }) => void>;
	};
	credentialsEdit: {
		credentialTypeChanged: Array<
			(meta: {
				newValue: string;
				setCredentialType: string;
				credentialType: string;
				editCredentials: string;
			}) => void
		>;
		credentialModalOpened: Array<
			(meta: {
				activeNode: INodeUi | null;
				isEditingCredential: boolean;
				credentialType: string | null;
			}) => void
		>;
	};
	credentialsList: {
		mounted: Array<(meta: { tableRef: ComponentPublicInstance }) => void>;
		dialogVisibleChanged: Array<(meta: { dialogVisible: boolean }) => void>;
	};
	credentialsSelectModal: {
		openCredentialType: Array<(meta: ITelemetryTrackProperties) => void>;
	};
	credentialEdit: {
		saveCredential: Array<(meta: ITelemetryTrackProperties) => void>;
	};
	workflowSettings: {
		dialogVisibleChanged: Array<(meta: { dialogVisible: boolean }) => void>;
		saveSettings: Array<(meta: UpdatedWorkflowSettingsEventData) => void>;
	};
	dataDisplay: {
		onDocumentationUrlClick: Array<
			(meta: { nodeType: INodeTypeDescription; documentationUrl: string }) => void
		>;
		nodeTypeChanged: Array<(meta: NodeTypeChangedEventData) => void>;
		nodeEditingFinished: Array<(meta: {}) => void>;
	};
	executionsList: {
		created: Array<(meta: { filtersRef: HTMLElement; tableRef: ComponentPublicInstance }) => void>;
		openDialog: Array<(meta: {}) => void>;
	};
	showMessage: {
		showError: Array<(meta: { title: string; message?: string; errorMessage: string }) => void>;
	};
	expressionEdit: {
		itemSelected: Array<(meta: InsertedItemFromExpEditorEventData) => void>;
		dialogVisibleChanged: Array<(meta: ExpressionEditorEventsData) => void>;
		closeDialog: Array<(meta: ITelemetryTrackProperties) => void>;
		mounted: Array<
			(meta: { expressionInputRef: HTMLElement; expressionOutputRef: HTMLElement }) => void
		>;
	};
	nodeSettings: {
		valueChanged: Array<(meta: AuthenticationModalEventData) => void>;
		credentialSelected: Array<
			(meta: { updateInformation: INodeUpdatePropertiesInformation }) => void
		>;
	};
	workflowRun: {
		runWorkflow: Array<(meta: ExecutionStartedEventData) => void>;
		runError: Array<(meta: { errorMessages: string[]; nodeName: string }) => void>;
	};
	runData: {
		updated: Array<(meta: { elements: HTMLElement[] }) => void>;
		onTogglePinData: Array<(meta: ITelemetryTrackProperties) => void>;
		onDataPinningSuccess: Array<(meta: ITelemetryTrackProperties) => void>;
		displayModeChanged: Array<(meta: OutputModeChangedEventData) => void>;
	};
	pushConnection: {
		executionFinished: Array<(meta: ExecutionFinishedEventData) => void>;
	};
	node: {
		deleteNode: Array<(meta: NodeRemovedEventData) => void>;
	};
	nodeExecuteButton: {
		onClick: Array<(meta: ITelemetryTrackProperties) => void>;
	};
	workflow: {
		activeChange: Array<(meta: { active: boolean; workflowId: string }) => void>;
		activeChangeCurrent: Array<(meta: { workflowId: string; active: boolean }) => void>;
		afterUpdate: Array<
			(meta: { workflowData: { id: string; workflowName: string; nodes: INode[] } }) => void
		>;
	};
	execution: {
		open: Array<(meta: { workflowId: string; workflowName: string; executionId: string }) => void>;
	};
	userInfo: {
		mounted: Array<(meta: { userInfoRef: HTMLElement }) => void>;
	};
	variableSelectorItem: {
		mounted: Array<(meta: { variableSelectorItemRef: HTMLElement }) => void>;
	};
	mainSidebar: {
		mounted: Array<(meta: { userRef: Element }) => void>;
	};
	nodeCreateList: {
		destroyed: Array<(meta: {}) => void>;
		selectedTypeChanged: Array<(meta: { oldValue: string; newValue: string }) => void>;
		filteredNodeTypesComputed: Array<
			(meta: {
				nodeFilter: string;
				result: INodeCreateElement[];
				selectedType: INodeFilterType;
			}) => void
		>;
		nodeFilterChanged: Array<
			(meta: {
				oldValue: string;
				newValue: string;
				selectedType: INodeFilterType;
				filteredNodes: INodeCreateElement[];
			}) => void
		>;
		onActionsCustmAPIClicked: Array<(meta: { app_identifier?: string }) => void>;
		onViewActions: Array<(meta: ITelemetryTrackProperties) => void>;
	};
	personalizationModal: {
		onSubmit: Array<(meta: IPersonalizationLatestVersion) => void>;
	};
	settingsPersonalView: {
		mounted: Array<(meta: { userRef: HTMLElement }) => void>;
	};
	workflowOpen: {
		mounted: Array<(meta: { tableRef: ComponentPublicInstance }) => void>;
	};
	workflowActivate: {
		updateWorkflowActivation: Array<(meta: ITelemetryTrackProperties) => void>;
	};
	runDataTable: {
		onDragEnd: Array<(meta: ITelemetryTrackProperties) => void>;
	};
	sticky: {
		mounted: Array<(meta: { stickyRef: HTMLElement }) => void>;
	};
	telemetry: {
		currentUserIdChanged: Array<() => void>;
	};
	templatesWorkflowView: {
		openWorkflow: Array<(meta: ITelemetryTrackProperties) => void>;
	};
	templatesCollectionView: {
		onUseWorkflow: Array<(meta: ITelemetryTrackProperties) => void>;
	};
}

declare global {
	interface Window {
		n8nExternalHooks?: PartialDeep<ExternalHooks>;
	}
}

type GenericHooksType = Record<string, Record<string, Function[]>>;

export function extendExternalHooks(hooks: PartialDeep<ExternalHooks>) {
	if (window.n8nExternalHooks === undefined) {
		window.n8nExternalHooks = {};
	}

	for (const resource of Object.keys(hooks)) {
		if ((window.n8nExternalHooks as GenericHooksType)[resource] === undefined) {
			(window.n8nExternalHooks as GenericHooksType)[resource] = {};
		}

		const context = hooks[resource as keyof ExternalHooks] as Record<string, Function[]>;
		for (const operator of Object.keys(context)) {
			if ((window.n8nExternalHooks as GenericHooksType)[resource][operator] === undefined) {
				(window.n8nExternalHooks as GenericHooksType)[resource][operator] = [];
			}

			(window.n8nExternalHooks as GenericHooksType)[resource][operator].push(...context[operator]);
		}
	}
}

export async function runExternalHook(eventName: string, metadata?: IDataObject) {
	if (!window.n8nExternalHooks) {
		return;
	}

	const [resource, operator] = eventName.split('.') as [
		keyof ExternalHooks,
		keyof ExternalHooks[keyof ExternalHooks],
	];

	if (window.n8nExternalHooks[resource]?.[operator]) {
		const hookMethods = window.n8nExternalHooks[resource]![operator] as Function[];

		for (const hookMethod of hookMethods) {
			await hookMethod(metadata as IDataObject);
		}
	}
}

export const externalHooks = Vue.extend({
	methods: {
		$externalHooks(): IExternalHooks {
			return {
				run: async (eventName: string, metadata?: IDataObject): Promise<void> => {
					await runExternalHook.call(this, eventName, metadata);
				},
			};
		},
	},
});
