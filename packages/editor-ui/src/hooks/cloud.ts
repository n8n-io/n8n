import { useWebhooksStore } from '@/stores/webhooks';
import { hooksAddAdminIcon, hooksAddFakeDoorFeatures } from '@/hooks/utils';
import {
	getAuthenticationModalEventData,
	getExpressionEditorEventsData,
	getInsertedItemFromExpEditorEventData,
	getNodeTypeChangedEventData,
	getOpenWorkflowSettingsEventData,
	getOutputModeChangedEventData,
	getUpdatedWorkflowSettingsEventData,
	getUserSavedCredentialsEventData,
	hooksTelemetryIdentify,
	hooksTelemetryPage,
	hooksTelemetryTrack,
	getExecutionFinishedEventData,
	getNodeRemovedEventData,
	getNodeEditingFinishedEventData,
	getExecutionStartedEventData,
	AuthenticationModalEventData,
	ExpressionEditorEventsData,
	InsertedItemFromExpEditorEventData,
	NodeTypeChangedEventData,
	OutputModeChangedEventData,
	UpdatedWorkflowSettingsEventData,
	UserSavedCredentialsEventData,
	ExecutionFinishedEventData,
	NodeRemovedEventData,
	ExecutionStartedEventData,
} from '@/hooks/telemetry';
import { INode, INodeTypeDescription } from 'n8n-workflow';
import { useNDVStore } from '@/stores/ndv';
import { useWorkflowsStore } from '@/stores/workflows';
import {
	hooksGenerateNodesPanelEvent,
	hooksResetNodesPanelSession,
	nodesPanelSession,
} from '@/hooks/utils/hooksNodesPanel';
import type { Route } from 'vue-router/types/router';

const externalHooks = {
	parameterInput: {
		mount: [
			(meta: { inputFieldRef: { $el: HTMLElement }; parameter: { name: string } }) => {
				if (!meta.parameter || !meta.inputFieldRef) {
					return;
				}

				if (
					meta.inputFieldRef.$el &&
					(meta.parameter.name === 'resource' || meta.parameter.name === 'operation')
				) {
					const inputField = meta.inputFieldRef.$el.querySelector('input');
					if (inputField && inputField.classList && inputField.classList.value) {
						inputField.classList.value = inputField.classList.value + ' data-hj-allow';
					}
				}
			},
		],
	},
	nodeCreator: {
		searchBar: {
			mount: [
				(meta: { inputRef: HTMLElement }) => {
					if (!meta.inputRef) {
						return;
					}

					meta.inputRef.classList.value = meta.inputRef.classList.value + ' data-hj-allow';
				},
			],
		},
	},
	app: {
		mount: [
			() => {
				hooksAddAdminIcon();
			},
			() => {
				hooksAddFakeDoorFeatures();
			},
		],
	},
	nodeView: {
		mount: [
			() => {
				hooksTelemetryIdentify();
			},
			() => {
				hooksAddAdminIcon();
			},
		],
		createNodeActiveChanged: [
			(meta: { source: string }) => {
				hooksResetNodesPanelSession();
				const eventData = {
					eventName: 'User opened nodes panel',
					properties: {
						source: meta.source,
						nodes_panel_session_id: nodesPanelSession.sessionId,
					},
				};

				hooksTelemetryTrack(eventData);
				hooksTelemetryPage('Cloud instance', 'Nodes panel', eventData.properties);
			},
		],
		addNodeButton: [
			(meta: { nodeTypeName: string }) => {
				const eventData = {
					eventName: 'User added node to workflow canvas',
					properties: {
						node_type: meta.nodeTypeName.split('.')[1],
						nodes_panel_session_id: nodesPanelSession.sessionId,
					},
				};

				hooksTelemetryTrack(eventData);
			},
		],
	},
	main: {
		routeChange: [
			(meta: { to: Route; from: Route }) => {
				const splitPath = meta.to.path.split('/');
				if (meta.from.path !== '/' && splitPath[1] === 'workflow') {
					const eventData = {
						workflow_id: splitPath[2],
					};

					hooksTelemetryPage('Cloud instance', 'Workflow editor', eventData);
				}
			},
		],
	},
	credential: {
		saved: [
			(meta: UserSavedCredentialsEventData) => {
				hooksTelemetryTrack(getUserSavedCredentialsEventData(meta));
			},
		],
	},
	credentialsEdit: {
		credentialTypeChanged: [
			(meta: {
				newValue: string;
				setCredentialType: string;
				credentialType: string;
				editCredentials: string;
			}) => {
				if (meta.newValue) {
					const eventData = {
						eventName: 'User opened Credentials modal',
						properties: {
							source: meta.setCredentialType === meta.credentialType ? 'node' : 'primary_menu',
							new_credential: !meta.editCredentials,
							credential_type: meta.credentialType,
						},
					};

					hooksTelemetryTrack(eventData);
					hooksTelemetryPage('Cloud instance', 'Credentials modal', eventData.properties);
				}
			},
		],
		credentialModalOpened: [
			(meta: { activeNode: INode; isEditingCredential: boolean; credentialType: string }) => {
				const eventData = {
					eventName: 'User opened Credentials modal',
					properties: {
						source: meta.activeNode ? 'node' : 'primary_menu',
						new_credential: !meta.isEditingCredential,
						credential_type: meta.credentialType,
					},
				};

				hooksTelemetryTrack(eventData);
				hooksTelemetryPage('Cloud instance', 'Credentials modal', eventData.properties);
			},
		],
	},
	credentialsList: {
		mounted: [
			(meta) => {
				const store = useWebhooksStore();

				const eventData = {
					eventName: 'User opened global Credentials panel',
				};

				hooksTelemetryTrack(eventData);
				hooksTelemetryPage('Cloud instance', 'Credentials panel');
			},
		],
		dialogVisibleChanged: [
			function (meta) {
				if (meta.dialogVisible) {
					const eventData = {
						eventName: 'User opened global Credentials panel',
					};

					hooksTelemetryTrack(eventData);
					hooksTelemetryPage('Cloud instance', 'Credentials panel');
				}
			},
		],
	},
	workflowSettings: {
		dialogVisibleChanged: [
			(meta: { dialogVisible: boolean }) => {
				if (meta.dialogVisible) {
					hooksTelemetryTrack(getOpenWorkflowSettingsEventData());
				}
			},
		],
		saveSettings: [
			(meta: UpdatedWorkflowSettingsEventData) => {
				hooksTelemetryTrack(getUpdatedWorkflowSettingsEventData(meta));
			},
		],
	},
	dataDisplay: {
		onDocumentationUrlClick: [
			(meta: { nodeType: INodeTypeDescription; documentationUrl: string }) => {
				const eventData = {
					eventName: 'User clicked node modal docs link',
					properties: {
						node_type: meta.nodeType.name.split('.')[1],
						docs_link: meta.documentationUrl,
					},
				};

				hooksTelemetryTrack(eventData);
			},
		],
		nodeTypeChanged: [
			(meta: NodeTypeChangedEventData) => {
				const store = useNDVStore();

				hooksTelemetryTrack(getNodeTypeChangedEventData(meta));
				hooksTelemetryPage('Cloud instance', 'Node modal', {
					node: store.activeNode?.name,
				});
			},
		],
		nodeEditingFinished: [
			() => {
				const ndvStore = useNDVStore();
				const workflowsStore = useWorkflowsStore();

				const eventData = getNodeEditingFinishedEventData(ndvStore.activeNode);
				if (eventData) {
					eventData.properties.workflow_id = workflowsStore.workflowId;
				}

				if (eventData) {
					hooksTelemetryTrack(eventData);
				}
			},
		],
	},
	executionsList: {
		openDialog: [
			function () {
				const eventData = {
					eventName: 'User opened Executions log',
				};

				hooksTelemetryTrack(eventData);
				hooksTelemetryPage('Cloud instance', 'Executions log');
			},
		],
	},
	showMessage: {
		showError: [
			function (meta) {
				const store = useWebhooksStore();

				const eventData = {
					eventName: 'Instance FE emitted error',
					properties: {
						error_title: meta.title,
						error_description: meta.message,
						error_message: meta.errorMessage,
					},
				};

				hooksTelemetryTrack(eventData);
			},
		],
	},
	expressionEdit: {
		itemSelected: [
			(meta: InsertedItemFromExpEditorEventData) => {
				const eventData = getInsertedItemFromExpEditorEventData(meta);

				if (meta.selectedItem.variable.startsWith('Object.keys')) {
					eventData.properties.variable_type = 'Keys';
				} else if (meta.selectedItem.variable.startsWith('Object.values')) {
					eventData.properties.variable_type = 'Values';
				} else {
					eventData.properties.variable_type = 'Raw value';
				}

				hooksTelemetryTrack(eventData);
			},
		],
		dialogVisibleChanged: [
			(meta: ExpressionEditorEventsData) => {
				const currentValue = meta.value.slice(1);
				let isValueDefault = false;

				switch (typeof meta.parameter.default) {
					case 'boolean':
						isValueDefault =
							(currentValue === 'true' && meta.parameter.default) ||
							(currentValue === 'false' && !meta.parameter.default);
						break;
					case 'string':
						isValueDefault = currentValue === meta.parameter.default;
						break;
					case 'number':
						isValueDefault = currentValue === meta.parameter.default.toString();
						break;
				}

				const eventData = getExpressionEditorEventsData(meta, isValueDefault);

				hooksTelemetryTrack(eventData);
			},
		],
	},
	nodeSettings: {
		valueChanged: [
			(meta: AuthenticationModalEventData) => {
				if (meta.parameterPath !== 'authentication') {
					return;
				}

				const eventData = getAuthenticationModalEventData(meta);

				hooksTelemetryTrack(eventData);
			},
		],
		credentialSelected: [
			function (meta) {
				const creds = Object.keys(meta.updateInformation.properties.credentials || {});
				if (creds.length < 1) {
					return;
				}
				const eventData = {
					eventName: 'User selected credential from node modal',
					properties: {
						credential_name: meta.updateInformation.properties.credentials[creds[0]],
						credential_type: creds[0],
					},
				};

				hooksTelemetryTrack(eventData);
			},
		],
	},
	workflowRun: {
		runWorkflow: [
			(meta: ExecutionStartedEventData) => {
				const eventData = getExecutionStartedEventData(meta);

				hooksTelemetryTrack(eventData);
			},
		],
		runError: [
			function (meta) {
				const store = useWebhooksStore();

				const eventData = {
					eventName: meta.nodeName
						? 'Node execution finished'
						: 'Manual workflow execution finished',
					properties: {
						preflight: 'true',
						status: 'failed',
						error_message: meta.errorMessages.join('<br />&nbsp;&nbsp;- '),
						error_timestamp: new Date(),
						node_name: meta.nodeName,
					},
				};

				hooksTelemetryTrack(eventData);
			},
		],
	},
	runData: {
		displayModeChanged: [
			(meta: OutputModeChangedEventData) => {
				const eventData = getOutputModeChangedEventData(meta);

				hooksTelemetryTrack(eventData);
			},
		],
	},
	pushConnection: {
		executionFinished: [
			(meta: ExecutionFinishedEventData) => {
				const eventData = getExecutionFinishedEventData(meta);

				hooksTelemetryTrack(eventData);
			},
		],
	},
	node: {
		deleteNode: [
			(meta: NodeRemovedEventData) => {
				const eventData = getNodeRemovedEventData(meta);

				hooksTelemetryTrack(eventData);
			},
		],
	},
	workflow: {
		activeChange: [
			function (meta) {
				const eventData = {
					eventName: (meta.active && 'User activated workflow') || 'User deactivated workflow',
					properties: {
						workflow_id: meta.workflowId,
						source: 'workflow_modal',
					},
				};

				hooksTelemetryTrack(eventData);
			},
		],
		activeChangeCurrent: [
			(meta: { workflowId: string; active: boolean }) => {
				const store = useWorkflowsStore();

				const eventData = {
					eventName: (meta.active && 'User activated workflow') || 'User deactivated workflow',
					properties: {
						source: 'main nav',
						workflow_id: meta.workflowId,
						workflow_name: store.workflowName,
						workflow_nodes: store.allNodes.map((n) => n.type.split('.')[1]),
					},
				};

				hooksTelemetryTrack(eventData);
			},
		],
		afterUpdate: [
			function (meta) {
				const eventData = {
					eventName: 'User saved workflow',
					properties: {
						workflow_id: meta.workflowData.id,
						workflow_name: meta.workflowData.workflowName,
						workflow_nodes: meta.workflowData.nodes.map((n) => n.type.split('.')[1]),
					},
				};

				hooksTelemetryTrack(eventData);
			},
		],
	},
	execution: {
		open: [
			(meta: { workflowId: string; workflowName: string; executionId: string }) => {
				const eventData = {
					eventName: 'User opened read-only execution',
					properties: {
						workflow_id: meta.workflowId,
						workflow_name: meta.workflowName,
						execution_id: meta.executionId,
					},
				};

				hooksTelemetryTrack(eventData);
			},
		],
	},
	nodeCreateList: {
		destroyed: [
			() => {
				if (
					nodesPanelSession.data.nodeFilter.length > 0 &&
					nodesPanelSession.data.nodeFilter !== ''
				) {
					const eventData = hooksGenerateNodesPanelEvent();

					hooksTelemetryTrack(eventData);
				}
			},
		],
		selectedTypeChanged: [
			function (meta) {
				const eventData = {
					eventName: 'User changed nodes panel filter',
					properties: {
						old_filter: meta.oldValue,
						new_filter: meta.newValue,
						nodes_panel_session_id: nodesPanelSession.sessionId,
					},
				};
				nodesPanelSession.data.filterMode = meta.newValue;

				hooksTelemetryTrack(eventData);
			},
		],
		nodeFilterChanged: [
			function (meta) {
				if (meta.newValue.length === 0 && nodesPanelSession.data.nodeFilter.length > 0) {
					const eventData = hooksGenerateNodesPanelEvent();

					hooksTelemetryTrack(eventData);
				}

				if (meta.newValue.length > meta.oldValue.length) {
					nodesPanelSession.data.nodeFilter = meta.newValue;
					nodesPanelSession.data.resultsNodes = meta.filteredNodes.map((node) => {
						if (node.name) {
							return node.name.split('.')[1];
						} else if (node.key) {
							return node.key.split('.')[1];
						}
						return '';
					});
				}
			},
		],
	},
};

window.n8nExternalHooks = window.n8nExternalHooks || {};

Object.keys(externalHooks).forEach((hookKey) => {
	window.n8nExternalHooks[hookKey] = window.n8nExternalHooks[hookKey] || {};
	Object.keys(externalHooks[hookKey]).forEach((hookMethod) => {
		window.n8nExternalHooks[hookKey][hookMethod] =
			window.n8nExternalHooks[hookKey][hookMethod] || [];
		window.n8nExternalHooks[hookKey][hookMethod].push(...externalHooks[hookKey][hookMethod]);
	});
});
