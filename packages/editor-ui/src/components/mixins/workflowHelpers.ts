import { PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/constants';

import {
	IConnections,
	IDataObject,
	INode,
	INodeExecutionData,
	INodeIssues,
	INodeParameters,
	NodeParameterValue,
	INodeType,
	INodeTypes,
	INodeTypeData,
	INodeTypeDescription,
	IRunData,
	IRunExecutionData,
	IWorfklowIssues,
	INodeCredentials,
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
	XYPositon,
} from '../../Interface';

import { externalHooks } from '@/components/mixins/externalHooks';
import { restApi } from '@/components/mixins/restApi';
import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import { showMessage } from '@/components/mixins/showMessage';

import { isEqual } from 'lodash';

import mixins from 'vue-typed-mixins';

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
			checkReadyForExecution (workflow: Workflow) {
				let node: INode;
				let nodeType: INodeType | undefined;
				let nodeIssues: INodeIssues | null = null;
				const workflowIssues: IWorfklowIssues = {};

				for (const nodeName of Object.keys(workflow.nodes)) {
					nodeIssues = null;
					node = workflow.nodes[nodeName];

					if (node.disabled === true) {
						// Ignore issues on disabled nodes
						continue;
					}

					nodeType = workflow.nodeTypes.getByName(node.type);

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
					getAll: (): INodeType[] => {
						// Does not get used in Workflow so no need to return it
						return [];
					},
					getByName: (nodeType: string): INodeType | undefined => {
						const nodeTypeDescription = this.$store.getters.nodeType(nodeType);

						if (nodeTypeDescription === null) {
							return undefined;
						}

						return {
							description: nodeTypeDescription,
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
				const nodeType = this.$store.getters.nodeType(node.type) as INodeTypeDescription;

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

					// Save the node color only if it is different to the default color
					if (node.color && node.color !== nodeType.defaults.color) {
						nodeData.color = node.color;
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
				const inputIndex = 0;
				const itemIndex = 0;
				const runIndex = 0;
				const inputName = 'main';
				const activeNode = this.$store.getters.activeNode;
				const workflow = this.getWorkflow();
				const parentNode = workflow.getParentNodes(activeNode.name, inputName, 1);
				const executionData = this.$store.getters.getWorkflowExecution as IExecutionResponse | null;
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

				return workflow.expression.getParameterValue(parameter, runExecutionData, runIndex, itemIndex, activeNode.name, connectionInputData, 'manual', false) as IDataObject;
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

			// Saves the currently loaded workflow to the database.
			async saveCurrentWorkflow (withNewName = false) {
				const currentWorkflow = this.$route.params.name;
				let workflowName: string | null | undefined = '';
				if (currentWorkflow === undefined || withNewName === true) {
					// Currently no workflow name is set to get it from user
					workflowName = await this.$prompt(
						'Enter workflow name',
						'Name',
						{
							confirmButtonText: 'Save',
							cancelButtonText: 'Cancel',
						},
					)
						.then((data) => {
							// @ts-ignore
							return data.value;
						})
						.catch(() => {
							// User did cancel
							return undefined;
						});

					if (workflowName === undefined) {
						// User did cancel
						return;
					} else if (['', null].includes(workflowName)) {
						// User did not enter a name
						this.$showMessage({
							title: 'Name missing',
							message: `No name for the workflow got entered and could so not be saved!`,
							type: 'error',
						});
						return;
					}
				}

				try {
					this.$store.commit('addActiveAction', 'workflowSaving');

					let workflowData: IWorkflowData = await this.getWorkflowDataToSave();

					if (currentWorkflow === undefined || withNewName === true) {
						// Workflow is new or is supposed to get saved under a new name
						// so create a new entry in database
						workflowData.name = workflowName!.trim() as string;

						if (withNewName === true) {
							// If an existing workflow gets resaved with a new name
							// make sure that the new ones is not active
							workflowData.active = false;
						}

						workflowData = await this.restApi().createNewWorkflow(workflowData);

						this.$store.commit('setActive', workflowData.active || false);
						this.$store.commit('setWorkflowId', workflowData.id);
						this.$store.commit('setWorkflowName', {newName: workflowData.name, setStateDirty: false});
						this.$store.commit('setWorkflowSettings', workflowData.settings || {});
						this.$store.commit('setStateDirty', false);
					} else {
						// Workflow exists already so update it
						await this.restApi().updateWorkflow(currentWorkflow, workflowData);
					}

					if (this.$route.params.name !== workflowData.id) {
						this.$router.push({
							name: 'NodeViewExisting',
							params: { name: workflowData.id as string, action: 'workflowSave' },
						});
					}

					this.$store.commit('removeActiveAction', 'workflowSaving');
					this.$store.commit('setStateDirty', false);
					this.$showMessage({
						title: 'Workflow saved',
						message: `The workflow "${workflowData.name}" got saved!`,
						type: 'success',
					});
					this.$externalHooks().run('workflow.afterUpdate', { workflowData });
				} catch (e) {
					this.$store.commit('removeActiveAction', 'workflowSaving');

					this.$showMessage({
						title: 'Problem saving workflow',
						message: `There was a problem saving the workflow: "${e.message}"`,
						type: 'error',
					});
				}
			},

			// Updates the position of all the nodes that the top-left node
			// is at the given position
			updateNodePositions (workflowData: IWorkflowData | IWorkflowDataUpdate, position: XYPositon): void {
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

				let data: IWorkflowDb;
				data = await this.restApi().getWorkflow(id);

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
