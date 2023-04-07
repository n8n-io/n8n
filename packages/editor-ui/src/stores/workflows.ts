import {
	DEFAULT_NEW_WORKFLOW_NAME,
	DUPLICATE_POSTFFIX,
	EnterpriseEditionFeature,
	MAX_WORKFLOW_NAME_LENGTH,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	STORES,
} from '@/constants';
import {
	ExecutionsQueryFilter,
	IExecutionResponse,
	IExecutionsCurrentSummaryExtended,
	INewWorkflowData,
	INodeUi,
	INodeUpdatePropertiesInformation,
	IPushDataExecutionFinished,
	IPushDataNodeExecuteAfter,
	IPushDataUnsavedExecutionFinished,
	IUpdateInformation,
	IUsedCredential,
	IWorkflowDb,
	IWorkflowsMap,
	WorkflowsState,
} from '@/Interface';
import { defineStore } from 'pinia';
import {
	deepCopy,
	IConnection,
	IConnections,
	IDataObject,
	IExecutionsSummary,
	INode,
	INodeConnections,
	INodeCredentials,
	INodeCredentialsDetails,
	INodeExecutionData,
	INodeIssueData,
	INodeParameters,
	IPinData,
	IRun,
	IRunData,
	IRunExecutionData,
	ITaskData,
	IWorkflowSettings,
	NodeHelpers,
} from 'n8n-workflow';
import Vue from 'vue';

import { useRootStore } from './n8nRootStore';
import {
	getActiveWorkflows,
	getCurrentExecutions,
	getExecutionData,
	getFinishedExecutions,
	getNewWorkflow,
	getWorkflow,
	getWorkflows,
} from '@/api/workflows';
import { useUIStore } from './ui';
import { dataPinningEventBus } from '@/event-bus';
import {
	isJsonKeyObject,
	getPairedItemsMapping,
	stringSizeInBytes,
	isObjectLiteral,
	isEmpty,
} from '@/utils';
import { useNDVStore } from './ndv';
import { useNodeTypesStore } from './nodeTypes';
import { useWorkflowsEEStore } from '@/stores/workflows.ee';
import { useUsersStore } from '@/stores/users';
import { useSettingsStore } from '@/stores/settings';

const createEmptyWorkflow = (): IWorkflowDb => ({
	id: PLACEHOLDER_EMPTY_WORKFLOW_ID,
	name: '',
	active: false,
	createdAt: -1,
	updatedAt: -1,
	connections: {},
	nodes: [],
	settings: {},
	tags: [],
	pinData: {},
	versionId: '',
	usedCredentials: [],
});

export const useWorkflowsStore = defineStore(STORES.WORKFLOWS, {
	state: (): WorkflowsState => ({
		workflow: createEmptyWorkflow(),
		usedCredentials: {},
		activeWorkflows: [],
		activeExecutions: [],
		currentWorkflowExecutions: [],
		activeWorkflowExecution: null,
		finishedExecutionsCount: 0,
		workflowExecutionData: null,
		workflowExecutionPairedItemMappings: {},
		workflowsById: {},
		subWorkflowExecutionError: null,
		activeExecutionId: null,
		executingNode: null,
		executionWaitingForWebhook: false,
		nodeMetadata: {},
	}),
	getters: {
		// Workflow getters
		workflowName(): string {
			return this.workflow.name;
		},
		workflowId(): string {
			return this.workflow.id;
		},
		workflowVersionId(): string | undefined {
			return this.workflow.versionId;
		},
		workflowSettings(): IWorkflowSettings {
			if (this.workflow.settings === undefined) {
				return {};
			}
			return this.workflow.settings;
		},
		workflowTags(): string[] {
			return this.workflow.tags as string[];
		},
		allWorkflows(): IWorkflowDb[] {
			return Object.values(this.workflowsById).sort((a, b) => a.name.localeCompare(b.name));
		},
		isNewWorkflow(): boolean {
			return this.workflow.id === PLACEHOLDER_EMPTY_WORKFLOW_ID;
		},
		isWorkflowActive(): boolean {
			return this.workflow.active;
		},
		workflowTriggerNodes(): INodeUi[] {
			return this.workflow.nodes.filter((node: INodeUi) => {
				const nodeTypesStore = useNodeTypesStore();
				const nodeType = nodeTypesStore.getNodeType(
					node.type as string,
					node.typeVersion as number,
				);
				return nodeType && nodeType.group.includes('trigger');
			});
		},
		currentWorkflowHasWebhookNode(): boolean {
			return !!this.workflow.nodes.find((node: INodeUi) => !!node.webhookId);
		},
		getWorkflowRunData(): IRunData | null {
			if (
				!this.workflowExecutionData ||
				!this.workflowExecutionData.data ||
				!this.workflowExecutionData.data.resultData
			) {
				return null;
			}
			return this.workflowExecutionData.data.resultData.runData;
		},
		getWorkflowResultDataByNodeName() {
			return (nodeName: string): ITaskData[] | null => {
				const workflowRunData = this.getWorkflowRunData;

				if (workflowRunData === null) {
					return null;
				}
				if (!workflowRunData.hasOwnProperty(nodeName)) {
					return null;
				}
				return workflowRunData[nodeName];
			};
		},
		getWorkflowById() {
			return (id: string): IWorkflowDb => this.workflowsById[id];
		},

		// Node getters
		allConnections(): IConnections {
			return this.workflow.connections;
		},
		outgoingConnectionsByNodeName() {
			return (nodeName: string): INodeConnections => {
				if (this.workflow.connections.hasOwnProperty(nodeName)) {
					return this.workflow.connections[nodeName];
				}
				return {};
			};
		},
		allNodes(): INodeUi[] {
			return this.workflow.nodes;
		},
		nodesByName(): { [name: string]: INodeUi } {
			return this.workflow.nodes.reduce((accu: { [name: string]: INodeUi }, node) => {
				accu[node.name] = node;
				return accu;
			}, {});
		},
		getNodeByName() {
			return (nodeName: string): INodeUi | null => this.nodesByName[nodeName] || null;
		},
		getNodeById() {
			return (nodeId: string): INodeUi | undefined =>
				this.workflow.nodes.find((node: INodeUi) => {
					return node.id === nodeId;
				});
		},
		nodesIssuesExist(): boolean {
			for (const node of this.workflow.nodes) {
				if (node.issues === undefined || Object.keys(node.issues).length === 0) {
					continue;
				}
				return true;
			}
			return false;
		},
		getPinData(): IPinData | undefined {
			return this.workflow.pinData;
		},
		pinDataSize(): number {
			const ndvStore = useNDVStore();
			const activeNode = ndvStore.activeNodeName;
			return this.workflow.nodes.reduce((acc, node) => {
				if (typeof node.pinData !== 'undefined' && node.name !== activeNode) {
					acc += stringSizeInBytes(node.pinData);
				}

				return acc;
			}, 0);
		},
		executedNode(): string | undefined {
			return this.workflowExecutionData ? this.workflowExecutionData.executedNode : undefined;
		},
		getParametersLastUpdate(): (name: string) => number | undefined {
			return (nodeName: string) =>
				this.nodeMetadata[nodeName] && this.nodeMetadata[nodeName].parametersLastUpdatedAt;
		},

		isNodePristine(): (name: string) => boolean {
			return (nodeName: string) =>
				this.nodeMetadata[nodeName] === undefined || this.nodeMetadata[nodeName].pristine === true;
		},
		// Executions getters
		getExecutionDataById(): (id: string) => IExecutionsSummary | undefined {
			return (id: string): IExecutionsSummary | undefined =>
				this.currentWorkflowExecutions.find((execution) => execution.id === id);
		},
		getAllLoadedFinishedExecutions(): IExecutionsSummary[] {
			return this.currentWorkflowExecutions.filter(
				(ex) => ex.finished === true || ex.stoppedAt !== undefined,
			);
		},
		getWorkflowExecution(): IExecutionResponse | null {
			return this.workflowExecutionData;
		},
		getTotalFinishedExecutionsCount(): number {
			return this.finishedExecutionsCount;
		},
	},
	actions: {
		// Workflow actions

		async fetchAllWorkflows(): Promise<IWorkflowDb[]> {
			const rootStore = useRootStore();
			const workflows = await getWorkflows(rootStore.getRestApiContext);
			this.setWorkflows(workflows);
			return workflows;
		},

		async fetchWorkflow(id: string): Promise<IWorkflowDb> {
			const rootStore = useRootStore();
			const workflow = await getWorkflow(rootStore.getRestApiContext, id);
			this.addWorkflow(workflow);
			return workflow;
		},

		async getNewWorkflowData(name?: string): Promise<INewWorkflowData> {
			const workflowsEEStore = useWorkflowsEEStore();

			let workflowData = {
				name: '',
				onboardingFlowEnabled: false,
			};
			try {
				const rootStore = useRootStore();
				workflowData = await getNewWorkflow(rootStore.getRestApiContext, name);
			} catch (e) {
				// in case of error, default to original name
				workflowData.name = name || DEFAULT_NEW_WORKFLOW_NAME;
			}

			this.setWorkflowName({ newName: workflowData.name, setStateDirty: false });

			return workflowData;
		},

		resetWorkflow() {
			const usersStore = useUsersStore();
			const settingsStore = useSettingsStore();

			this.workflow = createEmptyWorkflow();

			if (settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing)) {
				Vue.set(this.workflow, 'ownedBy', usersStore.currentUser);
			}
		},

		setWorkflowId(id: string): void {
			this.workflow.id = id === 'new' ? PLACEHOLDER_EMPTY_WORKFLOW_ID : id;
		},

		setUsedCredentials(data: IUsedCredential[]) {
			this.workflow.usedCredentials = data;
			this.usedCredentials = data.reduce<{ [name: string]: IUsedCredential }>(
				(accu, credential) => {
					accu[credential.id!] = credential;
					return accu;
				},
				{},
			);
		},

		setWorkflowName(data: { newName: string; setStateDirty: boolean }): void {
			if (data.setStateDirty) {
				const uiStore = useUIStore();
				uiStore.stateIsDirty = true;
			}
			this.workflow.name = data.newName;

			if (
				this.workflow.id !== PLACEHOLDER_EMPTY_WORKFLOW_ID &&
				this.workflowsById[this.workflow.id]
			) {
				this.workflowsById[this.workflow.id].name = data.newName;
			}
		},

		setWorkflowVersionId(versionId: string): void {
			this.workflow.versionId = versionId;
		},

		// replace invalid credentials in workflow
		replaceInvalidWorkflowCredentials(data: {
			credentials: INodeCredentialsDetails;
			invalid: INodeCredentialsDetails;
			type: string;
		}): void {
			this.workflow.nodes.forEach((node: INodeUi) => {
				const nodeCredentials: INodeCredentials | undefined = (node as unknown as INode)
					.credentials;

				if (!nodeCredentials || !nodeCredentials[data.type]) {
					return;
				}

				const nodeCredentialDetails: INodeCredentialsDetails | string = nodeCredentials[data.type];

				if (
					typeof nodeCredentialDetails === 'string' &&
					nodeCredentialDetails === data.invalid.name
				) {
					(node.credentials as INodeCredentials)[data.type] = data.credentials;
					return;
				}

				if (nodeCredentialDetails.id === null) {
					if (nodeCredentialDetails.name === data.invalid.name) {
						(node.credentials as INodeCredentials)[data.type] = data.credentials;
					}
					return;
				}

				if (nodeCredentialDetails.id === data.invalid.id) {
					(node.credentials as INodeCredentials)[data.type] = data.credentials;
				}
			});
		},

		setWorkflows(workflows: IWorkflowDb[]): void {
			this.workflowsById = workflows.reduce<IWorkflowsMap>((acc, workflow: IWorkflowDb) => {
				if (workflow.id) {
					acc[workflow.id] = workflow;
				}

				return acc;
			}, {});
		},

		deleteWorkflow(id: string): void {
			const { [id]: deletedWorkflow, ...workflows } = this.workflowsById;
			this.workflowsById = workflows;
		},

		addWorkflow(workflow: IWorkflowDb): void {
			Vue.set(this.workflowsById, workflow.id, {
				...this.workflowsById[workflow.id],
				...deepCopy(workflow),
			});
		},

		setWorkflowActive(workflowId: string): void {
			const uiStore = useUIStore();
			uiStore.stateIsDirty = false;
			const index = this.activeWorkflows.indexOf(workflowId);
			if (index === -1) {
				this.activeWorkflows.push(workflowId);
			}
			if (this.workflowsById[workflowId]) {
				this.workflowsById[workflowId].active = true;
			}
		},

		setWorkflowInactive(workflowId: string): void {
			const index = this.activeWorkflows.indexOf(workflowId);
			if (index !== -1) {
				this.activeWorkflows.splice(index, 1);
			}
			if (this.workflowsById[workflowId]) {
				this.workflowsById[workflowId].active = false;
			}
		},

		async fetchActiveWorkflows(): Promise<string[]> {
			const rootStore = useRootStore();
			const activeWorkflows = await getActiveWorkflows(rootStore.getRestApiContext);
			this.activeWorkflows = activeWorkflows;
			return activeWorkflows;
		},

		setActive(newActive: boolean): void {
			this.workflow.active = newActive;
		},

		async getDuplicateCurrentWorkflowName(currentWorkflowName: string): Promise<string> {
			if (
				currentWorkflowName &&
				currentWorkflowName.length + DUPLICATE_POSTFFIX.length >= MAX_WORKFLOW_NAME_LENGTH
			) {
				return currentWorkflowName;
			}

			let newName = `${currentWorkflowName}${DUPLICATE_POSTFFIX}`;
			try {
				const rootStore = useRootStore();
				const newWorkflow = await getNewWorkflow(rootStore.getRestApiContext, newName);
				newName = newWorkflow.name;
			} catch (e) {}
			return newName;
		},

		// Node actions
		setWorkflowExecutionData(workflowResultData: IExecutionResponse | null): void {
			this.workflowExecutionData = workflowResultData;
			this.workflowExecutionPairedItemMappings = getPairedItemsMapping(this.workflowExecutionData);
		},

		setWorkflowExecutionRunData(workflowResultData: IRunExecutionData): void {
			if (this.workflowExecutionData) this.workflowExecutionData.data = workflowResultData;
		},

		setWorkflowSettings(workflowSettings: IWorkflowSettings): void {
			Vue.set(this.workflow, 'settings', workflowSettings);
		},

		setWorkflowPinData(pinData: IPinData): void {
			Vue.set(this.workflow, 'pinData', pinData || {});
			dataPinningEventBus.emit('pin-data', pinData || {});
		},

		setWorkflowTagIds(tags: string[]): void {
			Vue.set(this.workflow, 'tags', tags);
		},

		addWorkflowTagIds(tags: string[]): void {
			Vue.set(this.workflow, 'tags', [...new Set([...(this.workflow.tags || []), ...tags])]);
		},

		removeWorkflowTagId(tagId: string): void {
			const tags = this.workflow.tags as string[];
			const updated = tags.filter((id: string) => id !== tagId);
			Vue.set(this.workflow, 'tags', updated);
		},

		setWorkflow(workflow: IWorkflowDb): void {
			Vue.set(this, 'workflow', workflow);

			if (!this.workflow.hasOwnProperty('active')) {
				Vue.set(this.workflow, 'active', false);
			}
			if (!this.workflow.hasOwnProperty('connections')) {
				Vue.set(this.workflow, 'connections', {});
			}
			if (!this.workflow.hasOwnProperty('createdAt')) {
				Vue.set(this.workflow, 'createdAt', -1);
			}
			if (!this.workflow.hasOwnProperty('updatedAt')) {
				Vue.set(this.workflow, 'updatedAt', -1);
			}
			if (!this.workflow.hasOwnProperty('id')) {
				Vue.set(this.workflow, 'id', PLACEHOLDER_EMPTY_WORKFLOW_ID);
			}
			if (!this.workflow.hasOwnProperty('nodes')) {
				Vue.set(this.workflow, 'nodes', []);
			}
			if (!this.workflow.hasOwnProperty('settings')) {
				Vue.set(this.workflow, 'settings', {});
			}
		},

		pinData(payload: { node: INodeUi; data: INodeExecutionData[] }): void {
			if (!this.workflow.pinData) {
				Vue.set(this.workflow, 'pinData', {});
			}

			if (!Array.isArray(payload.data)) {
				payload.data = [payload.data];
			}

			const storedPinData = payload.data.map((item) =>
				isJsonKeyObject(item) ? item : { json: item },
			);

			Vue.set(this.workflow.pinData!, payload.node.name, storedPinData);

			const uiStore = useUIStore();
			uiStore.stateIsDirty = true;

			dataPinningEventBus.emit('pin-data', { [payload.node.name]: storedPinData });
		},

		unpinData(payload: { node: INodeUi }): void {
			if (!this.workflow.pinData) {
				Vue.set(this.workflow, 'pinData', {});
			}

			Vue.set(this.workflow.pinData!, payload.node.name, undefined);
			delete this.workflow.pinData![payload.node.name];

			const uiStore = useUIStore();
			uiStore.stateIsDirty = true;

			dataPinningEventBus.emit('unpin-data', { [payload.node.name]: undefined });
		},

		addConnection(data: { connection: IConnection[] }): void {
			if (data.connection.length !== 2) {
				// All connections need two entries
				// TODO: Check if there is an error or whatever that is supposed to be returned
				return;
			}
			const sourceData: IConnection = data.connection[0];
			const destinationData: IConnection = data.connection[1];

			// Check if source node and type exist already and if not add them
			if (!this.workflow.connections.hasOwnProperty(sourceData.node)) {
				Vue.set(this.workflow.connections, sourceData.node, {});
			}
			if (!this.workflow.connections[sourceData.node].hasOwnProperty(sourceData.type)) {
				Vue.set(this.workflow.connections[sourceData.node], sourceData.type, []);
			}
			if (
				this.workflow.connections[sourceData.node][sourceData.type].length <
				sourceData.index + 1
			) {
				for (
					let i = this.workflow.connections[sourceData.node][sourceData.type].length;
					i <= sourceData.index;
					i++
				) {
					this.workflow.connections[sourceData.node][sourceData.type].push([]);
				}
			}

			// Check if the same connection exists already
			const checkProperties = ['index', 'node', 'type'];
			let propertyName: string;
			let connectionExists = false;
			connectionLoop: for (const existingConnection of this.workflow.connections[sourceData.node][
				sourceData.type
			][sourceData.index]) {
				for (propertyName of checkProperties) {
					if (
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						(existingConnection as any)[propertyName] !== (destinationData as any)[propertyName]
					) {
						continue connectionLoop;
					}
				}
				connectionExists = true;
				break;
			}
			// Add the new connection if it does not exist already
			if (connectionExists === false) {
				this.workflow.connections[sourceData.node][sourceData.type][sourceData.index].push(
					destinationData,
				);
			}
		},

		removeConnection(data: { connection: IConnection[] }): void {
			const sourceData = data.connection[0];
			const destinationData = data.connection[1];

			if (!this.workflow.connections.hasOwnProperty(sourceData.node)) {
				return;
			}
			if (!this.workflow.connections[sourceData.node].hasOwnProperty(sourceData.type)) {
				return;
			}
			if (
				this.workflow.connections[sourceData.node][sourceData.type].length <
				sourceData.index + 1
			) {
				return;
			}
			const uiStore = useUIStore();
			uiStore.stateIsDirty = true;

			const connections =
				this.workflow.connections[sourceData.node][sourceData.type][sourceData.index];
			for (const index in connections) {
				if (
					connections[index].node === destinationData.node &&
					connections[index].type === destinationData.type &&
					connections[index].index === destinationData.index
				) {
					// Found the connection to remove
					connections.splice(parseInt(index, 10), 1);
				}
			}
		},

		removeAllConnections(data: { setStateDirty: boolean }): void {
			if (data && data.setStateDirty) {
				const uiStore = useUIStore();
				uiStore.stateIsDirty = true;
			}
			this.workflow.connections = {};
		},

		removeAllNodeConnection(node: INodeUi): void {
			const uiStore = useUIStore();
			uiStore.stateIsDirty = true;
			// Remove all source connections
			if (this.workflow.connections.hasOwnProperty(node.name)) {
				delete this.workflow.connections[node.name];
			}

			// Remove all destination connections
			const indexesToRemove = [];
			let sourceNode: string,
				type: string,
				sourceIndex: string,
				connectionIndex: string,
				connectionData: IConnection;
			for (sourceNode of Object.keys(this.workflow.connections)) {
				for (type of Object.keys(this.workflow.connections[sourceNode])) {
					for (sourceIndex of Object.keys(this.workflow.connections[sourceNode][type])) {
						indexesToRemove.length = 0;
						for (connectionIndex of Object.keys(
							this.workflow.connections[sourceNode][type][parseInt(sourceIndex, 10)],
						)) {
							connectionData =
								this.workflow.connections[sourceNode][type][parseInt(sourceIndex, 10)][
									parseInt(connectionIndex, 10)
								];
							if (connectionData.node === node.name) {
								indexesToRemove.push(connectionIndex);
							}
						}

						indexesToRemove.forEach((index) => {
							this.workflow.connections[sourceNode][type][parseInt(sourceIndex, 10)].splice(
								parseInt(index, 10),
								1,
							);
						});
					}
				}
			}
		},

		renameNodeSelectedAndExecution(nameData: { old: string; new: string }): void {
			const uiStore = useUIStore();
			uiStore.stateIsDirty = true;
			// If node has any WorkflowResultData rename also that one that the data
			// does still get displayed also after node got renamed
			if (
				this.workflowExecutionData !== null &&
				this.workflowExecutionData.data &&
				this.workflowExecutionData.data.resultData.runData.hasOwnProperty(nameData.old)
			) {
				this.workflowExecutionData.data.resultData.runData[nameData.new] =
					this.workflowExecutionData.data.resultData.runData[nameData.old];
				delete this.workflowExecutionData.data.resultData.runData[nameData.old];
			}

			// In case the renamed node was last selected set it also there with the new name
			if (uiStore.lastSelectedNode === nameData.old) {
				uiStore.lastSelectedNode = nameData.new;
			}

			Vue.set(this.nodeMetadata, nameData.new, this.nodeMetadata[nameData.old]);
			Vue.delete(this.nodeMetadata, nameData.old);

			if (this.workflow.pinData && this.workflow.pinData.hasOwnProperty(nameData.old)) {
				Vue.set(this.workflow.pinData, nameData.new, this.workflow.pinData[nameData.old]);
				Vue.delete(this.workflow.pinData, nameData.old);
			}

			this.workflowExecutionPairedItemMappings = getPairedItemsMapping(this.workflowExecutionData);
		},

		resetAllNodesIssues(): boolean {
			this.workflow.nodes.forEach((node) => {
				node.issues = undefined;
			});
			return true;
		},

		setNodeIssue(nodeIssueData: INodeIssueData): boolean {
			const node = this.workflow.nodes.find((node) => {
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

		addNode(nodeData: INodeUi): void {
			if (!nodeData.hasOwnProperty('name')) {
				// All nodes have to have a name
				// TODO: Check if there is an error or whatever that is supposed to be returned
				return;
			}

			this.workflow.nodes.push(nodeData);
			// Init node metadata
			if (!this.nodeMetadata[nodeData.name]) {
				Vue.set(this.nodeMetadata, nodeData.name, {});
			}
		},

		removeNode(node: INodeUi): void {
			Vue.delete(this.nodeMetadata, node.name);

			if (this.workflow.pinData && this.workflow.pinData.hasOwnProperty(node.name)) {
				Vue.delete(this.workflow.pinData, node.name);
			}

			for (let i = 0; i < this.workflow.nodes.length; i++) {
				if (this.workflow.nodes[i].name === node.name) {
					this.workflow.nodes.splice(i, 1);
					const uiStore = useUIStore();
					uiStore.stateIsDirty = true;
					return;
				}
			}
		},

		removeAllNodes(data: { setStateDirty: boolean; removePinData: boolean }): void {
			if (data.setStateDirty) {
				const uiStore = useUIStore();
				uiStore.stateIsDirty = true;
			}

			if (data.removePinData) {
				Vue.set(this.workflow, 'pinData', {});
			}

			this.workflow.nodes.splice(0, this.workflow.nodes.length);
			this.nodeMetadata = {};
		},

		updateNodeProperties(updateInformation: INodeUpdatePropertiesInformation): void {
			// Find the node that should be updated
			const node = this.workflow.nodes.find((node) => {
				return node.name === updateInformation.name;
			});

			if (node) {
				for (const key of Object.keys(updateInformation.properties)) {
					const uiStore = useUIStore();
					uiStore.stateIsDirty = true;
					Vue.set(node, key, updateInformation.properties[key]);
				}
			}
		},

		setNodeValue(updateInformation: IUpdateInformation): void {
			// Find the node that should be updated
			const node = this.workflow.nodes.find((node) => {
				return node.name === updateInformation.name;
			});

			if (node === undefined || node === null || !updateInformation.key) {
				throw new Error(
					`Node with the name "${updateInformation.name}" could not be found to set parameter.`,
				);
			}

			const uiStore = useUIStore();
			uiStore.stateIsDirty = true;
			Vue.set(node, updateInformation.key, updateInformation.value);
		},

		setNodeParameters(updateInformation: IUpdateInformation, append?: boolean): void {
			// Find the node that should be updated
			const node = this.workflow.nodes.find((node) => {
				return node.name === updateInformation.name;
			});

			if (node === undefined || node === null) {
				throw new Error(
					`Node with the name "${updateInformation.name}" could not be found to set parameter.`,
				);
			}

			const uiStore = useUIStore();
			uiStore.stateIsDirty = true;
			const newParameters =
				!!append && isObjectLiteral(updateInformation.value)
					? { ...node.parameters, ...updateInformation.value }
					: updateInformation.value;

			Vue.set(node, 'parameters', newParameters);

			if (!this.nodeMetadata[node.name]) {
				Vue.set(this.nodeMetadata, node.name, {});
			}

			Vue.set(this.nodeMetadata[node.name], 'parametersLastUpdatedAt', Date.now());
		},

		setLastNodeParameters(updateInformation: IUpdateInformation) {
			const latestNode = this.workflow.nodes.findLast(
				(node) => node.type === updateInformation.key,
			) as INodeUi;
			const nodeType = useNodeTypesStore().getNodeType(latestNode.type);
			if (!nodeType) return;

			const nodeParams = NodeHelpers.getNodeParameters(
				nodeType.properties,
				updateInformation.value as INodeParameters,
				true,
				false,
				latestNode,
			);

			if (latestNode) this.setNodeParameters({ value: nodeParams, name: latestNode.name }, true);
		},

		addNodeExecutionData(pushData: IPushDataNodeExecuteAfter): void {
			if (this.workflowExecutionData === null || !this.workflowExecutionData.data) {
				throw new Error('The "workflowExecutionData" is not initialized!');
			}
			if (this.workflowExecutionData.data.resultData.runData[pushData.nodeName] === undefined) {
				Vue.set(this.workflowExecutionData.data.resultData.runData, pushData.nodeName, []);
			}
			this.workflowExecutionData.data.resultData.runData[pushData.nodeName].push(pushData.data);
			this.workflowExecutionPairedItemMappings = getPairedItemsMapping(this.workflowExecutionData);
		},
		clearNodeExecutionData(nodeName: string): void {
			if (this.workflowExecutionData === null || !this.workflowExecutionData.data) {
				return;
			}
			Vue.delete(this.workflowExecutionData.data.resultData.runData, nodeName);
		},

		pinDataByNodeName(nodeName: string): INodeExecutionData[] | undefined {
			if (!this.workflow.pinData || !this.workflow.pinData[nodeName]) return undefined;
			return this.workflow.pinData[nodeName].map((item) => item.json) as INodeExecutionData[];
		},

		activeNode(): INodeUi | null {
			// kept here for FE hooks
			const ndvStore = useNDVStore();
			return ndvStore.activeNode;
		},

		// Executions actions

		addActiveExecution(newActiveExecution: IExecutionsCurrentSummaryExtended): void {
			// Check if the execution exists already
			const activeExecution = this.activeExecutions.find((execution) => {
				return execution.id === newActiveExecution.id;
			});

			if (activeExecution !== undefined) {
				// Exists already so no need to add it again
				if (activeExecution.workflowName === undefined) {
					activeExecution.workflowName = newActiveExecution.workflowName;
				}
				return;
			}
			this.activeExecutions.unshift(newActiveExecution);
		},
		finishActiveExecution(
			finishedActiveExecution: IPushDataExecutionFinished | IPushDataUnsavedExecutionFinished,
		): void {
			// Find the execution to set to finished
			const activeExecution = this.activeExecutions.find((execution) => {
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
			if (finishedActiveExecution.data && (finishedActiveExecution.data as IRun).data) {
				this.setWorkflowExecutionRunData((finishedActiveExecution.data as IRun).data);
			}
		},

		setActiveExecutions(newActiveExecutions: IExecutionsCurrentSummaryExtended[]): void {
			Vue.set(this, 'activeExecutions', newActiveExecutions);
		},

		async loadCurrentWorkflowExecutions(
			requestFilter: ExecutionsQueryFilter,
		): Promise<IExecutionsSummary[]> {
			let activeExecutions = [];
			let finishedExecutions = [];

			if (!requestFilter.workflowId) {
				return [];
			}
			try {
				const rootStore = useRootStore();
				if ((!requestFilter.status || !requestFilter.finished) && isEmpty(requestFilter.metadata)) {
					activeExecutions = await getCurrentExecutions(rootStore.getRestApiContext, {
						workflowId: requestFilter.workflowId,
					});
				}
				finishedExecutions = await getFinishedExecutions(
					rootStore.getRestApiContext,
					requestFilter,
				);
				this.finishedExecutionsCount = finishedExecutions.count;
				return [...activeExecutions, ...(finishedExecutions.results || [])];
			} catch (error) {
				throw error;
			}
		},
		async fetchExecutionDataById(executionId: string): Promise<IExecutionResponse | null> {
			const rootStore = useRootStore();
			return await getExecutionData(rootStore.getRestApiContext, executionId);
		},
		deleteExecution(execution: IExecutionsSummary): void {
			this.currentWorkflowExecutions.splice(this.currentWorkflowExecutions.indexOf(execution), 1);
		},
		addToCurrentExecutions(executions: IExecutionsSummary[]): void {
			executions.forEach((execution) => {
				const exists = this.currentWorkflowExecutions.find((ex) => ex.id === execution.id);
				if (!exists && execution.workflowId === this.workflowId) {
					this.currentWorkflowExecutions.push(execution);
				}
			});
		},
		setNodePristine(nodeName: string, isPristine: boolean): void {
			Vue.set(this.nodeMetadata[nodeName], 'pristine', isPristine);
		},
	},
});
