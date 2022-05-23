import {
	PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
} from '@/constants';

import {
	IBinaryKeyData,
	ICredentialType,
	INodeCredentialDescription,
	NodeHelpers,
	INodeCredentialsDetails,
	INodeExecutionData,
	INodeIssues,
	INodeIssueData,
	INodeIssueObjectProperty,
	INodeParameters,
	INodeProperties,
	INodeTypeDescription,
	IRunData,
	IRunExecutionData,
	ITaskDataConnections,
	INode,
	INodePropertyOptions,
} from 'n8n-workflow';

import {
	ICredentialsResponse,
	INodeUi,
} from '../../Interface';

import { restApi } from '@/components/mixins/restApi';

import { get } from 'lodash';

import mixins from 'vue-typed-mixins';

export const nodeHelpers = mixins(
	restApi,
)
	.extend({
		methods: {

			// Returns the parameter value
			getParameterValue (nodeValues: INodeParameters, parameterName: string, path: string) {
				return get(
					nodeValues,
					path ? path + '.' + parameterName : parameterName,
				);
			},

			// Returns if the given parameter should be displayed or not
			displayParameter (nodeValues: INodeParameters, parameter: INodeProperties | INodeCredentialDescription, path: string, node: INodeUi | null) {
				return NodeHelpers.displayParameterPath(nodeValues, parameter, path, node);
			},

			// Returns all the issues of the node
			getNodeIssues (nodeType: INodeTypeDescription | null, node: INodeUi, ignoreIssues?: string[]): INodeIssues | null {
				let nodeIssues: INodeIssues | null = null;
				ignoreIssues = ignoreIssues || [];

				if (node.disabled === true) {
					// Ignore issues on disabled nodes
					return null;
				}

				if (nodeType === null) {
					// Node type is not known
					if (!ignoreIssues.includes('typeUnknown')) {
						nodeIssues = {
							typeUnknown: true,
						};
					}
				} else {
					// Node type is known

					// Add potential parameter issues
					if (!ignoreIssues.includes('parameters')) {
						nodeIssues = NodeHelpers.getNodeParametersIssues(nodeType.properties, node);
					}

					if (!ignoreIssues.includes('credentials')) {
						// Add potential credential issues
						const nodeCredentialIssues = this.getNodeCredentialIssues(node, nodeType);
						if (nodeIssues === null) {
							nodeIssues = nodeCredentialIssues;
						} else {
							NodeHelpers.mergeIssues(nodeIssues, nodeCredentialIssues);
						}
					}
				}

				if (this.hasNodeExecutionIssues(node) === true && !ignoreIssues.includes('execution')) {
					if (nodeIssues === null) {
						nodeIssues = {};
					}
					nodeIssues.execution = true;
				}

				return nodeIssues;
			},

			// Set the status on all the nodes which produced an error so that it can be
			// displayed in the node-view
			hasNodeExecutionIssues (node: INodeUi): boolean {
				const workflowResultData: IRunData = this.$store.getters.getWorkflowRunData;

				if (workflowResultData === null || !workflowResultData.hasOwnProperty(node.name)) {
					return false;
				}

				for (const taskData of workflowResultData[node.name]) {
					if (taskData.error !== undefined) {
						return true;
					}
				}

				return false;
			},

			// Updates the execution issues.
			updateNodesExecutionIssues () {
				const nodes = this.$store.getters.allNodes;

				for (const node of nodes) {
					this.$store.commit('setNodeIssue', {
						node: node.name,
						type: 'execution',
						value: this.hasNodeExecutionIssues(node) ? true : null,
					});
				}
			},

			// Updates the credential-issues of the node
			updateNodeCredentialIssues(node: INodeUi): void {
				const fullNodeIssues: INodeIssues | null = this.getNodeCredentialIssues(node);

				let newIssues: INodeIssueObjectProperty | null = null;
				if (fullNodeIssues !== null) {
					newIssues = fullNodeIssues.credentials!;
				}

				this.$store.commit('setNodeIssue', {
					node: node.name,
					type: 'credentials',
					value: newIssues,
				} as INodeIssueData);
			},

			// Updates the parameter-issues of the node
			updateNodeParameterIssues(node: INodeUi, nodeType?: INodeTypeDescription): void {
				if (nodeType === undefined) {
					nodeType = this.$store.getters.nodeType(node.type, node.typeVersion);
				}

				if (nodeType === null) {
					// Could not find nodeType so can not update issues
					return;
				}

				// All data got updated everywhere so update now the issues
				const fullNodeIssues: INodeIssues | null = NodeHelpers.getNodeParametersIssues(nodeType!.properties, node);

				let newIssues: INodeIssueObjectProperty | null = null;
				if (fullNodeIssues !== null) {
					newIssues = fullNodeIssues.parameters!;
				}

				this.$store.commit('setNodeIssue', {
					node: node.name,
					type: 'parameters',
					value: newIssues,
				} as INodeIssueData);
			},

			// Returns all the credential-issues of the node
			getNodeCredentialIssues (node: INodeUi, nodeType?: INodeTypeDescription): INodeIssues | null {
				if (node.disabled === true) {
					// Node is disabled
					return null;
				}

				if (nodeType === undefined) {
					nodeType = this.$store.getters.nodeType(node.type, node.typeVersion);
				}

				if (nodeType === null || nodeType!.credentials === undefined) {
					// Node does not need any credentials or nodeType could not be found
					return null;
				}

				if (nodeType!.credentials === undefined) {
					// No credentials defined for node type
					return null;
				}

				const foundIssues: INodeIssueObjectProperty = {};

				let userCredentials: ICredentialsResponse[] | null;
				let credentialType: ICredentialType | null;
				let credentialDisplayName: string;
				let selectedCredentials: INodeCredentialsDetails;
				for (const credentialTypeDescription of nodeType!.credentials!) {
					// Check if credentials should be displayed else ignore
					if (this.displayParameter(node.parameters, credentialTypeDescription, '', node) !== true) {
						continue;
					}

					// Get the display name of the credential type
					credentialType = this.$store.getters['credentials/getCredentialTypeByName'](credentialTypeDescription.name);
					if (credentialType === null) {
						credentialDisplayName = credentialTypeDescription.name;
					} else {
						credentialDisplayName = credentialType.displayName;
					}

					if (node.credentials === undefined || node.credentials[credentialTypeDescription.name] === undefined) {
						// Credentials are not set
						if (credentialTypeDescription.required === true) {
							foundIssues[credentialTypeDescription.name] = [`Credentials for "${credentialDisplayName}" are not set.`];
						}
					} else {
						// If they are set check if the value is valid
						selectedCredentials = node.credentials[credentialTypeDescription.name] as INodeCredentialsDetails;
						if (typeof selectedCredentials === 'string') {
							selectedCredentials = {
								id: null,
								name: selectedCredentials,
							};
						}

						userCredentials = this.$store.getters['credentials/getCredentialsByType'](credentialTypeDescription.name);

						if (userCredentials === null) {
							userCredentials = [];
						}

						if (selectedCredentials.id) {
							const idMatch = userCredentials.find((credentialData) => credentialData.id === selectedCredentials.id);
							if (idMatch) {
								continue;
							}
						}

						const nameMatches = userCredentials.filter((credentialData) => credentialData.name === selectedCredentials.name);
						if (nameMatches.length > 1) {
							foundIssues[credentialTypeDescription.name] = [`Credentials with name "${selectedCredentials.name}" exist for "${credentialDisplayName}"`, "Credentials are not clearly identified. Please select the correct credentials."];
							continue;
						}

						if (nameMatches.length === 0) {
							foundIssues[credentialTypeDescription.name] = [`Credentials with name "${selectedCredentials.name}" do not exist for "${credentialDisplayName}".`, "You can create credentials with the exact name and then they get auto-selected on refresh."];
						}
					}
				}

				// TODO: Could later check also if the node has access to the credentials
				if (Object.keys(foundIssues).length === 0) {
					return null;
				}

				return {
					credentials: foundIssues,
				};
			},

			// Updates the node credential issues
			updateNodesCredentialsIssues () {
				const nodes = this.$store.getters.allNodes;
				let issues: INodeIssues | null;

				for (const node of nodes) {
					issues = this.getNodeCredentialIssues(node);

					this.$store.commit('setNodeIssue', {
						node: node.name,
						type: 'credentials',
						value: issues === null ? null : issues.credentials,
					});
				}
			},

			getNodeInputData (node: INodeUi | null, runIndex = 0, outputIndex = 0): INodeExecutionData[] {
				if (node === null) {
					return [];
				}

				if (this.$store.getters.getWorkflowExecution === null) {
					return [];
				}
				const executionData: IRunExecutionData = this.$store.getters.getWorkflowExecution.data;
				if (!executionData || !executionData.resultData) { // unknown status
					return [];
				}
				const runData = executionData.resultData.runData;

				if (runData === null || runData[node.name] === undefined ||
					!runData[node.name][runIndex].data ||
					runData[node.name][runIndex].data === undefined
				) {
					return [];
				}

				return this.getMainInputData(runData[node.name][runIndex].data!, outputIndex);
			},

			// Returns the data of the main input
			getMainInputData (connectionsData: ITaskDataConnections, outputIndex: number): INodeExecutionData[] {
				if (!connectionsData || !connectionsData.hasOwnProperty('main') || connectionsData.main === undefined || connectionsData.main.length < outputIndex || connectionsData.main[outputIndex] === null) {
					return [];
				}
				return connectionsData.main[outputIndex] as INodeExecutionData[];
			},

			// Returns all the binary data of all the entries
			getBinaryData (workflowRunData: IRunData | null, node: string | null, runIndex: number, outputIndex: number): IBinaryKeyData[] {
				if (node === null) {
					return [];
				}

				const runData: IRunData | null = workflowRunData;

				if (runData === null || !runData[node] || !runData[node][runIndex] ||
					!runData[node][runIndex].data
				) {
					return [];
				}

				const inputData = this.getMainInputData(runData[node][runIndex].data!, outputIndex);

				const returnData: IBinaryKeyData[] = [];
				for (let i = 0; i < inputData.length; i++) {
					if (inputData[i].hasOwnProperty('binary') && inputData[i].binary !== undefined) {
						returnData.push(inputData[i].binary!);
					}
				}

				return returnData;
			},

			disableNodes(nodes: INodeUi[]) {
				for (const node of nodes) {
					// Toggle disabled flag
					const updateInformation = {
						name: node.name,
						properties: {
							disabled: !node.disabled,
						},
					};

					this.$telemetry.track('User set node enabled status', { node_type: node.type, is_enabled: node.disabled, workflow_id: this.$store.getters.workflowId });

					this.$store.commit('updateNodeProperties', updateInformation);
					this.$store.commit('clearNodeExecutionData', node.name);
					this.updateNodeParameterIssues(node);
					this.updateNodeCredentialIssues(node);
				}
			},
			// @ts-ignore
			getNodeSubtitle (data, nodeType, workflow): string | undefined {
				if (!data) {
					return undefined;
				}

				if (data.notesInFlow) {
					return data.notes;
				}

				if (nodeType !== null && nodeType.subtitle !== undefined) {
					return workflow.expression.getSimpleParameterValue(data as INode, nodeType.subtitle, 'internal', PLACEHOLDER_FILLED_AT_EXECUTION_TIME) as string | undefined;
				}

				if (data.parameters.operation !== undefined) {
					const operation = data.parameters.operation as string;
					if (nodeType === null) {
						return operation;
					}

					const operationData:INodeProperties = nodeType.properties.find((property: INodeProperties) => {
						return property.name === 'operation';
					});
					if (operationData === undefined) {
						return operation;
					}

					if (operationData.options === undefined) {
						return operation;
					}

					const optionData = operationData.options.find((option) => {
						return (option as INodePropertyOptions).value === data.parameters.operation;
					});
					if (optionData === undefined) {
						return operation;
					}

					return optionData.name;
				}
				return undefined;
			},
		},
	});
