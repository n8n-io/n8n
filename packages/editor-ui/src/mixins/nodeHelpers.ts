import { EnableNodeToggleCommand } from './../models/history';
import { useHistoryStore } from '@/stores/history.store';
import { PLACEHOLDER_FILLED_AT_EXECUTION_TIME, CUSTOM_API_CALL_KEY } from '@/constants';

import type {
	ConnectionTypes,
	IBinaryKeyData,
	ICredentialType,
	INodeCredentialDescription,
	INodeCredentialsDetails,
	INodeExecutionData,
	INodeIssues,
	INodeIssueObjectProperty,
	INodeParameters,
	INodeProperties,
	INodeTypeDescription,
	IRunData,
	ITaskDataConnections,
	INode,
	INodePropertyOptions,
	IDataObject,
	Workflow,
	INodeInputConfiguration,
} from 'n8n-workflow';
import { NodeHelpers, ExpressionEvaluatorProxy, NodeConnectionType } from 'n8n-workflow';

import type {
	ICredentialsResponse,
	INodeUi,
	INodeUpdatePropertiesInformation,
	IUser,
	NodePanelType,
} from '@/Interface';

import { get } from 'lodash-es';

import { isObject } from '@/utils/objectUtils';
import { getCredentialPermissions } from '@/permissions';
import { mapStores } from 'pinia';
import { useSettingsStore } from '@/stores/settings.store';
import { hasPermission } from '@/rbac/permissions';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { defineComponent } from 'vue';
import { useUsersStore } from '@/stores/users.store';

export const nodeHelpers = defineComponent({
	computed: {
		...mapStores(
			useCredentialsStore,
			useHistoryStore,
			useNodeTypesStore,
			useSettingsStore,
			useWorkflowsStore,
			useRootStore,
		),
	},
	methods: {
		hasProxyAuth(node: INodeUi): boolean {
			return Object.keys(node.parameters).includes('nodeCredentialType');
		},

		isCustomApiCallSelected(nodeValues: INodeParameters): boolean {
			const { parameters } = nodeValues;

			if (!isObject(parameters)) return false;

			return (
				(parameters.resource !== undefined && parameters.resource.includes(CUSTOM_API_CALL_KEY)) ||
				(parameters.operation !== undefined && parameters.operation.includes(CUSTOM_API_CALL_KEY))
			);
		},

		// Returns the parameter value
		getParameterValue(nodeValues: INodeParameters, parameterName: string, path: string) {
			return get(nodeValues, path ? path + '.' + parameterName : parameterName);
		},

		// Returns if the given parameter should be displayed or not
		displayParameter(
			nodeValues: INodeParameters,
			parameter: INodeProperties | INodeCredentialDescription,
			path: string,
			node: INodeUi | null,
		) {
			return NodeHelpers.displayParameterPath(nodeValues, parameter, path, node);
		},

		// Updates all the issues on all the nodes
		refreshNodeIssues(): void {
			const nodes = this.workflowsStore.allNodes;
			const workflow = this.workflowsStore.getCurrentWorkflow();
			let nodeType: INodeTypeDescription | null;
			let foundNodeIssues: INodeIssues | null;

			nodes.forEach((node) => {
				if (node.disabled === true) {
					return;
				}
				nodeType = this.nodeTypesStore.getNodeType(node.type, node.typeVersion);
				foundNodeIssues = this.getNodeIssues(nodeType, node, workflow);
				if (foundNodeIssues !== null) {
					node.issues = foundNodeIssues;
				}
			});
		},

		// Returns all the issues of the node
		getNodeIssues(
			nodeType: INodeTypeDescription | null,
			node: INodeUi,
			workflow: Workflow,
			ignoreIssues?: string[],
		): INodeIssues | null {
			const pinDataNodeNames = Object.keys(this.workflowsStore.getPinData || {});

			let nodeIssues: INodeIssues | null = null;
			ignoreIssues = ignoreIssues || [];

			if (node.disabled === true || pinDataNodeNames.includes(node.name)) {
				// Ignore issues on disabled and pindata nodes
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

				const nodeInputIssues = this.getNodeInputIssues(workflow, node, nodeType);
				if (nodeIssues === null) {
					nodeIssues = nodeInputIssues;
				} else {
					NodeHelpers.mergeIssues(nodeIssues, nodeInputIssues);
				}
			}

			if (this.hasNodeExecutionIssues(node) && !ignoreIssues.includes('execution')) {
				if (nodeIssues === null) {
					nodeIssues = {};
				}
				nodeIssues.execution = true;
			}

			return nodeIssues;
		},

		// Set the status on all the nodes which produced an error so that it can be
		// displayed in the node-view
		hasNodeExecutionIssues(node: INodeUi): boolean {
			const workflowResultData = this.workflowsStore.getWorkflowRunData;

			if (workflowResultData === null || !workflowResultData.hasOwnProperty(node.name)) {
				return false;
			}

			for (const taskData of workflowResultData[node.name]) {
				if (!taskData) return false;

				if (taskData.error !== undefined) {
					return true;
				}
			}

			return false;
		},

		reportUnsetCredential(credentialType: ICredentialType) {
			return {
				credentials: {
					[credentialType.name]: [
						this.$locale.baseText('nodeHelpers.credentialsUnset', {
							interpolate: {
								credentialType: credentialType.displayName,
							},
						}),
					],
				},
			};
		},

		updateNodesInputIssues() {
			const nodes = this.workflowsStore.allNodes;
			const workflow = this.workflowsStore.getCurrentWorkflow();

			for (const node of nodes) {
				const nodeType = this.nodeTypesStore.getNodeType(node.type, node.typeVersion);
				if (!nodeType) {
					return;
				}
				const nodeInputIssues = this.getNodeInputIssues(workflow, node, nodeType);

				this.workflowsStore.setNodeIssue({
					node: node.name,
					type: 'input',
					value: nodeInputIssues?.input ? nodeInputIssues.input : null,
				});
			}
		},

		// Updates the execution issues.
		updateNodesExecutionIssues() {
			const nodes = this.workflowsStore.allNodes;

			for (const node of nodes) {
				this.workflowsStore.setNodeIssue({
					node: node.name,
					type: 'execution',
					value: this.hasNodeExecutionIssues(node) ? true : null,
				});
			}
		},

		updateNodeCredentialIssuesByName(name: string): void {
			const node = this.workflowsStore.getNodeByName(name);

			if (node) {
				this.updateNodeCredentialIssues(node);
			}
		},

		// Updates the credential-issues of the node
		updateNodeCredentialIssues(node: INodeUi): void {
			const fullNodeIssues: INodeIssues | null = this.getNodeCredentialIssues(node);

			let newIssues: INodeIssueObjectProperty | null = null;
			if (fullNodeIssues !== null) {
				newIssues = fullNodeIssues.credentials!;
			}

			this.workflowsStore.setNodeIssue({
				node: node.name,
				type: 'credentials',
				value: newIssues,
			});
		},

		updateNodeParameterIssuesByName(name: string): void {
			const node = this.workflowsStore.getNodeByName(name);

			if (node) {
				this.updateNodeParameterIssues(node);
			}
		},

		// Updates the parameter-issues of the node
		updateNodeParameterIssues(node: INodeUi, nodeType?: INodeTypeDescription): void {
			if (nodeType === undefined) {
				nodeType = this.nodeTypesStore.getNodeType(node.type, node.typeVersion);
			}

			if (nodeType === null) {
				// Could not find nodeType so can not update issues
				return;
			}

			// All data got updated everywhere so update now the issues
			const fullNodeIssues: INodeIssues | null = NodeHelpers.getNodeParametersIssues(
				nodeType!.properties,
				node,
			);

			let newIssues: INodeIssueObjectProperty | null = null;
			if (fullNodeIssues !== null) {
				newIssues = fullNodeIssues.parameters!;
			}

			this.workflowsStore.setNodeIssue({
				node: node.name,
				type: 'parameters',
				value: newIssues,
			});
		},

		// Returns all the input-issues of the node
		getNodeInputIssues(
			workflow: Workflow,
			node: INodeUi,
			nodeType?: INodeTypeDescription,
		): INodeIssues | null {
			const foundIssues: INodeIssueObjectProperty = {};

			const workflowNode = workflow.getNode(node.name);
			let inputs: Array<ConnectionTypes | INodeInputConfiguration> = [];
			if (nodeType && workflowNode) {
				inputs = NodeHelpers.getNodeInputs(workflow, workflowNode, nodeType);
			}

			inputs.forEach((input) => {
				if (typeof input === 'string' || input.required !== true) {
					return;
				}

				const parentNodes = workflow.getParentNodes(node.name, input.type, 1);

				if (parentNodes.length === 0) {
					// We want to show different error for missing AI subnodes
					if (input.type.startsWith('ai_')) {
						foundIssues[input.type] = [
							this.$locale.baseText('nodeIssues.input.missingSubNode', {
								interpolate: {
									inputName: input.displayName?.toLocaleLowerCase() ?? input.type,
									inputType: input.type,
									node: node.name,
								},
							}),
						];
					} else {
						foundIssues[input.type] = [
							this.$locale.baseText('nodeIssues.input.missing', {
								interpolate: { inputName: input.displayName ?? input.type },
							}),
						];
					}
				}
			});

			if (Object.keys(foundIssues).length) {
				return {
					input: foundIssues,
				};
			}

			return null;
		},

		// Returns all the credential-issues of the node
		getNodeCredentialIssues(node: INodeUi, nodeType?: INodeTypeDescription): INodeIssues | null {
			if (node.disabled) {
				// Node is disabled
				return null;
			}

			if (!nodeType) {
				nodeType = this.nodeTypesStore.getNodeType(node.type, node.typeVersion);
			}

			if (!nodeType?.credentials) {
				// Node does not need any credentials or nodeType could not be found
				return null;
			}

			const foundIssues: INodeIssueObjectProperty = {};

			let userCredentials: ICredentialsResponse[] | null;
			let credentialType: ICredentialType | undefined;
			let credentialDisplayName: string;
			let selectedCredentials: INodeCredentialsDetails;

			const { authentication, genericAuthType, nodeCredentialType } =
				node.parameters as HttpRequestNode.V2.AuthParams;

			if (
				authentication === 'genericCredentialType' &&
				genericAuthType !== '' &&
				selectedCredsAreUnusable(node, genericAuthType)
			) {
				const credential = this.credentialsStore.getCredentialTypeByName(genericAuthType);
				return credential ? this.reportUnsetCredential(credential) : null;
			}

			if (
				this.hasProxyAuth(node) &&
				authentication === 'predefinedCredentialType' &&
				nodeCredentialType !== '' &&
				node.credentials !== undefined
			) {
				const stored = this.credentialsStore.getCredentialsByType(nodeCredentialType);

				if (selectedCredsDoNotExist(node, nodeCredentialType, stored)) {
					const credential = this.credentialsStore.getCredentialTypeByName(nodeCredentialType);
					return credential ? this.reportUnsetCredential(credential) : null;
				}
			}

			if (
				this.hasProxyAuth(node) &&
				authentication === 'predefinedCredentialType' &&
				nodeCredentialType !== '' &&
				selectedCredsAreUnusable(node, nodeCredentialType)
			) {
				const credential = this.credentialsStore.getCredentialTypeByName(nodeCredentialType);
				return credential ? this.reportUnsetCredential(credential) : null;
			}

			for (const credentialTypeDescription of nodeType.credentials) {
				// Check if credentials should be displayed else ignore
				if (!this.displayParameter(node.parameters, credentialTypeDescription, '', node)) {
					continue;
				}

				// Get the display name of the credential type
				credentialType = this.credentialsStore.getCredentialTypeByName(
					credentialTypeDescription.name,
				);
				if (credentialType === null) {
					credentialDisplayName = credentialTypeDescription.name;
				} else {
					credentialDisplayName = credentialType.displayName;
				}

				if (!node.credentials?.[credentialTypeDescription.name]) {
					// Credentials are not set
					if (credentialTypeDescription.required) {
						foundIssues[credentialTypeDescription.name] = [
							this.$locale.baseText('nodeIssues.credentials.notSet', {
								interpolate: { type: nodeType.displayName },
							}),
						];
					}
				} else {
					// If they are set check if the value is valid
					selectedCredentials = node.credentials[credentialTypeDescription.name];
					if (typeof selectedCredentials === 'string') {
						selectedCredentials = {
							id: null,
							name: selectedCredentials,
						};
					}

					const usersStore = useUsersStore();
					const currentUser = usersStore.currentUser || ({} as IUser);
					userCredentials = this.credentialsStore
						.getCredentialsByType(credentialTypeDescription.name)
						.filter((credential: ICredentialsResponse) => {
							const permissions = getCredentialPermissions(currentUser, credential);
							return permissions.use;
						});

					if (userCredentials === null) {
						userCredentials = [];
					}

					if (selectedCredentials.id) {
						const idMatch = userCredentials.find(
							(credentialData) => credentialData.id === selectedCredentials.id,
						);
						if (idMatch) {
							continue;
						}
					}

					const nameMatches = userCredentials.filter(
						(credentialData) => credentialData.name === selectedCredentials.name,
					);
					if (nameMatches.length > 1) {
						foundIssues[credentialTypeDescription.name] = [
							this.$locale.baseText('nodeIssues.credentials.notIdentified', {
								interpolate: { name: selectedCredentials.name, type: credentialDisplayName },
							}),
							this.$locale.baseText('nodeIssues.credentials.notIdentified.hint'),
						];
						continue;
					}

					if (nameMatches.length === 0) {
						const isCredentialUsedInWorkflow =
							this.workflowsStore.usedCredentials?.[selectedCredentials.id as string];

						if (
							!isCredentialUsedInWorkflow &&
							!hasPermission(['rbac'], { rbac: { scope: 'credential:read' } })
						) {
							foundIssues[credentialTypeDescription.name] = [
								this.$locale.baseText('nodeIssues.credentials.doNotExist', {
									interpolate: { name: selectedCredentials.name, type: credentialDisplayName },
								}),
								this.$locale.baseText('nodeIssues.credentials.doNotExist.hint'),
							];
						}
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
		updateNodesCredentialsIssues() {
			const nodes = this.workflowsStore.allNodes;
			let issues: INodeIssues | null;

			for (const node of nodes) {
				issues = this.getNodeCredentialIssues(node);

				this.workflowsStore.setNodeIssue({
					node: node.name,
					type: 'credentials',
					value: issues === null ? null : issues.credentials,
				});
			}
		},

		getNodeInputData(
			node: INodeUi | null,
			runIndex = 0,
			outputIndex = 0,
			paneType: NodePanelType = 'output',
			connectionType: ConnectionTypes = NodeConnectionType.Main,
		): INodeExecutionData[] {
			if (node === null) {
				return [];
			}
			if (this.workflowsStore.getWorkflowExecution === null) {
				return [];
			}

			const executionData = this.workflowsStore.getWorkflowExecution.data;
			if (!executionData?.resultData) {
				// unknown status
				return [];
			}
			const runData = executionData.resultData.runData;

			const taskData = get(runData, `[${node.name}][${runIndex}]`);
			if (!taskData) {
				return [];
			}

			let data: ITaskDataConnections | undefined = taskData.data!;
			if (paneType === 'input' && taskData.inputOverride) {
				data = taskData.inputOverride!;
			}

			if (!data) {
				return [];
			}

			return this.getInputData(data, outputIndex, connectionType);
		},

		// Returns the data of the main input
		getInputData(
			connectionsData: ITaskDataConnections,
			outputIndex: number,
			connectionType: ConnectionTypes = NodeConnectionType.Main,
		): INodeExecutionData[] {
			if (
				!connectionsData ||
				!connectionsData.hasOwnProperty(connectionType) ||
				connectionsData[connectionType] === undefined ||
				connectionsData[connectionType].length < outputIndex ||
				connectionsData[connectionType][outputIndex] === null
			) {
				return [];
			}
			return connectionsData[connectionType][outputIndex] as INodeExecutionData[];
		},

		// Returns all the binary data of all the entries
		getBinaryData(
			workflowRunData: IRunData | null,
			node: string | null,
			runIndex: number,
			outputIndex: number,
			connectionType: ConnectionTypes = NodeConnectionType.Main,
		): IBinaryKeyData[] {
			if (node === null) {
				return [];
			}

			const runData: IRunData | null = workflowRunData;

			if (!runData?.[node]?.[runIndex]?.data) {
				return [];
			}

			const inputData = this.getInputData(
				runData[node][runIndex].data!,
				outputIndex,
				connectionType,
			);

			const returnData: IBinaryKeyData[] = [];
			for (let i = 0; i < inputData.length; i++) {
				if (inputData[i].hasOwnProperty('binary') && inputData[i].binary !== undefined) {
					returnData.push(inputData[i].binary!);
				}
			}

			return returnData;
		},

		disableNodes(nodes: INodeUi[], trackHistory = false) {
			if (trackHistory) {
				this.historyStore.startRecordingUndo();
			}
			for (const node of nodes) {
				const oldState = node.disabled;
				// Toggle disabled flag
				const updateInformation = {
					name: node.name,
					properties: {
						disabled: !oldState,
					} as IDataObject,
				} as INodeUpdatePropertiesInformation;

				this.$telemetry.track('User set node enabled status', {
					node_type: node.type,
					is_enabled: node.disabled,
					workflow_id: this.workflowsStore.workflowId,
				});

				this.workflowsStore.updateNodeProperties(updateInformation);
				this.workflowsStore.clearNodeExecutionData(node.name);
				this.updateNodeParameterIssues(node);
				this.updateNodeCredentialIssues(node);
				this.updateNodesInputIssues();
				if (trackHistory) {
					this.historyStore.pushCommandToUndo(
						new EnableNodeToggleCommand(node.name, oldState === true, node.disabled === true),
					);
				}
			}
			if (trackHistory) {
				this.historyStore.stopRecordingUndo();
			}
		},
		// @ts-ignore
		getNodeSubtitle(data, nodeType, workflow): string | undefined {
			if (!data) {
				return undefined;
			}

			if (data.notesInFlow) {
				return data.notes;
			}

			if (nodeType !== null && nodeType.subtitle !== undefined) {
				try {
					ExpressionEvaluatorProxy.setEvaluator(
						useSettingsStore().settings.expressions?.evaluator ?? 'tmpl',
					);
					return workflow.expression.getSimpleParameterValue(
						data as INode,
						nodeType.subtitle,
						'internal',
						{},
						undefined,
						PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
					) as string | undefined;
				} catch (e) {
					return undefined;
				}
			}

			if (data.parameters.operation !== undefined) {
				const operation = data.parameters.operation as string;
				if (nodeType === null) {
					return operation;
				}

				const operationData: INodeProperties = nodeType.properties.find(
					(property: INodeProperties) => {
						return property.name === 'operation';
					},
				);
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

/**
 * Whether the node has no selected credentials, or none of the node's
 * selected credentials are of the specified type.
 */
function selectedCredsAreUnusable(node: INodeUi, credentialType: string) {
	return !node.credentials || !Object.keys(node.credentials).includes(credentialType);
}

/**
 * Whether the node's selected credentials of the specified type
 * can no longer be found in the database.
 */
function selectedCredsDoNotExist(
	node: INodeUi,
	nodeCredentialType: string,
	storedCredsByType: ICredentialsResponse[] | null,
) {
	if (!node.credentials || !storedCredsByType) return false;

	const selectedCredsByType = node.credentials[nodeCredentialType];

	if (!selectedCredsByType) return false;

	return !storedCredsByType.find((c) => c.id === selectedCredsByType.id);
}

declare namespace HttpRequestNode {
	namespace V2 {
		type AuthParams = {
			authentication: 'none' | 'genericCredentialType' | 'predefinedCredentialType';
			genericAuthType: string;
			nodeCredentialType: string;
		};
	}
}
