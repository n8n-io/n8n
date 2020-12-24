
import Vue from 'vue';
import Vuex from 'vuex';

import { PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/constants';

import {
	IConnection,
	IConnections,
	ICredentialType,
	IDataObject,
	INodeConnections,
	INodeIssueData,
	INodeTypeDescription,
	IRunData,
	ITaskData,
	IWorkflowSettings,
} from 'n8n-workflow';

import {
	ICredentialsResponse,
	IExecutionResponse,
	IExecutionsCurrentSummaryExtended,
	IPushDataExecutionFinished,
	IPushDataNodeExecuteAfter,
	IWorkflowDb,
	INodeUi,
	INodeUpdatePropertiesInformation,
	IUpdateInformation,
	XYPositon,
} from './Interface';

Vue.use(Vuex);

export const store = new Vuex.Store({
	strict: process.env.NODE_ENV !== 'production',
	state: {
		activeExecutions: [] as IExecutionsCurrentSummaryExtended[],
		activeWorkflows: [] as string[],
		activeActions: [] as string[],
		activeNode: null as string | null,
		// @ts-ignore
		baseUrl: process.env.VUE_APP_URL_BASE_API ? process.env.VUE_APP_URL_BASE_API : (window.BASE_PATH === '/%BASE_PATH%/' ? '/' : window.BASE_PATH),
		credentials: null as ICredentialsResponse[] | null,
		credentialTypes: null as ICredentialType[] | null,
		endpointWebhook: 'webhook',
		endpointWebhookTest: 'webhook-test',
		executionId: null as string | null,
		executingNode: '' as string | null,
		executionWaitingForWebhook: false,
		pushConnectionActive: false,
		saveDataErrorExecution: 'all',
		saveDataSuccessExecution: 'all',
		saveManualExecutions: false,
		timezone: 'America/New_York',
		stateIsDirty: false,
		executionTimeout: -1,
		maxExecutionTimeout: Number.MAX_SAFE_INTEGER,
		versionCli: '0.0.0',
		oauthCallbackUrls: {},
		workflowExecutionData: null as IExecutionResponse | null,
		lastSelectedNode: null as string | null,
		lastSelectedNodeOutputIndex: null as number | null,
		nodeIndex: [] as Array<string | null>,
		nodeTypes: [] as INodeTypeDescription[],
		nodeViewOffsetPosition: [0, 0] as XYPositon,
		nodeViewMoveInProgress: false,
		selectedNodes: [] as INodeUi[],
		sessionId: Math.random().toString(36).substring(2, 15),
		urlBaseWebhook: 'http://localhost:5678/',
		workflow: {
			id: PLACEHOLDER_EMPTY_WORKFLOW_ID,
			name: '',
			active: false,
			createdAt: -1,
			updatedAt: -1,
			connections: {} as IConnections,
			nodes: [] as INodeUi[],
			settings: {} as IWorkflowSettings,
		} as IWorkflowDb,
	},
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
				return execution.idActive === newActiveExecution.idActive;
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
				return execution.idActive === finishedActiveExecution.executionIdActive;
			});

			if (activeExecution === undefined) {
				// The execution could not be found
				return;
			}

			if (finishedActiveExecution.executionIdDb !== undefined) {
				Vue.set(activeExecution, 'id', finishedActiveExecution.executionIdDb);
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

		// Credentials
		addCredentials (state, credentialData: ICredentialsResponse) {
			if (state.credentials !== null) {
				state.credentials.push(credentialData);
			}
		},
		removeCredentials (state, credentialData: ICredentialsResponse) {
			if (state.credentials === null) {
				return;
			}

			for (let i = 0; i < state.credentials.length; i++) {
				if (state.credentials[i].id === credentialData.id) {
					state.credentials.splice(i, 1);
					return;
				}
			}
		},
		updateCredentials (state, credentialData: ICredentialsResponse) {
			if (state.credentials === null) {
				return;
			}

			for (let i = 0; i < state.credentials.length; i++) {
				if (state.credentials[i].id === credentialData.id) {
					state.credentials[i] = credentialData;
					return;
				}
			}
		},
		setCredentials (state, credentials: ICredentialsResponse[]) {
			Vue.set(state, 'credentials', credentials);
		},
		setCredentialTypes (state, credentialTypes: ICredentialType[]) {
			Vue.set(state, 'credentialTypes', credentialTypes);
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
		setVersionCli (state, version: string) {
			Vue.set(state, 'versionCli', version);
		},
		setOauthCallbackUrls(state, urls: IDataObject) {
			Vue.set(state, 'oauthCallbackUrls', urls);
		},

		setActiveNode (state, nodeName: string) {
			state.activeNode = nodeName;
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

		setWorkflowSettings (state, workflowSettings: IWorkflowSettings) {
			Vue.set(state.workflow, 'settings', workflowSettings);
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
			const updatedNodeNames = nodeTypes.map(node => node.name) as string[];
			const oldNodesNotChanged = state.nodeTypes.filter(node => !updatedNodeNames.includes(node.name));
			const updatedNodes = [...oldNodesNotChanged, ...nodeTypes];
			Vue.set(state, 'nodeTypes', updatedNodes);
			state.nodeTypes = updatedNodes;
		},
	},
	getters: {

		isActionActive: (state) => (action: string): boolean => {
			return state.activeActions.includes(action);
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

		// Node-Index
		getNodeIndex: (state) => (nodeName: string): number => {
			return state.nodeIndex.indexOf(nodeName);
		},
		getNodeNameByIndex: (state) => (index: number): string | null => {
			return state.nodeIndex[index];
		},

		getNodeViewOffsetPosition: (state): XYPositon => {
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
		// connectionsByNodeName: (state) => (nodeName: string): {[key: string]: Connection[][]} | null => {
		// connectionsByNodeName: (state) => (nodeName: string): { [key: string]: NodeConnections} | null => {
		connectionsByNodeName: (state) => (nodeName: string): INodeConnections => {
			if (state.workflow.connections.hasOwnProperty(nodeName)) {
				return state.workflow.connections[nodeName];
			}
			return {};
		},
		allNodes: (state): INodeUi[] => {
			return state.workflow.nodes;
		},
		nodeByName: (state) => (nodeName: string): INodeUi | null => {
			const foundNode = state.workflow.nodes.find(node => {
				return node.name === nodeName;
			});

			if (foundNode === undefined) {
				return null;
			}
			return foundNode;
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
		allCredentialTypes: (state): ICredentialType[] | null => {
			return state.credentialTypes;
		},
		allCredentials: (state): ICredentialsResponse[] | null => {
			return state.credentials;
		},
		credentialsByType: (state) => (credentialType: string): ICredentialsResponse[] | null => {
			if (state.credentials === null) {
				return null;
			}

			return state.credentials.filter((credentialData) => credentialData.type === credentialType);
		},
		credentialType: (state) => (credentialType: string): ICredentialType | null => {
			if (state.credentialTypes === null) {
				return null;
			}
			const foundType = state.credentialTypes.find(credentialData => {
				return credentialData.name === credentialType;
			});

			if (foundType === undefined) {
				return null;
			}
			return foundType;
		},
		allNodeTypes: (state): INodeTypeDescription[] => {
			return state.nodeTypes;
		},
		nodeType: (state) => (nodeType: string): INodeTypeDescription | null => {
			const foundType = state.nodeTypes.find(typeData => {
				return typeData.name === nodeType;
			});

			if (foundType === undefined) {
				return null;
			}
			return foundType;
		},
		activeNode: (state, getters): INodeUi | null => {
			return getters.nodeByName(state.activeNode);
		},
		lastSelectedNode: (state, getters): INodeUi | null => {
			return getters.nodeByName(state.lastSelectedNode);
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

		// Workflow Result Data
		getWorkflowExecution: (state): IExecutionResponse | null => {
			return state.workflowExecutionData;
		},
		getWorkflowRunData: (state): IRunData | null => {
			if (state.workflowExecutionData === null) {
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

	},

});

// import Vue from 'vue';
// import Vuex from 'vuex';

// Vue.use(Vuex)

// export default new Vuex.Store({
// 	state: {

// 	},
// 	mutations: {

// 	},
// 	actions: {

// 	}
// });
