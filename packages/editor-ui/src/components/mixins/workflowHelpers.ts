import {
	ERROR_TRIGGER_NODE_TYPE,
	PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	START_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
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
	INodeTypeDescription,
	INodeVersionedType,
	IRunData,
	IRunExecutionData,
	IWorfklowIssues,
	IWorkflowDataProxyAdditionalKeys,
	Workflow,
	NodeHelpers,
} from 'n8n-workflow';

import {
	IExecutionResponse,
	INodeTypesMaxCount,
	INodeUi,
	IWorkflowData,
	IWorkflowDb,
	IWorkflowDataUpdate,
	XYPosition,
	ITag,
	IUpdateInformation,
} from '../../Interface';

import { externalHooks } from '@/components/mixins/externalHooks';
import { restApi } from '@/components/mixins/restApi';
import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import { showMessage } from '@/components/mixins/showMessage';

import { isEqual } from 'lodash';

import mixins from 'vue-typed-mixins';
import { v4 as uuidv4 } from 'uuid';

export const workflowHelpers = mixins(
	externalHooks,
	nodeHelpers,
	restApi,
	showMessage,
)
	.extend({
		methods: {
			// Returns connectionInputData to be able to execute an expression.
			connectionInputData (parentNode: string[], inputName: string, runIndex: number, inputIndex: number): INodeExecutionData[] | null {
				let connectionInputData = null;

				if (parentNode.length) {
					// Add the input data to be able to also resolve the short expression format
					// which does not use the node name
					const parentNodeName = parentNode[0];

					const workflowRunData = this.$store.getters.getWorkflowRunData as IRunData | null;
					if (workflowRunData === null) {
						return null;
					}
					if (!workflowRunData[parentNodeName] ||
						workflowRunData[parentNodeName].length <= runIndex ||
						!workflowRunData[parentNodeName][runIndex].hasOwnProperty('data') ||
						workflowRunData[parentNodeName][runIndex].data === undefined ||
						!workflowRunData[parentNodeName][runIndex].data!.hasOwnProperty(inputName) ||
						workflowRunData[parentNodeName][runIndex].data![inputName].length <= inputIndex
					) {
						connectionInputData = [];
					} else {
						connectionInputData = workflowRunData[parentNodeName][runIndex].data![inputName][inputIndex];
					}
				}

				return connectionInputData;
			},

			// Returns a shallow copy of the nodes which means that all the data on the lower
			// levels still only gets referenced but the top level object is a different one.
			// This has the advantage that it is very fast and does not cause problems with vuex
			// when the workflow replaces the node-parameters.
			getNodes (): INodeUi[] {
				const nodes = this.$store.getters.allNodes;
				const returnNodes: INodeUi[] = [];

				for (const node of nodes) {
					returnNodes.push(Object.assign({}, node));
				}

				return returnNodes;
			},

			// Returns data about nodeTypes which ahve a "maxNodes" limit set.
			// For each such type does it return how high the limit is, how many
			// already exist and the name of this nodes.
			getNodeTypesMaxCount (): INodeTypesMaxCount {
				const nodes = this.$store.getters.allNodes;

				const returnData: INodeTypesMaxCount = {};

				const nodeTypes = this.$store.getters.allNodeTypes;
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
			getNodeTypeCount (nodeType: string): number {
				const nodes = this.$store.getters.allNodes;

				let count = 0;

				for (const node of nodes) {
					if (node.type === nodeType) {
						count++;
					}
				}

				return count;
			},

			// Checks if everything in the workflow is complete and ready to be executed
			checkReadyForExecution (workflow: Workflow, lastNodeName?: string) {
				let node: INode;
				let nodeType: INodeType | undefined;
				let nodeIssues: INodeIssues | null = null;
				const workflowIssues: IWorfklowIssues = {};

				let checkNodes = Object.keys(workflow.nodes);
				if (lastNodeName) {
					checkNodes = workflow.getParentNodes(lastNodeName);
					checkNodes.push(lastNodeName);
				} else {
					// As webhook nodes always take presidence check first
					// if there are any
					let checkWebhook: string[] = [];
					for (const nodeName of Object.keys(workflow.nodes)) {
						if (workflow.nodes[nodeName].disabled !== true && workflow.nodes[nodeName].type === WEBHOOK_NODE_TYPE) {
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

			// Returns a workflow instance.
			getWorkflow (nodes?: INodeUi[], connections?: IConnections, copyData?: boolean): Workflow {
				nodes = nodes || this.getNodes();
				connections = connections || (this.$store.getters.allConnections as IConnections);

				const nodeTypes: INodeTypes = {
					nodeTypes: {},
					init: async (nodeTypes?: INodeTypeData): Promise<void> => { },
					getAll: (): Array<INodeType | INodeVersionedType> => {
						// Does not get used in Workflow so no need to return it
						return [];
					},
					getByNameAndVersion: (nodeType: string, version?: number): INodeType | undefined => {
						const nodeTypeDescription = this.$store.getters.nodeType(nodeType, version) as INodeTypeDescription | null;

						if (nodeTypeDescription === null) {
							return undefined;
						}

						return {
							description: nodeTypeDescription,
							// As we do not have the trigger/poll functions available in the frontend
							// we use the information available to figure out what are trigger nodes
							// @ts-ignore
							trigger: ![ERROR_TRIGGER_NODE_TYPE, START_NODE_TYPE].includes(nodeType) && nodeTypeDescription.inputs.length === 0 && !nodeTypeDescription.webhooks || undefined,
						};
					},
				};

				let workflowId = this.$store.getters.workflowId;
				if (workflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
					workflowId = undefined;
				}

				const workflowName = this.$store.getters.workflowName;

				if (copyData === true) {
					return new Workflow({ id: workflowId, name: workflowName, nodes: JSON.parse(JSON.stringify(nodes)), connections: JSON.parse(JSON.stringify(connections)), active: false, nodeTypes});
				} else {
					return new Workflow({ id: workflowId, name: workflowName, nodes, connections, active: false, nodeTypes});
				}
			},

			// Returns the currently loaded workflow as JSON.
			getWorkflowDataToSave (): Promise<IWorkflowData> {
				const workflowNodes = this.$store.getters.allNodes;
				const workflowConnections = this.$store.getters.allConnections;

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
					name: this.$store.getters.workflowName,
					nodes,
					connections: workflowConnections,
					active: this.$store.getters.isActive,
					settings: this.$store.getters.workflowSettings,
					tags: this.$store.getters.workflowTags,
				};

				const workflowId = this.$store.getters.workflowId;
				if (workflowId !== PLACEHOLDER_EMPTY_WORKFLOW_ID) {
					data.id = workflowId;
				}

				return Promise.resolve(data);
			},

			// Returns all node-types
			getNodeDataToSave (node: INodeUi): INodeUi {
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
				const nodeType = this.$store.getters.nodeType(node.type, node.typeVersion) as INodeTypeDescription | null;

				if (nodeType !== null) {
					// Node-Type is known so we can save the parameters correctly

					const nodeParameters = NodeHelpers.getNodeParameters(nodeType.properties, node.parameters, false, false);
					nodeData.parameters = nodeParameters !== null ? nodeParameters : {};

					// Add the node credentials if there are some set and if they should be displayed
					if (node.credentials !== undefined && nodeType.credentials !== undefined) {
						const saveCredenetials: INodeCredentials = {};
						for (const nodeCredentialTypeName of Object.keys(node.credentials)) {
							const credentialTypeDescription = nodeType.credentials
								.find((credentialTypeDescription) => credentialTypeDescription.name === nodeCredentialTypeName);

							if (credentialTypeDescription === undefined) {
								// Credential type is not know so do not save
								continue;
							}

							if (this.displayParameter(node.parameters, credentialTypeDescription, '') === false) {
								// Credential should not be displayed so do also not save
								continue;
							}

							saveCredenetials[nodeCredentialTypeName] = node.credentials[nodeCredentialTypeName];
						}

						// Set credential property only if it has content
						if (Object.keys(saveCredenetials).length !== 0) {
							nodeData.credentials = saveCredenetials;
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


			resolveParameter(parameter: NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[]) {
				const itemIndex = 0;
				const runIndex = 0;
				const inputName = 'main';
				const activeNode = this.$store.getters.activeNode;
				const workflow = this.getWorkflow();
				const parentNode = workflow.getParentNodes(activeNode.name, inputName, 1);
				const executionData = this.$store.getters.getWorkflowExecution as IExecutionResponse | null;
				const inputIndex = workflow.getNodeConnectionOutputIndex(activeNode!.name, parentNode[0]) || 0;
				let connectionInputData = this.connectionInputData(parentNode, inputName, runIndex, inputIndex);

				let runExecutionData: IRunExecutionData;
				if (executionData === null) {
					runExecutionData = {
						resultData: {
							runData: {},
						},
					};
				} else {
					runExecutionData = executionData.data;
				}

				if (connectionInputData === null) {
					connectionInputData = [];
				}

				const additionalKeys: IWorkflowDataProxyAdditionalKeys = {
					$executionId: PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
					$resumeWebhookUrl: PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
				};

				return workflow.expression.getParameterValue(parameter, runExecutionData, runIndex, itemIndex, activeNode.name, connectionInputData, 'manual', additionalKeys, false) as IDataObject;
			},

			resolveExpression(expression: string, siblingParameters: INodeParameters = {}) {

				const parameters = {
					'__xxxxxxx__': expression,
					...siblingParameters,
				};
				const returnData = this.resolveParameter(parameters) as IDataObject;

				if (typeof returnData['__xxxxxxx__'] === 'object') {
					const workflow = this.getWorkflow();
					return workflow.expression.convertObjectValueToString(returnData['__xxxxxxx__'] as object);
				}
				return returnData['__xxxxxxx__'];
			},

			async updateWorkflow({workflowId, active}: {workflowId: string, active?: boolean}) {
				let data: IWorkflowDataUpdate = {};

				const isCurrentWorkflow = workflowId === this.$store.getters.workflowId;
				if (isCurrentWorkflow) {
					data = await this.getWorkflowDataToSave();
				}

				if (active !== undefined) {
					data.active = active;
				}

				const workflow = await this.restApi().updateWorkflow(workflowId, data);

				if (isCurrentWorkflow) {
					this.$store.commit('setActive', !!workflow.active);
					this.$store.commit('setStateDirty', false);
				}

				if (workflow.active) {
					this.$store.commit('setWorkflowActive', workflowId);
				} else {
					this.$store.commit('setWorkflowInactive', workflowId);
				}
			},

			async saveCurrentWorkflow({name, tags}: {name?: string, tags?: string[]} = {}, redirect = true): Promise<boolean> {
				const currentWorkflow = this.$route.params.name;
				if (!currentWorkflow) {
					return this.saveAsNewWorkflow({name, tags}, redirect);
				}

				// Workflow exists already so update it
				try {
					this.$store.commit('addActiveAction', 'workflowSaving');

					const workflowDataRequest: IWorkflowDataUpdate = await this.getWorkflowDataToSave();

					if (name) {
						workflowDataRequest.name = name.trim();
					}

					if (tags) {
						workflowDataRequest.tags = tags;
					}

					const workflowData = await this.restApi().updateWorkflow(currentWorkflow, workflowDataRequest);

					if (name) {
						this.$store.commit('setWorkflowName', {newName: workflowData.name});
					}

					if (tags) {
						const createdTags = (workflowData.tags || []) as ITag[];
						const tagIds = createdTags.map((tag: ITag): string => tag.id);
						this.$store.commit('setWorkflowTagIds', tagIds);
					}

					this.$store.commit('setStateDirty', false);
					this.$store.commit('removeActiveAction', 'workflowSaving');
					this.$externalHooks().run('workflow.afterUpdate', { workflowData });

					return true;
				} catch (error) {
					this.$store.commit('removeActiveAction', 'workflowSaving');

					this.$showMessage({
						title: this.$locale.baseText('workflowHelpers.showMessage.title'),
						message: error.message,
						type: 'error',
					});

					return false;
				}
			},

			async saveAsNewWorkflow ({name, tags, resetWebhookUrls, openInNewWindow}: {name?: string, tags?: string[], resetWebhookUrls?: boolean, openInNewWindow?: boolean} = {}, redirect = true): Promise<boolean> {
				try {
					this.$store.commit('addActiveAction', 'workflowSaving');

					const workflowDataRequest: IWorkflowDataUpdate = await this.getWorkflowDataToSave();
					// make sure that the new ones are not active
					workflowDataRequest.active = false;
					const changedNodes = {} as IDataObject;
					if (resetWebhookUrls) {
						workflowDataRequest.nodes = workflowDataRequest.nodes!.map(node => {
							if (node.webhookId) {
								node.webhookId = uuidv4();
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
					if (openInNewWindow) {
						const routeData = this.$router.resolve({name: 'NodeViewExisting', params: {name: workflowData.id}});
						window.open(routeData.href, '_blank');
						this.$store.commit('removeActiveAction', 'workflowSaving');
						return true;
					}

					this.$store.commit('setActive', workflowData.active || false);
					this.$store.commit('setWorkflowId', workflowData.id);
					this.$store.commit('setWorkflowName', {newName: workflowData.name, setStateDirty: false});
					this.$store.commit('setWorkflowSettings', workflowData.settings || {});
					this.$store.commit('setStateDirty', false);
					Object.keys(changedNodes).forEach((nodeName) => {
						const changes = {
							key: 'webhookId',
							value: changedNodes[nodeName],
							name: nodeName,
						} as IUpdateInformation;
						this.$store.commit('setNodeValue', changes);
					});

					const createdTags = (workflowData.tags || []) as ITag[];
					const tagIds = createdTags.map((tag: ITag): string => tag.id);
					this.$store.commit('setWorkflowTagIds', tagIds);

					const templateId = this.$route.query.templateId;
					if (templateId) {
						this.$telemetry.track('User saved new workflow from template', {
							template_id: templateId,
							workflow_id: workflowData.id,
							wf_template_repo_session_id: this.$store.getters['templates/previousSessionId'],
						});
					}

					if (redirect) {
						this.$router.push({
							name: 'NodeViewExisting',
							params: { name: workflowData.id as string, action: 'workflowSave' },
						});
					}

					this.$store.commit('removeActiveAction', 'workflowSaving');
					this.$store.commit('setStateDirty', false);
					this.$externalHooks().run('workflow.afterUpdate', { workflowData });

					return true;
				} catch (e) {
					this.$store.commit('removeActiveAction', 'workflowSaving');

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
			updateNodePositions (workflowData: IWorkflowData | IWorkflowDataUpdate, position: XYPosition): void {
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

				if(data !== undefined) {
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
		},
	});
