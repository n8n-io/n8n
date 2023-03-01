import { IExternalHooks } from '@/Interface';
import { IDataObject, INode, INodeTypeDescription } from 'n8n-workflow';
import Vue from 'vue';
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
} from '@/hooks/telemetry';

export interface ExternalHooks {
	parameterInput: {
		mount: Array<
			(meta: { inputFieldRef: { $el: HTMLElement }; parameter: { name: string } }) => void
		>;
	};
	nodeCreatorSearchBar: {
		mount: Array<(meta: { inputRef: HTMLElement }) => void>;
	};
	app: {
		mount: Array<(meta: {}) => void>;
	};
	nodeView: {
		mount: Array<(meta: {}) => void>;
		createNodeActiveChanged: Array<(meta: { source: string }) => void>;
		addNodeButton: Array<(meta: { nodeTypeName: string }) => void>;
	};
	main: {
		routeChange: Array<(meta: { to: Route; from: Route }) => void>;
	};
	credential: {
		saved: Array<(meta: UserSavedCredentialsEventData) => void>;
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
			(meta: { activeNode: INode; isEditingCredential: boolean; credentialType: string }) => void
		>;
	};
	credentialsList: {
		mounted: Array<(meta: {}) => void>;
		dialogVisibleChanged: Array<(meta: { dialogVisible: boolean }) => void>;
	};
	workflowSettings: {
		dialogVisibleChanged: Array<(meta: { dialogVisible: boolean }) => void>;
		saveSettings: Array<(meta: UpdatedWorkflowSettingsEventData) => void>;
	};
	dataDisplay: {
		onDocumentationUrlClick: Array<(meta: { nodeType: INodeTypeDescription }) => void>;
		nodeTypeChanged: Array<(meta: NodeTypeChangedEventData) => void>;
		nodeEditingFinished: Array<(meta: {}) => void>;
	};
	executionsList: {
		openDialog: Array<(meta: {}) => void>;
	};
	showMessage: {
		showError: Array<(meta: { title: string; message: string; errorMessage: string }) => void>;
	};
	expressionEdit: {
		itemSelected: Array<(meta: InsertedItemFromExpEditorEventData) => void>;
		dialogVisibleChanged: Array<(meta: ExpressionEditorEventsData) => void>;
	};
	nodeSettings: {
		valueChanged: Array<(meta: AuthenticationModalEventData) => void>;
		credentialSelected: Array<
			(meta: { updateInformation: { properties: { credentials: Record<string, string> } } }) => void
		>;
	};
	workflowRun: {
		runWorkflow: Array<(meta: ExecutionStartedEventData) => void>;
		runError: Array<(meta: { errorMessages: string[]; nodeName: string }) => void>;
	};
	runData: {
		displayModeChanged: Array<(meta: OutputModeChangedEventData) => void>;
	};
	pushConnection: {
		executionFinished: Array<(meta: ExecutionFinishedEventData) => void>;
	};
	node: {
		deleteNode: Array<(meta: NodeRemovedEventData) => void>;
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
	nodeCreateList: {
		destroyed: Array<(meta: {}) => void>;
		selectedTypeChanged: Array<(meta: { oldValue: string; newValue: string }) => void>;
		nodeFilterChanged: Array<
			(meta: {
				newValue: string;
				oldValue: string;
				filteredNodes: Array<{ name: string; key: string }>;
			}) => void
		>;
	};
}

declare global {
	interface Window {
		n8nExternalHooks?: Partial<ExternalHooks>;
	}
}

type GenericHooksType = Record<string, Record<string, Function[]>>;

export function extendExternalHooks(hooks: Partial<ExternalHooks>) {
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
