import {
	ERROR_TRIGGER_NODE_TYPE,
	PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	START_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	VIEWS,
	EnterpriseEditionFeature,
} from '@/constants';

import {
	IConnections,
	IDataObject,
	INode,
	INodeExecutionData,
	INodeIssues,
	INodeParameters,
	NodeParameterValue,
	INodeCredentials,
	INodeType,
	INodeTypes,
	INodeTypeData,
	IPinData,
	IRunExecutionData,
	IWorkflowIssues,
	IWorkflowDataProxyAdditionalKeys,
	Workflow,
	NodeHelpers,
	IExecuteData,
	INodeConnection,
	IWebhookDescription,
	deepCopy,
} from 'n8n-workflow';

import {
	INodeTypesMaxCount,
	INodeUi,
	IWorkflowData,
	IWorkflowDb,
	IWorkflowDataUpdate,
	XYPosition,
	ITag,
	TargetItem,
} from '../Interface';

import { externalHooks } from '@/mixins/externalHooks';
import { restApi } from '@/mixins/restApi';
import { nodeHelpers } from '@/mixins/nodeHelpers';
import { showMessage } from '@/mixins/showMessage';

import { isEqual } from 'lodash-es';

import mixins from 'vue-typed-mixins';
import { v4 as uuid } from 'uuid';
import { getSourceItems } from '@/utils';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui';
import { useWorkflowsStore } from '@/stores/workflows';
import { useRootStore } from '@/stores/n8nRootStore';
import { IWorkflowSettings } from 'n8n-workflow';
import { useNDVStore } from '@/stores/ndv';
import { useTemplatesStore } from '@/stores/templates';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { useWorkflowsEEStore } from '@/stores/workflows.ee';
import { useUsersStore } from '@/stores/users';
import { getWorkflowPermissions, IPermissions } from '@/permissions';
import { ICredentialsResponse } from '@/Interface';

let cachedWorkflowKey: string | null = '';
let cachedWorkflow: Workflow | null = null;

export function resolveParameter(
	parameter: NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[],
	opts: {
		targetItem?: TargetItem;
		inputNodeName?: string;
		inputRunIndex?: number;
		inputBranchIndex?: number;
	} = {},
): IDataObject | null {
	let itemIndex = opts?.targetItem?.itemIndex || 0;

	const inputName = 'main';
	const activeNode = useNDVStore().activeNode;

	const workflow = getCurrentWorkflow();
	const workflowRunData = useWorkflowsStore().getWorkflowRunData;
	let parentNode = workflow.getParentNodes(activeNode!.name, inputName, 1);
	const executionData = useWorkflowsStore().getWorkflowExecution;

	if (opts?.inputNodeName && !parentNode.includes(opts.inputNodeName)) {
		return null;
	}

	let runIndexParent = opts?.inputRunIndex ?? 0;
	const nodeConnection = workflow.getNodeConnectionIndexes(activeNode!.name, parentNode[0]);
	if (opts.targetItem && opts?.targetItem?.nodeName === activeNode!.name && executionData) {
		const sourceItems = getSourceItems(executionData, opts.targetItem);
		if (!sourceItems.length) {
			return null;
		}
		parentNode = [sourceItems[0].nodeName];
		runIndexParent = sourceItems[0].runIndex;
		itemIndex = sourceItems[0].itemIndex;
		if (nodeConnection) {
			nodeConnection.sourceIndex = sourceItems[0].outputIndex;
		}
	} else {
		parentNode = opts.inputNodeName ? [opts.inputNodeName] : parentNode;
		if (nodeConnection) {
			nodeConnection.sourceIndex = opts.inputBranchIndex ?? nodeConnection.sourceIndex;
		}

		if (opts?.inputRunIndex === undefined && workflowRunData !== null && parentNode.length) {
			const firstParentWithWorkflowRunData = parentNode.find(
				(parentNodeName) => workflowRunData[parentNodeName],
			);
			if (firstParentWithWorkflowRunData) {
				runIndexParent = workflowRunData[firstParentWithWorkflowRunData].length - 1;
			}
		}
	}

	let _connectionInputData = connectionInputData(
		parentNode,
		activeNode!.name,
		inputName,
		runIndexParent,
		nodeConnection,
	);

	let runExecutionData: IRunExecutionData;
	if (executionData === null || !executionData.data) {
		runExecutionData = {
			resultData: {
				runData: {},
			},
		};
	} else {
		runExecutionData = executionData.data;
	}

	parentNode.forEach((parentNodeName) => {
		const pinData: IPinData[string] | undefined =
			useWorkflowsStore().pinDataByNodeName(parentNodeName);

		if (pinData) {
			runExecutionData = {
				...runExecutionData,
				resultData: {
					...runExecutionData.resultData,
					runData: {
						...runExecutionData.resultData.runData,
						[parentNodeName]: [
							{
								startTime: new Date().valueOf(),
								executionTime: 0,
								source: [],
								data: {
									main: [pinData.map((data) => ({ json: data }))],
								},
							},
						],
					},
				},
			};
		}
	});

	if (_connectionInputData === null) {
		_connectionInputData = [];
	}

	const additionalKeys: IWorkflowDataProxyAdditionalKeys = {
		$execution: {
			id: PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
			mode: 'test',
			resumeUrl: PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
		},

		// deprecated
		$executionId: PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
		$resumeWebhookUrl: PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
	};

	let runIndexCurrent = opts?.targetItem?.runIndex ?? 0;
	if (
		opts?.targetItem === undefined &&
		workflowRunData !== null &&
		workflowRunData[activeNode!.name]
	) {
		runIndexCurrent = workflowRunData[activeNode!.name].length - 1;
	}
	const _executeData = executeData(parentNode, activeNode!.name, inputName, runIndexCurrent);

	return workflow.expression.getParameterValue(
		parameter,
		runExecutionData,
		runIndexCurrent,
		itemIndex,
		activeNode!.name,
		_connectionInputData,
		'manual',
		useRootStore().timezone,
		additionalKeys,
		_executeData,
		false,
	) as IDataObject;
}

function getCurrentWorkflow(copyData?: boolean): Workflow {
	const nodes = getNodes();
	const connections = useWorkflowsStore().allConnections;
	const cacheKey = JSON.stringify({ nodes, connections });
	if (!copyData && cachedWorkflow && cacheKey === cachedWorkflowKey) {
		return cachedWorkflow;
	}
	cachedWorkflowKey = cacheKey;

	return getWorkflow(nodes, connections, copyData);
}

// Returns a shallow copy of the nodes which means that all the data on the lower
// levels still only gets referenced but the top level object is a different one.
// This has the advantage that it is very fast and does not cause problems with vuex
// when the workflow replaces the node-parameters.
function getNodes(): INodeUi[] {
	const nodes = useWorkflowsStore().allNodes;
	const returnNodes: INodeUi[] = [];

	for (const node of nodes) {
		returnNodes.push(Object.assign({}, node));
	}

	return returnNodes;
}

// Returns a workflow instance.
function getWorkflow(nodes: INodeUi[], connections: IConnections, copyData?: boolean): Workflow {
	const nodeTypes = getNodeTypes();
	let workflowId: string | undefined = useWorkflowsStore().workflowId;
	if (workflowId && workflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
		workflowId = undefined;
	}

	const workflowName = useWorkflowsStore().workflowName;

	cachedWorkflow = new Workflow({
		id: workflowId,
		name: workflowName,
		nodes: copyData ? deepCopy(nodes) : nodes,
		connections: copyData ? deepCopy(connections) : connections,
		active: false,
		nodeTypes,
		settings: useWorkflowsStore().workflowSettings,
		// @ts-ignore
		pinData: useWorkflowsStore().pinData,
	});

	return cachedWorkflow;
}

function getNodeTypes(): INodeTypes {
	const nodeTypes: INodeTypes = {
		nodeTypes: {},
		init: async (nodeTypes?: INodeTypeData): Promise<void> => {},
		// @ts-ignore
		getByNameAndVersion: (nodeType: string, version?: number): INodeType | undefined => {
			const nodeTypeDescription = useNodeTypesStore().getNodeType(nodeType, version);

			if (nodeTypeDescription === null) {
				return undefined;
			}

			return {
				description: nodeTypeDescription,
				// As we do not have the trigger/poll functions available in the frontend
				// we use the information available to figure out what are trigger nodes
				// @ts-ignore
				trigger:
					(![ERROR_TRIGGER_NODE_TYPE, START_NODE_TYPE].includes(nodeType) &&
						nodeTypeDescription.inputs.length === 0 &&
						!nodeTypeDescription.webhooks) ||
					undefined,
			};
		},
	};

	return nodeTypes;
}

// Returns connectionInputData to be able to execute an expression.
function connectionInputData(
	parentNode: string[],
	currentNode: string,
	inputName: string,
	runIndex: number,
	nodeConnection: INodeConnection = { sourceIndex: 0, destinationIndex: 0 },
): INodeExecutionData[] | null {
	let connectionInputData: INodeExecutionData[] | null = null;
	const _executeData = executeData(parentNode, currentNode, inputName, runIndex);
	if (parentNode.length) {
		if (
			!Object.keys(_executeData.data).length ||
			_executeData.data[inputName].length <= nodeConnection.sourceIndex
		) {
			connectionInputData = [];
		} else {
			connectionInputData = _executeData.data![inputName][nodeConnection.sourceIndex];

			if (connectionInputData !== null) {
				// Update the pairedItem information on items
				connectionInputData = connectionInputData.map((item, itemIndex) => {
					return {
						...item,
						pairedItem: {
							item: itemIndex,
							input: nodeConnection.destinationIndex,
						},
					};
				});
			}
		}
	}

	const parentPinData = parentNode.reduce((acc: INodeExecutionData[], parentNodeName, index) => {
		const pinData = useWorkflowsStore().pinDataByNodeName(parentNodeName);

		if (pinData) {
			acc.push({
				json: pinData[0],
				pairedItem: {
					item: index,
					input: 1,
				},
			});
		}

		return acc;
	}, []);

	if (parentPinData.length > 0) {
		if (connectionInputData && connectionInputData.length > 0) {
			parentPinData.forEach((parentPinDataEntry) => {
				connectionInputData![0].json = {
					...connectionInputData![0].json,
					...parentPinDataEntry.json,
				};
			});
		} else {
			connectionInputData = parentPinData;
		}
	}

	return connectionInputData;
}

function executeData(
	parentNode: string[],
	currentNode: string,
	inputName: string,
	runIndex: number,
): IExecuteData {
	const executeData = {
		node: {},
		data: {},
		source: null,
	} as IExecuteData;

	if (parentNode.length) {
		// Add the input data to be able to also resolve the short expression format
		// which does not use the node name
		const parentNodeName = parentNode[0];

		const parentPinData = useWorkflowsStore().getPinData![parentNodeName];

		// populate `executeData` from `pinData`

		if (parentPinData) {
			executeData.data = { main: [parentPinData] };
			executeData.source = { main: [{ previousNode: parentNodeName }] };

			return executeData;
		}

		// populate `executeData` from `runData`

		const workflowRunData = useWorkflowsStore().getWorkflowRunData;
		if (workflowRunData === null) {
			return executeData;
		}

		if (
			!workflowRunData[parentNodeName] ||
			workflowRunData[parentNodeName].length <= runIndex ||
			!workflowRunData[parentNodeName][runIndex] ||
			!workflowRunData[parentNodeName][runIndex].hasOwnProperty('data') ||
			workflowRunData[parentNodeName][runIndex].data === undefined ||
			!workflowRunData[parentNodeName][runIndex].data!.hasOwnProperty(inputName)
		) {
			executeData.data = {};
		} else {
			executeData.data = workflowRunData[parentNodeName][runIndex].data!;
			if (workflowRunData[currentNode] && workflowRunData[currentNode][runIndex]) {
				executeData.source = {
					[inputName]: workflowRunData[currentNode][runIndex].source!,
				};
			} else {
				// The current node did not get executed in UI yet so build data manually
				executeData.source = {
					[inputName]: [
						{
							previousNode: parentNodeName,
						},
					],
				};
			}
		}
	}

	return executeData;
}

export const workflowHelpers = mixins(externalHooks, nodeHelpers, restApi, showMessage).extend({
	computed: {
		...mapStores(
			useNodeTypesStore,
			useNDVStore,
			useRootStore,
			useTemplatesStore,
			useWorkflowsStore,
			useWorkflowsEEStore,
			useUsersStore,
			useUIStore,
		),
		workflowPermissions(): IPermissions {
			return getWorkflowPermissions(this.usersStore.currentUser, this.workflowsStore.workflow);
		},
	},
	methods: {
		resolveParameter,
		getCurrentWorkflow,
		getNodes,
		getWorkflow,
		getNodeTypes,
		connectionInputData,
		executeData,

		// Returns data about nodeTypes which have a "maxNodes" limit set.
		// For each such type does it return how high the limit is, how many
		// already exist and the name of this nodes.
		getNodeTypesMaxCount(): INodeTypesMaxCount {
			const nodes = this.workflowsStore.allNodes;

			const returnData: INodeTypesMaxCount = {};

			const nodeTypes = this.nodeTypesStore.allNodeTypes;
			for (const nodeType of nodeTypes) {
				if (nodeType.maxNodes !== undefined) {
					returnData[nodeType.name] = {
						exist: 0,
						max: nodeType.maxNodes,
						nodeNames: [],
					};
				}
			}

			for (const node of nodes) {
				if (returnData[node.type] !== undefined) {
					returnData[node.type].exist += 1;
					returnData[node.type].nodeNames.push(node.name);
				}
			}

			return returnData;
		},

		// Returns how many nodes of the given type currently exist
		getNodeTypeCount(nodeType: string): number {
			const nodes = this.workflowsStore.allNodes;

			let count = 0;

			for (const node of nodes) {
				if (node.type === nodeType) {
					count++;
				}
			}

			return count;
		},

		// Checks if everything in the workflow is complete and ready to be executed
		checkReadyForExecution(workflow: Workflow, lastNodeName?: string) {
			let node: INode;
			let nodeType: INodeType | undefined;
			let nodeIssues: INodeIssues | null = null;
			const workflowIssues: IWorkflowIssues = {};

			let checkNodes = Object.keys(workflow.nodes);
			if (lastNodeName) {
				checkNodes = workflow.getParentNodes(lastNodeName);
				checkNodes.push(lastNodeName);
			} else {
				// As webhook nodes always take precedence check first
				// if there are any
				let checkWebhook: string[] = [];
				for (const nodeName of Object.keys(workflow.nodes)) {
					if (
						workflow.nodes[nodeName].disabled !== true &&
						workflow.nodes[nodeName].type === WEBHOOK_NODE_TYPE
					) {
						checkWebhook = [nodeName, ...checkWebhook, ...workflow.getChildNodes(nodeName)];
					}
				}

				if (checkWebhook.length) {
					checkNodes = checkWebhook;
				} else {
					// If no webhook nodes got found try to find another trigger node
					const startNode = workflow.getStartNode();
					if (startNode !== undefined) {
						checkNodes = workflow.getChildNodes(startNode.name);
						checkNodes.push(startNode.name);
					}
				}
			}

			for (const nodeName of checkNodes) {
				nodeIssues = null;
				node = workflow.nodes[nodeName];

				if (node.disabled === true) {
					// Ignore issues on disabled nodes
					continue;
				}

				nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

				if (nodeType === undefined) {
					// Node type is not known
					nodeIssues = {
						typeUnknown: true,
					};
				} else {
					nodeIssues = this.getNodeIssues(nodeType.description, node, ['execution']);
				}

				if (nodeIssues !== null) {
					workflowIssues[node.name] = nodeIssues;
				}
			}

			if (Object.keys(workflowIssues).length === 0) {
				return null;
			}

			return workflowIssues;
		},

		// Returns the currently loaded workflow as JSON.
		getWorkflowDataToSave(): Promise<IWorkflowData> {
			const workflowNodes = this.workflowsStore.allNodes;
			const workflowConnections = this.workflowsStore.allConnections;

			let nodeData;

			const nodes = [];
			for (let nodeIndex = 0; nodeIndex < workflowNodes.length; nodeIndex++) {
				try {
					// @ts-ignore
					nodeData = this.getNodeDataToSave(workflowNodes[nodeIndex]);
				} catch (e) {
					return Promise.reject(e);
				}

				nodes.push(nodeData);
			}

			const data: IWorkflowData = {
				name: this.workflowsStore.workflowName,
				nodes,
				pinData: this.workflowsStore.getPinData,
				connections: workflowConnections,
				active: this.workflowsStore.isWorkflowActive,
				settings: this.workflowsStore.workflow.settings,
				tags: this.workflowsStore.workflowTags,
				versionId: this.workflowsStore.workflow.versionId,
			};

			const workflowId = this.workflowsStore.workflowId;
			if (workflowId !== PLACEHOLDER_EMPTY_WORKFLOW_ID) {
				data.id = workflowId;
			}

			return Promise.resolve(data);
		},

		// Returns all node-types
		getNodeDataToSave(node: INodeUi): INodeUi {
			const skipKeys = [
				'color',
				'continueOnFail',
				'credentials',
				'disabled',
				'issues',
				'notes',
				'parameters',
				'status',
			];

			// @ts-ignore
			const nodeData: INodeUi = {
				parameters: {},
			};

			for (const key in node) {
				if (key.charAt(0) !== '_' && skipKeys.indexOf(key) === -1) {
					// @ts-ignore
					nodeData[key] = node[key];
				}
			}

			// Get the data of the node type that we can get the default values
			// TODO: Later also has to care about the node-type-version as defaults could be different
			const nodeType = this.nodeTypesStore.getNodeType(node.type, node.typeVersion);

			if (nodeType !== null) {
				// Node-Type is known so we can save the parameters correctly
				const nodeParameters = NodeHelpers.getNodeParameters(
					nodeType.properties,
					node.parameters,
					false,
					false,
					node,
				);
				nodeData.parameters = nodeParameters !== null ? nodeParameters : {};

				// Add the node credentials if there are some set and if they should be displayed
				if (node.credentials !== undefined && nodeType.credentials !== undefined) {
					const saveCredentials: INodeCredentials = {};
					for (const nodeCredentialTypeName of Object.keys(node.credentials)) {
						if (
							this.hasProxyAuth(node) ||
							Object.keys(node.parameters).includes('genericAuthType')
						) {
							saveCredentials[nodeCredentialTypeName] = node.credentials[nodeCredentialTypeName];
							continue;
						}

						const credentialTypeDescription = nodeType.credentials
							// filter out credentials with same name in different node versions
							.filter((c) => this.displayParameter(node.parameters, c, '', node))
							.find((c) => c.name === nodeCredentialTypeName);

						if (credentialTypeDescription === undefined) {
							// Credential type is not know so do not save
							continue;
						}

						if (
							this.displayParameter(node.parameters, credentialTypeDescription, '', node) === false
						) {
							// Credential should not be displayed so do also not save
							continue;
						}

						saveCredentials[nodeCredentialTypeName] = node.credentials[nodeCredentialTypeName];
					}

					// Set credential property only if it has content
					if (Object.keys(saveCredentials).length !== 0) {
						nodeData.credentials = saveCredentials;
					}
				}
			} else {
				// Node-Type is not known so save the data as it is
				nodeData.credentials = node.credentials;
				nodeData.parameters = node.parameters;
				if (nodeData.color !== undefined) {
					nodeData.color = node.color;
				}
			}

			// Save the disabled property and continueOnFail only when is set
			if (node.disabled === true) {
				nodeData.disabled = true;
			}
			if (node.continueOnFail === true) {
				nodeData.continueOnFail = true;
			}

			// Save the notes only if when they contain data
			if (![undefined, ''].includes(node.notes)) {
				nodeData.notes = node.notes;
			}

			return nodeData;
		},

		getWebhookExpressionValue(webhookData: IWebhookDescription, key: string): string {
			if (webhookData[key] === undefined) {
				return 'empty';
			}
			try {
				return this.resolveExpression(webhookData[key] as string) as string;
			} catch (e) {
				return this.$locale.baseText('nodeWebhooks.invalidExpression');
			}
		},

		getWebhookUrl(webhookData: IWebhookDescription, node: INode, showUrlFor?: string): string {
			if (webhookData.restartWebhook === true) {
				return '$execution.resumeUrl';
			}
			let baseUrl = this.rootStore.getWebhookUrl;
			if (showUrlFor === 'test') {
				baseUrl = this.rootStore.getWebhookTestUrl;
			}

			const workflowId = this.workflowsStore.workflowId;
			const path = this.getWebhookExpressionValue(webhookData, 'path');
			const isFullPath =
				(this.getWebhookExpressionValue(webhookData, 'isFullPath') as unknown as boolean) || false;

			return NodeHelpers.getNodeWebhookUrl(baseUrl, workflowId, node, path, isFullPath);
		},

		resolveExpression(
			expression: string,
			siblingParameters: INodeParameters = {},
			opts: {
				targetItem?: TargetItem;
				inputNodeName?: string;
				inputRunIndex?: number;
				inputBranchIndex?: number;
				c?: number;
			} = {},
		) {
			const parameters = {
				__xxxxxxx__: expression,
				...siblingParameters,
			};
			const returnData: IDataObject | null = resolveParameter(parameters, opts);
			if (!returnData) {
				return null;
			}

			if (typeof returnData['__xxxxxxx__'] === 'object') {
				const workflow = getCurrentWorkflow();
				return workflow.expression.convertObjectValueToString(returnData['__xxxxxxx__'] as object);
			}
			return returnData['__xxxxxxx__'];
		},

		async updateWorkflow({ workflowId, active }: { workflowId: string; active?: boolean }) {
			let data: IWorkflowDataUpdate = {};

			const isCurrentWorkflow = workflowId === this.workflowsStore.workflowId;
			if (isCurrentWorkflow) {
				data = await this.getWorkflowDataToSave();
			} else {
				const { versionId } = await this.restApi().getWorkflow(workflowId);
				data.versionId = versionId;
			}

			if (active !== undefined) {
				data.active = active;
			}

			const workflow = await this.restApi().updateWorkflow(workflowId, data);
			this.workflowsStore.setWorkflowVersionId(workflow.versionId);

			if (isCurrentWorkflow) {
				this.workflowsStore.setActive(!!workflow.active);
				this.uiStore.stateIsDirty = false;
			}

			if (workflow.active) {
				this.workflowsStore.setWorkflowActive(workflowId);
			} else {
				this.workflowsStore.setWorkflowInactive(workflowId);
			}
		},

		async saveCurrentWorkflow(
			{ id, name, tags }: { id?: string; name?: string; tags?: string[] } = {},
			redirect = true,
			forceSave = false,
		): Promise<boolean> {
			const currentWorkflow = id || this.$route.params.name;

			if (!currentWorkflow || ['new', PLACEHOLDER_EMPTY_WORKFLOW_ID].includes(currentWorkflow)) {
				return this.saveAsNewWorkflow({ name, tags }, redirect);
			}

			// Workflow exists already so update it
			try {
				this.uiStore.addActiveAction('workflowSaving');

				const workflowDataRequest: IWorkflowDataUpdate = await this.getWorkflowDataToSave();

				if (name) {
					workflowDataRequest.name = name.trim();
				}

				if (tags) {
					workflowDataRequest.tags = tags;
				}

				workflowDataRequest.versionId = this.workflowsStore.workflowVersionId;

				const workflowData = await this.restApi().updateWorkflow(
					currentWorkflow,
					workflowDataRequest,
					forceSave,
				);
				this.workflowsStore.setWorkflowVersionId(workflowData.versionId);

				if (name) {
					this.workflowsStore.setWorkflowName({ newName: workflowData.name, setStateDirty: false });
				}

				if (tags) {
					const createdTags = (workflowData.tags || []) as ITag[];
					const tagIds = createdTags.map((tag: ITag): string => tag.id);
					this.workflowsStore.setWorkflowTagIds(tagIds);
				}

				this.uiStore.stateIsDirty = false;
				this.uiStore.removeActiveAction('workflowSaving');
				this.$externalHooks().run('workflow.afterUpdate', { workflowData });

				return true;
			} catch (error) {
				this.uiStore.removeActiveAction('workflowSaving');

				if (error.errorCode === 100) {
					this.$telemetry.track('User attempted to save locked workflow', {
						workflowId: currentWorkflow,
						sharing_role: this.workflowPermissions.isOwner ? 'owner' : 'sharee',
					});

					const url = this.$router.resolve({
						name: VIEWS.WORKFLOW,
						params: { name: currentWorkflow },
					}).href;

					const overwrite = await this.confirmMessage(
						this.$locale.baseText('workflows.concurrentChanges.confirmMessage.message', {
							interpolate: {
								url,
							},
						}),
						this.$locale.baseText('workflows.concurrentChanges.confirmMessage.title'),
						null,
						this.$locale.baseText('workflows.concurrentChanges.confirmMessage.confirmButtonText'),
						this.$locale.baseText('workflows.concurrentChanges.confirmMessage.cancelButtonText'),
					);

					if (overwrite) {
						return this.saveCurrentWorkflow({ id, name, tags }, redirect, true);
					}

					return false;
				}

				this.$showMessage({
					title: this.$locale.baseText('workflowHelpers.showMessage.title'),
					message: error.message,
					type: 'error',
				});

				return false;
			}
		},

		async saveAsNewWorkflow(
			{
				name,
				tags,
				resetWebhookUrls,
				resetNodeIds,
				openInNewWindow,
				data,
			}: {
				name?: string;
				tags?: string[];
				resetWebhookUrls?: boolean;
				openInNewWindow?: boolean;
				resetNodeIds?: boolean;
				data?: IWorkflowDataUpdate;
			} = {},
			redirect = true,
		): Promise<boolean> {
			try {
				this.uiStore.addActiveAction('workflowSaving');

				const workflowDataRequest: IWorkflowDataUpdate =
					data || (await this.getWorkflowDataToSave());
				// make sure that the new ones are not active
				workflowDataRequest.active = false;
				const changedNodes = {} as IDataObject;

				if (resetNodeIds) {
					workflowDataRequest.nodes = workflowDataRequest.nodes!.map((node) => {
						node.id = uuid();

						return node;
					});
				}

				if (resetWebhookUrls) {
					workflowDataRequest.nodes = workflowDataRequest.nodes!.map((node) => {
						if (node.webhookId) {
							node.webhookId = uuid();
							changedNodes[node.name] = node.webhookId;
						}
						return node;
					});
				}

				if (name) {
					workflowDataRequest.name = name.trim();
				}

				if (tags) {
					workflowDataRequest.tags = tags;
				}
				const workflowData = await this.restApi().createNewWorkflow(workflowDataRequest);

				this.workflowsStore.addWorkflow(workflowData);

				if (
					this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing) &&
					this.usersStore.currentUser
				) {
					this.workflowsEEStore.setWorkflowOwnedBy({
						workflowId: workflowData.id,
						ownedBy: this.usersStore.currentUser,
					});
				}

				if (openInNewWindow) {
					const routeData = this.$router.resolve({
						name: VIEWS.WORKFLOW,
						params: { name: workflowData.id },
					});
					window.open(routeData.href, '_blank');
					this.uiStore.removeActiveAction('workflowSaving');
					return true;
				}

				this.workflowsStore.setActive(workflowData.active || false);
				this.workflowsStore.setWorkflowId(workflowData.id);
				this.workflowsStore.setWorkflowVersionId(workflowData.versionId);
				this.workflowsStore.setWorkflowName({ newName: workflowData.name, setStateDirty: false });
				this.workflowsStore.setWorkflowSettings((workflowData.settings as IWorkflowSettings) || {});
				this.uiStore.stateIsDirty = false;
				Object.keys(changedNodes).forEach((nodeName) => {
					const changes = {
						key: 'webhookId',
						value: changedNodes[nodeName],
						name: nodeName,
					};
					this.workflowsStore.setNodeValue(changes);
				});

				const createdTags = (workflowData.tags || []) as ITag[];
				const tagIds = createdTags.map((tag: ITag): string => tag.id);
				this.workflowsStore.setWorkflowTagIds(tagIds);

				const templateId = this.$route.query.templateId;
				if (templateId) {
					this.$telemetry.track('User saved new workflow from template', {
						template_id: templateId,
						workflow_id: workflowData.id,
						wf_template_repo_session_id: this.templatesStore.previousSessionId,
					});
				}

				if (redirect) {
					this.$router.replace({
						name: VIEWS.WORKFLOW,
						params: { name: workflowData.id as string, action: 'workflowSave' },
					});
				}

				this.uiStore.removeActiveAction('workflowSaving');
				this.uiStore.stateIsDirty = false;
				this.$externalHooks().run('workflow.afterUpdate', { workflowData });

				getCurrentWorkflow(true); // refresh cache
				return true;
			} catch (e) {
				this.uiStore.removeActiveAction('workflowSaving');

				this.$showMessage({
					title: this.$locale.baseText('workflowHelpers.showMessage.title'),
					message: (e as Error).message,
					type: 'error',
				});

				return false;
			}
		},

		// Updates the position of all the nodes that the top-left node
		// is at the given position
		updateNodePositions(
			workflowData: IWorkflowData | IWorkflowDataUpdate,
			position: XYPosition,
		): void {
			if (workflowData.nodes === undefined) {
				return;
			}

			// Find most top-left node
			const minPosition = [99999999, 99999999];
			for (const node of workflowData.nodes) {
				if (node.position[1] < minPosition[1]) {
					minPosition[0] = node.position[0];
					minPosition[1] = node.position[1];
				} else if (node.position[1] === minPosition[1]) {
					if (node.position[0] < minPosition[0]) {
						minPosition[0] = node.position[0];
						minPosition[1] = node.position[1];
					}
				}
			}

			// Update the position on all nodes so that the
			// most top-left one is at given position
			const offsetPosition = [position[0] - minPosition[0], position[1] - minPosition[1]];
			for (const node of workflowData.nodes) {
				node.position[0] += offsetPosition[0];
				node.position[1] += offsetPosition[1];
			}
		},
		async dataHasChanged(id: string) {
			const currentData = await this.getWorkflowDataToSave();

			const data: IWorkflowDb = await this.restApi().getWorkflow(id);

			if (data !== undefined) {
				const x = {
					nodes: data.nodes,
					connections: data.connections,
					settings: data.settings,
					name: data.name,
				};
				const y = {
					nodes: currentData.nodes,
					connections: currentData.connections,
					settings: currentData.settings,
					name: currentData.name,
				};
				return !isEqual(x, y);
			}

			return true;
		},

		removeForeignCredentialsFromWorkflow(
			workflow: IWorkflowData | IWorkflowDataUpdate,
			usableCredentials: ICredentialsResponse[],
		): void {
			workflow.nodes.forEach((node: INode) => {
				if (!node.credentials) {
					return;
				}

				node.credentials = Object.entries(node.credentials).reduce<INodeCredentials>(
					(acc, [credentialType, credential]) => {
						const isUsableCredential = usableCredentials.some(
							(ownCredential) => `${ownCredential.id}` === `${credential.id}`,
						);
						if (credential.id && isUsableCredential) {
							acc[credentialType] = node.credentials![credentialType];
						}

						return acc;
					},
					{},
				);
			});
		},
	},
});
