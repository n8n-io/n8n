
import Vue from 'vue';
import Vuex from 'vuex';

import { PLACEHOLDER_EMPTY_WORKFLOW_ID, DEFAULT_NODETYPE_VERSION } from '@/constants';

import {
	IConnection,
	IConnections,
	IDataObject,
	INodeConnections,
	INodeIssueData,
	INodeTypeDescription,
	IRunData,
	ITaskData,
	IWorkflowSettings,
} from 'n8n-workflow';

import {
	IExecutionResponse,
	IExecutionsCurrentSummaryExtended,
	IRootState,
	IMenuItem,
	INodeUi,
	INodeUpdatePropertiesInformation,
	IPushDataExecutionFinished,
	IPushDataNodeExecuteAfter,
	IUpdateInformation,
	IWorkflowDb,
	XYPosition,
	IRestApiContext,
} from './Interface';

import credentials from './modules/credentials';
import settings from './modules/settings';
import tags from './modules/tags';
import ui from './modules/ui';
import users from './modules/users';
import workflows from './modules/workflows';
import versions from './modules/versions';
import templates from './modules/templates';

Vue.use(Vuex);

const state: IRootState = {
	activeExecutions: [],
	activeWorkflows: [],
	activeActions: [],
	activeNode: null,
	activeCredentialType: null,
	// @ts-ignore
	baseUrl: process.env.VUE_APP_URL_BASE_API ? process.env.VUE_APP_URL_BASE_API : (window.BASE_PATH === '/%BASE_PATH%/' ? '/' : window.BASE_PATH),
	defaultLocale: 'en',
	endpointWebhook: 'webhook',
	endpointWebhookTest: 'webhook-test',
	executionId: null,
	executingNode: '',
	executionWaitingForWebhook: false,
	pushConnectionActive: true,
	saveDataErrorExecution: 'all',
	saveDataSuccessExecution: 'all',
	saveManualExecutions: false,
	timezone: 'America/New_York',
	stateIsDirty: false,
	executionTimeout: -1,
	maxExecutionTimeout: Number.MAX_SAFE_INTEGER,
	versionCli: '0.0.0',
	oauthCallbackUrls: {},
	n8nMetadata: {},
	workflowExecutionData: null,
	lastSelectedNode: null,
	lastSelectedNodeOutputIndex: null,
	nodeIndex: [],
	nodeTypes: [],
	nodeViewOffsetPosition: [0, 0],
	nodeViewMoveInProgress: false,
	selectedNodes: [],
	sessionId: Math.random().toString(36).substring(2, 15),
	urlBaseWebhook: 'http://localhost:5678/',
	workflow: {
		id: PLACEHOLDER_EMPTY_WORKFLOW_ID,
		name: '',
		active: false,
		createdAt: -1,
		updatedAt: -1,
		connections: {},
		nodes: [],
		settings: {},
		tags: [],
	},
	sidebarMenuItems: [],
	instanceId: '',
};

const modules = {
	credentials,
	tags,
	settings,
	templates,
	workflows,
	versions,
	users,
	ui,
};

export const store = new Vuex.Store({
	strict: process.env.NODE_ENV !== 'production',
	modules,
	state,
	mutations: {
		// Active Actions
		addActiveAction (state, action: string) {
			if (!state.activeActions.includes(action)) {
				state.activeActions.push(action);
			}
		},

		removeActiveAction (state, action: string) {
			const actionIndex = state.activeActions.indexOf(action);
			if (actionIndex !== -1) {
				state.activeActions.splice(actionIndex, 1);
			}
		},

		// Active Executions
		addActiveExecution (state, newActiveExecution: IExecutionsCurrentSummaryExtended) {
			// Check if the execution exists already
			const activeExecution = state.activeExecutions.find(execution => {
				return execution.id === newActiveExecution.id;
			});

			if (activeExecution !== undefined) {
				// Exists already so no need to add it again
				if (activeExecution.workflowName === undefined) {
					activeExecution.workflowName = newActiveExecution.workflowName;
				}
				return;
			}

			state.activeExecutions.unshift(newActiveExecution);
		},
		finishActiveExecution (state, finishedActiveExecution: IPushDataExecutionFinished) {
			// Find the execution to set to finished
			const activeExecution = state.activeExecutions.find(execution => {
				return execution.id === finishedActiveExecution.executionId;
			});

			if (activeExecution === undefined) {
				// The execution could not be found
				return;
			}

			if (finishedActiveExecution.executionId !== undefined) {
				Vue.set(activeExecution, 'id', finishedActiveExecution.executionId);
			}

			Vue.set(activeExecution, 'finished', finishedActiveExecution.data.finished);
			Vue.set(activeExecution, 'stoppedAt', finishedActiveExecution.data.stoppedAt);
		},
		setActiveExecutions (state, newActiveExecutions: IExecutionsCurrentSummaryExtended[]) {
			Vue.set(state, 'activeExecutions', newActiveExecutions);
		},

		// Active Workflows
		setActiveWorkflows (state, newActiveWorkflows: string[]) {
			state.activeWorkflows = newActiveWorkflows;
		},
		setWorkflowActive (state, workflowId: string) {
			state.stateIsDirty = false;
			const index = state.activeWorkflows.indexOf(workflowId);
			if (index === -1) {
				state.activeWorkflows.push(workflowId);
			}
		},
		setWorkflowInactive (state, workflowId: string) {
			const index = state.activeWorkflows.indexOf(workflowId);
			if (index !== -1) {
				state.selectedNodes.splice(index, 1);
			}
		},
		// Set state condition dirty or not
		// ** Dirty: if current workflow state has been synchronized with database AKA has it been saved
		setStateDirty (state, dirty : boolean) {
			state.stateIsDirty = dirty;
		},

		// Selected Nodes
		addSelectedNode (state, node: INodeUi) {
			state.selectedNodes.push(node);
		},
		removeNodeFromSelection (state, node: INodeUi) {
			let index;
			for (index in state.selectedNodes) {
				if (state.selectedNodes[index].name === node.name) {
					state.selectedNodes.splice(parseInt(index, 10), 1);
					break;
				}
			}
		},
		resetSelectedNodes (state) {
			Vue.set(state, 'selectedNodes', []);
		},

		// Active
		setActive (state, newActive: boolean) {
			state.workflow.active = newActive;
		},

		// Connections
		addConnection (state, data) {
			if (data.connection.length !== 2) {
				// All connections need two entries
				// TODO: Check if there is an error or whatever that is supposed to be returned
				return;
			}

			if (data.setStateDirty === true) {
				state.stateIsDirty = true;
			}

			const sourceData: IConnection = data.connection[0];
			const destinationData: IConnection = data.connection[1];

			// Check if source node and type exist already and if not add them
			if (!state.workflow.connections.hasOwnProperty(sourceData.node)) {
				Vue.set(state.workflow.connections, sourceData.node, {});
			}
			if (!state.workflow.connections[sourceData.node].hasOwnProperty(sourceData.type)) {
				Vue.set(state.workflow.connections[sourceData.node], sourceData.type, []);
			}
			if (state.workflow.connections[sourceData.node][sourceData.type].length < (sourceData.index + 1)) {
				for (let i = state.workflow.connections[sourceData.node][sourceData.type].length; i <= sourceData.index; i++) {
					state.workflow.connections[sourceData.node][sourceData.type].push([]);
				}
			}

			// Check if the same connection exists already
			const checkProperties = ['index', 'node', 'type'];
			let propertyName: string;
			let connectionExists = false;
			connectionLoop:
			for (const existingConnection of state.workflow.connections[sourceData.node][sourceData.type][sourceData.index]) {
				for (propertyName of checkProperties) {
					if ((existingConnection as any)[propertyName] !== (destinationData as any)[propertyName]) { // tslint:disable-line:no-any
						continue connectionLoop;
					}
				}
				connectionExists = true;
				break;
			}

			// Add the new connection if it does not exist already
			if (connectionExists === false) {
				state.workflow.connections[sourceData.node][sourceData.type][sourceData.index].push(destinationData);
			}

		},
		removeConnection (state, data) {
			const sourceData = data.connection[0];
			const destinationData = data.connection[1];

			if (!state.workflow.connections.hasOwnProperty(sourceData.node)) {
				return;
			}
			if (!state.workflow.connections[sourceData.node].hasOwnProperty(sourceData.type)) {
				return;
			}
			if (state.workflow.connections[sourceData.node][sourceData.type].length < (sourceData.index + 1)) {
				return;
			}

			state.stateIsDirty = true;

			const connections = state.workflow.connections[sourceData.node][sourceData.type][sourceData.index];
			for (const index in connections) {
				if (connections[index].node === destinationData.node && connections[index].type === destinationData.type && connections[index].index === destinationData.index) {
					// Found the connection to remove
					connections.splice(parseInt(index, 10), 1);
				}
			}

		},
		removeAllConnections (state, data) {
			if (data && data.setStateDirty === true) {
				state.stateIsDirty = true;
			}
			state.workflow.connections = {};
		},
		removeAllNodeConnection (state, node: INodeUi) {
			state.stateIsDirty = true;
			// Remove all source connections
			if (state.workflow.connections.hasOwnProperty(node.name)) {
				delete state.workflow.connections[node.name];
			}

			// Remove all destination connections
			const indexesToRemove = [];
			let sourceNode: string, type: string, sourceIndex: string, connectionIndex: string, connectionData: IConnection;
			for (sourceNode of Object.keys(state.workflow.connections)) {
				for (type of Object.keys(state.workflow.connections[sourceNode])) {
					for (sourceIndex of Object.keys(state.workflow.connections[sourceNode][type])) {
						indexesToRemove.length = 0;
						for (connectionIndex of Object.keys(state.workflow.connections[sourceNode][type][parseInt(sourceIndex, 10)])) {
							connectionData = state.workflow.connections[sourceNode][type][parseInt(sourceIndex, 10)][parseInt(connectionIndex, 10)];
							if (connectionData.node === node.name) {
								indexesToRemove.push(connectionIndex);
							}
						}

						indexesToRemove.forEach((index) => {
							state.workflow.connections[sourceNode][type][parseInt(sourceIndex, 10)].splice(parseInt(index, 10), 1);
						});
					}
				}
			}
		},

		renameNodeSelectedAndExecution (state, nameData) {
			state.stateIsDirty = true;
			// If node has any WorkflowResultData rename also that one that the data
			// does still get displayed also after node got renamed
			if (state.workflowExecutionData !== null && state.workflowExecutionData.data.resultData.runData.hasOwnProperty(nameData.old)) {
				state.workflowExecutionData.data.resultData.runData[nameData.new] = state.workflowExecutionData.data.resultData.runData[nameData.old];
				delete state.workflowExecutionData.data.resultData.runData[nameData.old];
			}

			// In case the renamed node was last selected set it also there with the new name
			if (state.lastSelectedNode === nameData.old) {
				state.lastSelectedNode = nameData.new;
			}
		},

		resetAllNodesIssues (state) {
			state.workflow.nodes.forEach((node) => {
				node.issues = undefined;
			});

			return true;
		},

		setNodeIssue (state, nodeIssueData: INodeIssueData) {

			const node = state.workflow.nodes.find(node => {
				return node.name === nodeIssueData.node;
			});
			if (!node) {
				return false;
			}

			if (nodeIssueData.value === null) {
				// Remove the value if one exists
				if (node.issues === undefined || node.issues[nodeIssueData.type] === undefined) {
					// No values for type exist so nothing has to get removed
					return true;
				}

				// @ts-ignore
				Vue.delete(node.issues, nodeIssueData.type);
			} else {
				if (node.issues === undefined) {
					Vue.set(node, 'issues', {});
				}

				// Set/Overwrite the value
				Vue.set(node.issues!, nodeIssueData.type, nodeIssueData.value);
			}

			return true;
		},

		// Id
		setWorkflowId (state, id: string) {
			state.workflow.id = id;
		},

		// Name
		setWorkflowName (state, data) {
			if (data.setStateDirty === true) {
				state.stateIsDirty = true;
			}
			state.workflow.name = data.newName;
		},

		// replace invalid credentials in workflow
		replaceInvalidWorkflowCredentials(state, {credentials, invalid, type }) {
			state.workflow.nodes.forEach((node) => {
				if (!node.credentials || !node.credentials[type]) {
					return;
				}
				const nodeCredentials = node.credentials[type];

				if (typeof nodeCredentials === 'string' && nodeCredentials === invalid.name) {
					node.credentials[type] = credentials;
					return;
				}

				if (nodeCredentials.id === null) {
					if (nodeCredentials.name === invalid.name){
						node.credentials[type] = credentials;
					}
					return;
				}

				if (nodeCredentials.id === invalid.id) {
					node.credentials[type] = credentials;
				}
			});
		},

		// Nodes
		addNode (state, nodeData: INodeUi) {
			if (!nodeData.hasOwnProperty('name')) {
				// All nodes have to have a name
				// TODO: Check if there is an error or whatever that is supposed to be returned
				return;
			}

			state.workflow.nodes.push(nodeData);
		},
		removeNode (state, node: INodeUi) {
			for (let i = 0; i < state.workflow.nodes.length; i++) {
				if (state.workflow.nodes[i].name === node.name) {
					state.workflow.nodes.splice(i, 1);
					state.stateIsDirty = true;
					return;
				}
			}
		},
		removeAllNodes (state, data) {
			if (data.setStateDirty === true) {
				state.stateIsDirty = true;
			}
			state.workflow.nodes.splice(0, state.workflow.nodes.length);
		},
		updateNodeProperties (state, updateInformation: INodeUpdatePropertiesInformation) {
			// Find the node that should be updated
			const node = state.workflow.nodes.find(node => {
				return node.name === updateInformation.name;
			});

			if (node) {
				for (const key of Object.keys(updateInformation.properties)) {
					state.stateIsDirty = true;
					Vue.set(node, key, updateInformation.properties[key]);
				}
			}
		},
		setNodeValue (state, updateInformation: IUpdateInformation) {
			// Find the node that should be updated
			const node = state.workflow.nodes.find(node => {
				return node.name === updateInformation.name;
			});

			if (node === undefined || node === null) {
				throw new Error(`Node with the name "${updateInformation.name}" could not be found to set parameter.`);
			}

			state.stateIsDirty = true;
			Vue.set(node, updateInformation.key, updateInformation.value);
		},
		setNodeParameters (state, updateInformation: IUpdateInformation) {
			// Find the node that should be updated
			const node = state.workflow.nodes.find(node => {
				return node.name === updateInformation.name;
			});

			if (node === undefined || node === null) {
				throw new Error(`Node with the name "${updateInformation.name}" could not be found to set parameter.`);
			}

			state.stateIsDirty = true;
			Vue.set(node, 'parameters', updateInformation.value);
		},

		// Node-Index
		addToNodeIndex (state, nodeName: string) {
			state.nodeIndex.push(nodeName);
		},
		setNodeIndex (state, newData: { index: number, name: string | null}) {
			state.nodeIndex[newData.index] = newData.name;
		},
		resetNodeIndex (state) {
			Vue.set(state, 'nodeIndex', []);
		},

		// Node-View
		setNodeViewMoveInProgress (state, value: boolean) {
			state.nodeViewMoveInProgress = value;
		},
		setNodeViewOffsetPosition (state, data) {
			state.nodeViewOffsetPosition = data.newOffset;
		},

		// Node-Types
		setNodeTypes (state, nodeTypes: INodeTypeDescription[]) {
			Vue.set(state, 'nodeTypes', nodeTypes);
		},

		// Active Execution
		setExecutingNode (state, executingNode: string) {
			state.executingNode = executingNode;
		},
		setExecutionWaitingForWebhook (state, newWaiting: boolean) {
			state.executionWaitingForWebhook = newWaiting;
		},
		setActiveExecutionId (state, executionId: string | null) {
			state.executionId = executionId;
		},

		// Push Connection
		setPushConnectionActive (state, newActive: boolean) {
			state.pushConnectionActive = newActive;
		},

		// Webhooks
		setUrlBaseWebhook (state, urlBaseWebhook: string) {
			Vue.set(state, 'urlBaseWebhook', urlBaseWebhook);
		},
		setEndpointWebhook (state, endpointWebhook: string) {
			Vue.set(state, 'endpointWebhook', endpointWebhook);
		},
		setEndpointWebhookTest (state, endpointWebhookTest: string) {
			Vue.set(state, 'endpointWebhookTest', endpointWebhookTest);
		},

		setSaveDataErrorExecution (state, newValue: string) {
			Vue.set(state, 'saveDataErrorExecution', newValue);
		},
		setSaveDataSuccessExecution (state, newValue: string) {
			Vue.set(state, 'saveDataSuccessExecution', newValue);
		},
		setSaveManualExecutions (state, saveManualExecutions: boolean) {
			Vue.set(state, 'saveManualExecutions', saveManualExecutions);
		},
		setTimezone (state, timezone: string) {
			Vue.set(state, 'timezone', timezone);
		},
		setExecutionTimeout (state, executionTimeout: number) {
			Vue.set(state, 'executionTimeout', executionTimeout);
		},
		setMaxExecutionTimeout (state, maxExecutionTimeout: number) {
			Vue.set(state, 'maxExecutionTimeout', maxExecutionTimeout);
		},
		setVersionCli(state, version: string) {
			Vue.set(state, 'versionCli', version);
		},
		setInstanceId(state, instanceId: string) {
			Vue.set(state, 'instanceId', instanceId);
		},
		setOauthCallbackUrls(state, urls: IDataObject) {
			Vue.set(state, 'oauthCallbackUrls', urls);
		},
		setN8nMetadata(state, metadata: IDataObject) {
			Vue.set(state, 'n8nMetadata', metadata);
		},
		setDefaultLocale(state, locale: string) {
			Vue.set(state, 'defaultLocale', locale);
		},
		setActiveNode (state, nodeName: string) {
			state.activeNode = nodeName;
		},
		setActiveCredentialType (state, activeCredentialType: string) {
			state.activeCredentialType = activeCredentialType;
		},

		setLastSelectedNode (state, nodeName: string) {
			state.lastSelectedNode = nodeName;
		},

		setLastSelectedNodeOutputIndex (state, outputIndex: number | null) {
			state.lastSelectedNodeOutputIndex = outputIndex;
		},

		setWorkflowExecutionData (state, workflowResultData: IExecutionResponse | null) {
			state.workflowExecutionData = workflowResultData;
		},
		addNodeExecutionData (state, pushData: IPushDataNodeExecuteAfter): void {
			if (state.workflowExecutionData === null) {
				throw new Error('The "workflowExecutionData" is not initialized!');
			}
			if (state.workflowExecutionData.data.resultData.runData[pushData.nodeName] === undefined) {
				Vue.set(state.workflowExecutionData.data.resultData.runData, pushData.nodeName, []);
			}
			state.workflowExecutionData.data.resultData.runData[pushData.nodeName].push(pushData.data);
		},
		clearNodeExecutionData (state, nodeName: string): void {
			if (state.workflowExecutionData === null) {
				return;
			}

			Vue.delete(state.workflowExecutionData.data.resultData.runData, nodeName);
		},

		setWorkflowSettings (state, workflowSettings: IWorkflowSettings) {
			Vue.set(state.workflow, 'settings', workflowSettings);
		},

		setWorkflowTagIds (state, tags: string[]) {
			Vue.set(state.workflow, 'tags', tags);
		},

		removeWorkflowTagId (state, tagId: string) {
			const tags = state.workflow.tags as string[];
			const updated = tags.filter((id: string) => id !== tagId);

			Vue.set(state.workflow, 'tags', updated);
		},

		// Workflow
		setWorkflow (state, workflow: IWorkflowDb) {
			Vue.set(state, 'workflow', workflow);

			if (!state.workflow.hasOwnProperty('active')) {
				Vue.set(state.workflow, 'active', false);
			}
			if (!state.workflow.hasOwnProperty('connections')) {
				Vue.set(state.workflow, 'connections', {});
			}
			if (!state.workflow.hasOwnProperty('createdAt')) {
				Vue.set(state.workflow, 'createdAt', -1);
			}
			if (!state.workflow.hasOwnProperty('updatedAt')) {
				Vue.set(state.workflow, 'updatedAt', -1);
			}
			if (!state.workflow.hasOwnProperty('id')) {
				Vue.set(state.workflow, 'id', PLACEHOLDER_EMPTY_WORKFLOW_ID);
			}
			if (!state.workflow.hasOwnProperty('nodes')) {
				Vue.set(state.workflow, 'nodes', []);
			}
			if (!state.workflow.hasOwnProperty('settings')) {
				Vue.set(state.workflow, 'settings', {});
			}
		},

		updateNodeTypes (state, nodeTypes: INodeTypeDescription[]) {
			const oldNodesToKeep = state.nodeTypes.filter(node => !nodeTypes.find(n => n.name === node.name && n.version === node.version));
			const newNodesState = [...oldNodesToKeep, ...nodeTypes];
			Vue.set(state, 'nodeTypes', newNodesState);
			state.nodeTypes = newNodesState;
		},

		addSidebarMenuItems (state, menuItems: IMenuItem[]) {
			const updated = state.sidebarMenuItems.concat(menuItems);
			Vue.set(state, 'sidebarMenuItems', updated);
		},
	},
	getters: {
		activeCredentialType: (state): string | null => {
			return state.activeCredentialType;
		},

		isActionActive: (state) => (action: string): boolean => {
			return state.activeActions.includes(action);
		},

		isNewWorkflow: (state) => {
			return state.workflow.id === PLACEHOLDER_EMPTY_WORKFLOW_ID;
		},

		currentWorkflowHasWebhookNode: (state: IRootState): boolean => {
			return !!state.workflow.nodes.find((node: INodeUi) => !!node.webhookId);
		},

		getActiveExecutions: (state): IExecutionsCurrentSummaryExtended[] => {
			return state.activeExecutions;
		},

		getBaseUrl: (state): string => {
			return state.baseUrl;
		},
		getRestUrl: (state): string => {
			let endpoint = 'rest';
			if (process.env.VUE_APP_ENDPOINT_REST) {
				endpoint = process.env.VUE_APP_ENDPOINT_REST;
			}
			return `${state.baseUrl}${endpoint}`;
		},
		getRestApiContext(state): IRestApiContext {
			let endpoint = 'rest';
			if (process.env.VUE_APP_ENDPOINT_REST) {
				endpoint = process.env.VUE_APP_ENDPOINT_REST;
			}
			return {
				baseUrl: `${state.baseUrl}${endpoint}`,
				sessionId: state.sessionId,
			};
		},
		getWebhookBaseUrl: (state): string => {
			return state.urlBaseWebhook;
		},
		getWebhookUrl: (state): string => {
			return `${state.urlBaseWebhook}${state.endpointWebhook}`;
		},
		getWebhookTestUrl: (state): string => {
			return `${state.urlBaseWebhook}${state.endpointWebhookTest}`;
		},

		getStateIsDirty: (state) : boolean => {
			return state.stateIsDirty;
		},

		instanceId: (state): string => {
			return state.instanceId;
		},

		saveDataErrorExecution: (state): string => {
			return state.saveDataErrorExecution;
		},
		saveDataSuccessExecution: (state): string => {
			return state.saveDataSuccessExecution;
		},
		saveManualExecutions: (state): boolean => {
			return state.saveManualExecutions;
		},
		timezone: (state): string => {
			return state.timezone;
		},
		executionTimeout: (state): number => {
			return state.executionTimeout;
		},
		maxExecutionTimeout: (state): number => {
			return state.maxExecutionTimeout;
		},
		versionCli: (state): string => {
			return state.versionCli;
		},
		oauthCallbackUrls: (state): object => {
			return state.oauthCallbackUrls;
		},
		n8nMetadata: (state): object => {
			return state.n8nMetadata;
		},
		defaultLocale: (state): string => {
			return state.defaultLocale;
		},

		// Push Connection
		pushConnectionActive: (state): boolean => {
			return state.pushConnectionActive;
		},
		sessionId: (state): string => {
			return state.sessionId;
		},

		// Active Workflows
		getActiveWorkflows: (state): string[] => {
			return state.activeWorkflows;
		},

		workflowTriggerNodes: (state, getters) => {
			return state.workflow.nodes.filter(node => {
				const nodeType = getters.nodeType(node.type, node.typeVersion);
				return nodeType && nodeType.group.includes('trigger');
			});
		},

		// Node-Index
		getNodeIndex: (state) => (nodeName: string): number => {
			return state.nodeIndex.indexOf(nodeName);
		},
		getNodeNameByIndex: (state) => (index: number): string | null => {
			return state.nodeIndex[index];
		},

		getNodeViewOffsetPosition: (state): XYPosition => {
			return state.nodeViewOffsetPosition;
		},
		isNodeViewMoveInProgress: (state): boolean => {
			return state.nodeViewMoveInProgress;
		},

		// Selected Nodes
		getSelectedNodes: (state): INodeUi[] => {
			return state.selectedNodes;
		},
		isNodeSelected: (state) => (nodeName: string): boolean => {
			let index;
			for (index in state.selectedNodes) {
				if (state.selectedNodes[index].name === nodeName) {
					return true;
				}
			}
			return false;
		},

		isActive: (state): boolean => {
			return state.workflow.active;
		},
		allConnections: (state): IConnections => {
			return state.workflow.connections;
		},
		outgoingConnectionsByNodeName: (state) => (nodeName: string): INodeConnections => {
			if (state.workflow.connections.hasOwnProperty(nodeName)) {
				return state.workflow.connections[nodeName];
			}
			return {};
		},
		allNodes: (state): INodeUi[] => {
			return state.workflow.nodes;
		},
		nodesByName: (state: IRootState): {[name: string]: INodeUi} => {
			return state.workflow.nodes.reduce((accu: {[name: string]: INodeUi}, node) => {
				accu[node.name] = node;
				return accu;
			}, {});
		},
		getNodeByName: (state, getters) => (nodeName: string): INodeUi | null => {
			return getters.nodesByName[nodeName] || null;
		},
		nodesIssuesExist: (state): boolean => {
			for (const node of state.workflow.nodes) {
				if (node.issues === undefined || Object.keys(node.issues).length === 0) {
					continue;
				}
				return true;
			}
			return false;
		},
		allNodeTypes: (state): INodeTypeDescription[] => {
			return state.nodeTypes;
		},

		/**
		 * Getter for node default names ending with a number: `'S3'`, `'Magento 2'`, etc.
		 */
		nativelyNumberSuffixedDefaults: (_, getters): string[] => {
			const { allNodeTypes } = getters as {
				allNodeTypes: Array<INodeTypeDescription & { defaults: { name: string } }>;
			};

			return allNodeTypes.reduce<string[]>((acc, cur) => {
				if (/\d$/.test(cur.defaults.name)) acc.push(cur.defaults.name);
				return acc;
			}, []);
		},

		nodeType: (state, getters) => (nodeType: string, typeVersion?: number): INodeTypeDescription | null => {
			const foundType = state.nodeTypes.find(typeData => {
				return typeData.name === nodeType && typeData.version === (typeVersion || typeData.defaultVersion || DEFAULT_NODETYPE_VERSION);
			});

			if (foundType === undefined) {
				return null;
			}
			return foundType;
		},
		activeNode: (state, getters): INodeUi | null => {
			return getters.getNodeByName(state.activeNode);
		},
		lastSelectedNode: (state, getters): INodeUi | null => {
			return getters.getNodeByName(state.lastSelectedNode);
		},
		lastSelectedNodeOutputIndex: (state, getters): number | null => {
			return state.lastSelectedNodeOutputIndex;
		},

		// Active Execution
		executingNode: (state): string | null => {
			return state.executingNode;
		},
		activeExecutionId: (state): string | null => {
			return state.executionId;
		},
		executionWaitingForWebhook: (state): boolean => {
			return state.executionWaitingForWebhook;
		},

		workflowName: (state): string => {
			return state.workflow.name;
		},
		workflowId: (state): string => {
			return state.workflow.id;
		},

		workflowSettings: (state): IWorkflowSettings => {
			if (state.workflow.settings === undefined) {
				return {};
			}
			return state.workflow.settings;
		},

		workflowTags: (state): string[] => {
			return state.workflow.tags as string[];
		},

		// Workflow Result Data
		getWorkflowExecution: (state): IExecutionResponse | null => {
			return state.workflowExecutionData;
		},
		getWorkflowRunData: (state): IRunData | null => {
			if (!state.workflowExecutionData || !state.workflowExecutionData.data || !state.workflowExecutionData.data.resultData) {
				return null;
			}

			return state.workflowExecutionData.data.resultData.runData;
		},
		getWorkflowResultDataByNodeName: (state, getters) => (nodeName: string): ITaskData[] | null => {
			const workflowRunData = getters.getWorkflowRunData;

			if (workflowRunData === null) {
				return null;
			}
			if (!workflowRunData.hasOwnProperty(nodeName)) {
				return null;
			}
			return workflowRunData[nodeName];
		},

		sidebarMenuItems: (state): IMenuItem[] => {
			return state.sidebarMenuItems;
		},
	},
});
