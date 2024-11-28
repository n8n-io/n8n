import { ref, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import type { Connection, ConnectionDetachedParams } from '@jsplumb/core';
import { useHistoryStore } from '@/stores/history.store';
import {
	CUSTOM_API_CALL_KEY,
	FORM_TRIGGER_NODE_TYPE,
	NODE_OUTPUT_DEFAULT_KEY,
	PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
	SPLIT_IN_BATCHES_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
} from '@/constants';

import { NodeHelpers, ExpressionEvaluatorProxy, NodeConnectionType } from 'n8n-workflow';
import type {
	INodeProperties,
	INodeCredentialDescription,
	INodeTypeDescription,
	INodeIssues,
	ICredentialType,
	INodeIssueObjectProperty,
	INodeInputConfiguration,
	Workflow,
	INodeExecutionData,
	ITaskDataConnections,
	IRunData,
	IBinaryKeyData,
	IDataObject,
	INode,
	INodePropertyOptions,
	INodeCredentialsDetails,
	INodeParameters,
	ITaskData,
	IConnections,
	INodeTypeNameVersion,
	IConnection,
	IPinData,
} from 'n8n-workflow';

import type {
	ICredentialsResponse,
	INodeUi,
	INodeUpdatePropertiesInformation,
	NodePanelType,
} from '@/Interface';

import { isString } from '@/utils/typeGuards';
import { isObject } from '@/utils/objectUtils';
import { useSettingsStore } from '@/stores/settings.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { get } from 'lodash-es';
import { useI18n } from './useI18n';
import { AddNodeCommand, EnableNodeToggleCommand, RemoveConnectionCommand } from '@/models/history';
import { useTelemetry } from './useTelemetry';
import { hasPermission } from '@/utils/rbac/permissions';
import type { N8nPlusEndpoint } from '@/plugins/jsplumb/N8nPlusEndpointType';
import * as NodeViewUtils from '@/utils/nodeViewUtils';
import { useCanvasStore } from '@/stores/canvas.store';
import { getEndpointScope } from '@/utils/nodeViewUtils';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { getConnectionInfo } from '@/utils/canvasUtils';
import type { UnpinNodeDataEvent } from '@/event-bus/data-pinning';

declare namespace HttpRequestNode {
	namespace V2 {
		type AuthParams = {
			authentication: 'none' | 'genericCredentialType' | 'predefinedCredentialType';
			genericAuthType: string;
			nodeCredentialType: string;
		};
	}
}

export function useNodeHelpers() {
	const credentialsStore = useCredentialsStore();
	const historyStore = useHistoryStore();
	const nodeTypesStore = useNodeTypesStore();
	const workflowsStore = useWorkflowsStore();
	const i18n = useI18n();
	const canvasStore = useCanvasStore();
	const sourceControlStore = useSourceControlStore();
	const route = useRoute();

	const isInsertingNodes = ref(false);
	const credentialsUpdated = ref(false);
	const isProductionExecutionPreview = ref(false);
	const pullConnActiveNodeName = ref<string | null>(null);

	function hasProxyAuth(node: INodeUi): boolean {
		return Object.keys(node.parameters).includes('nodeCredentialType');
	}

	function isCustomApiCallSelected(nodeValues: INodeParameters): boolean {
		const { parameters } = nodeValues;

		if (!isObject(parameters)) return false;

		if ('resource' in parameters || 'operation' in parameters) {
			const { resource, operation } = parameters;

			return (
				(isString(resource) && resource.includes(CUSTOM_API_CALL_KEY)) ||
				(isString(operation) && operation.includes(CUSTOM_API_CALL_KEY))
			);
		}

		return false;
	}

	function getParameterValue(nodeValues: INodeParameters, parameterName: string, path: string) {
		return get(nodeValues, path ? path + '.' + parameterName : parameterName);
	}

	// Returns if the given parameter should be displayed or not
	function displayParameter(
		nodeValues: INodeParameters,
		parameter: INodeProperties | INodeCredentialDescription,
		path: string,
		node: INodeUi | null,
		displayKey: 'displayOptions' | 'disabledOptions' = 'displayOptions',
	) {
		return NodeHelpers.displayParameterPath(nodeValues, parameter, path, node, displayKey);
	}

	function refreshNodeIssues(): void {
		const nodes = workflowsStore.allNodes;
		const workflow = workflowsStore.getCurrentWorkflow();
		let nodeType: INodeTypeDescription | null;
		let foundNodeIssues: INodeIssues | null;

		nodes.forEach((node) => {
			if (node.disabled === true) return;

			nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			foundNodeIssues = getNodeIssues(nodeType, node, workflow);
			if (foundNodeIssues !== null) {
				node.issues = foundNodeIssues;
			}
		});
	}

	function getNodeIssues(
		nodeType: INodeTypeDescription | null,
		node: INodeUi,
		workflow: Workflow,
		ignoreIssues?: string[],
	): INodeIssues | null {
		const pinDataNodeNames = Object.keys(workflowsStore.pinnedWorkflowData ?? {});

		let nodeIssues: INodeIssues | null = null;
		ignoreIssues = ignoreIssues ?? [];

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
				const nodeCredentialIssues = getNodeCredentialIssues(node, nodeType);
				if (nodeIssues === null) {
					nodeIssues = nodeCredentialIssues;
				} else {
					NodeHelpers.mergeIssues(nodeIssues, nodeCredentialIssues);
				}
			}

			const nodeInputIssues = getNodeInputIssues(workflow, node, nodeType);
			if (nodeIssues === null) {
				nodeIssues = nodeInputIssues;
			} else {
				NodeHelpers.mergeIssues(nodeIssues, nodeInputIssues);
			}
		}

		if (hasNodeExecutionIssues(node) && !ignoreIssues.includes('execution')) {
			if (nodeIssues === null) {
				nodeIssues = {};
			}
			nodeIssues.execution = true;
		}

		return nodeIssues;
	}

	// Set the status on all the nodes which produced an error so that it can be
	// displayed in the node-view
	function hasNodeExecutionIssues(node: INodeUi): boolean {
		const workflowResultData = workflowsStore.getWorkflowRunData;

		if (workflowResultData === null || !workflowResultData.hasOwnProperty(node.name)) {
			return false;
		}

		for (const taskData of workflowResultData[node.name]) {
			if (taskData.error !== undefined) {
				return true;
			}
		}

		return false;
	}

	function reportUnsetCredential(credentialType: ICredentialType) {
		return {
			credentials: {
				[credentialType.name]: [
					i18n.baseText('nodeHelpers.credentialsUnset', {
						interpolate: {
							credentialType: credentialType.displayName,
						},
					}),
				],
			},
		};
	}

	function updateNodeInputIssues(node: INodeUi): void {
		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		if (!nodeType) {
			return;
		}

		const workflow = workflowsStore.getCurrentWorkflow();
		const nodeInputIssues = getNodeInputIssues(workflow, node, nodeType);

		workflowsStore.setNodeIssue({
			node: node.name,
			type: 'input',
			value: nodeInputIssues?.input ? nodeInputIssues.input : null,
		});
	}

	function updateNodesInputIssues() {
		const nodes = workflowsStore.allNodes;

		for (const node of nodes) {
			updateNodeInputIssues(node);
		}
	}

	function updateNodesExecutionIssues() {
		const nodes = workflowsStore.allNodes;

		for (const node of nodes) {
			workflowsStore.setNodeIssue({
				node: node.name,
				type: 'execution',
				value: hasNodeExecutionIssues(node) ? true : null,
			});
		}
	}

	function updateNodesParameterIssues() {
		const nodes = workflowsStore.allNodes;

		for (const node of nodes) {
			updateNodeParameterIssues(node);
		}
	}

	function updateNodeCredentialIssuesByName(name: string): void {
		const node = workflowsStore.getNodeByName(name);

		if (node) {
			updateNodeCredentialIssues(node);
		}
	}

	function updateNodeCredentialIssues(node: INodeUi): void {
		const fullNodeIssues: INodeIssues | null = getNodeCredentialIssues(node);

		let newIssues: INodeIssueObjectProperty | null = null;
		if (fullNodeIssues !== null) {
			newIssues = fullNodeIssues.credentials!;
		}

		workflowsStore.setNodeIssue({
			node: node.name,
			type: 'credentials',
			value: newIssues,
		});
	}

	function updateNodeParameterIssuesByName(name: string): void {
		const node = workflowsStore.getNodeByName(name);

		if (node) {
			updateNodeParameterIssues(node);
		}
	}

	function updateNodeParameterIssues(node: INodeUi, nodeType?: INodeTypeDescription | null): void {
		const localNodeType = nodeType ?? nodeTypesStore.getNodeType(node.type, node.typeVersion);

		if (localNodeType === null) {
			// Could not find localNodeType so can not update issues
			return;
		}

		// All data got updated everywhere so update now the issues
		const fullNodeIssues: INodeIssues | null = NodeHelpers.getNodeParametersIssues(
			localNodeType.properties,
			node,
		);

		let newIssues: INodeIssueObjectProperty | null = null;
		if (fullNodeIssues !== null) {
			newIssues = fullNodeIssues.parameters!;
		}

		workflowsStore.setNodeIssue({
			node: node.name,
			type: 'parameters',
			value: newIssues,
		});
	}

	function getNodeInputIssues(
		workflow: Workflow,
		node: INodeUi,
		nodeType?: INodeTypeDescription,
	): INodeIssues | null {
		const foundIssues: INodeIssueObjectProperty = {};

		const workflowNode = workflow.getNode(node.name);
		let inputs: Array<NodeConnectionType | INodeInputConfiguration> = [];
		if (nodeType && workflowNode) {
			inputs = NodeHelpers.getNodeInputs(workflow, workflowNode, nodeType);
		}

		inputs.forEach((input) => {
			if (typeof input === 'string' || input.required !== true) {
				return;
			}

			const parentNodes = workflow.getParentNodes(node.name, input.type, 1);

			if (parentNodes.length === 0) {
				foundIssues[input.type] = [
					i18n.baseText('nodeIssues.input.missing', {
						interpolate: { inputName: input.displayName || input.type },
					}),
				];
			}
		});

		if (Object.keys(foundIssues).length) {
			return {
				input: foundIssues,
			};
		}

		return null;
	}

	function getNodeCredentialIssues(
		node: INodeUi,
		nodeType?: INodeTypeDescription,
	): INodeIssues | null {
		const localNodeType = nodeType ?? nodeTypesStore.getNodeType(node.type, node.typeVersion);
		if (node.disabled) {
			// Node is disabled
			return null;
		}
		if (!localNodeType?.credentials) {
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
			const credential = credentialsStore.getCredentialTypeByName(genericAuthType);
			return credential ? reportUnsetCredential(credential) : null;
		}

		if (
			hasProxyAuth(node) &&
			authentication === 'predefinedCredentialType' &&
			nodeCredentialType !== '' &&
			node.credentials !== undefined
		) {
			const stored = credentialsStore.getCredentialsByType(nodeCredentialType);
			// Prevents HTTP Request node from being unusable if a sharee does not have direct
			// access to a credential
			const isCredentialUsedInWorkflow =
				workflowsStore.usedCredentials?.[node.credentials?.[nodeCredentialType]?.id as string];

			if (
				selectedCredsDoNotExist(node, nodeCredentialType, stored) &&
				!isCredentialUsedInWorkflow
			) {
				const credential = credentialsStore.getCredentialTypeByName(nodeCredentialType);
				return credential ? reportUnsetCredential(credential) : null;
			}
		}

		if (
			hasProxyAuth(node) &&
			authentication === 'predefinedCredentialType' &&
			nodeCredentialType !== '' &&
			selectedCredsAreUnusable(node, nodeCredentialType)
		) {
			const credential = credentialsStore.getCredentialTypeByName(nodeCredentialType);
			return credential ? reportUnsetCredential(credential) : null;
		}

		for (const credentialTypeDescription of localNodeType.credentials) {
			// Check if credentials should be displayed else ignore
			if (!displayParameter(node.parameters, credentialTypeDescription, '', node)) {
				continue;
			}

			// Get the display name of the credential type
			credentialType = credentialsStore.getCredentialTypeByName(credentialTypeDescription.name);
			if (!credentialType) {
				credentialDisplayName = credentialTypeDescription.name;
			} else {
				credentialDisplayName = credentialType.displayName;
			}

			if (!node.credentials?.[credentialTypeDescription.name]) {
				// Credentials are not set
				if (credentialTypeDescription.required) {
					foundIssues[credentialTypeDescription.name] = [
						i18n.baseText('nodeIssues.credentials.notSet', {
							interpolate: { type: localNodeType.displayName },
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

				userCredentials = credentialsStore.getCredentialsByType(credentialTypeDescription.name);

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
						i18n.baseText('nodeIssues.credentials.notIdentified', {
							interpolate: { name: selectedCredentials.name, type: credentialDisplayName },
						}),
						i18n.baseText('nodeIssues.credentials.notIdentified.hint'),
					];
					continue;
				}

				if (nameMatches.length === 0) {
					const isCredentialUsedInWorkflow =
						workflowsStore.usedCredentials?.[selectedCredentials.id as string];

					if (
						!isCredentialUsedInWorkflow &&
						!hasPermission(['rbac'], { rbac: { scope: 'credential:read' } })
					) {
						foundIssues[credentialTypeDescription.name] = [
							i18n.baseText('nodeIssues.credentials.doNotExist', {
								interpolate: { name: selectedCredentials.name, type: credentialDisplayName },
							}),
							i18n.baseText('nodeIssues.credentials.doNotExist.hint'),
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
	}
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

	function updateNodesCredentialsIssues() {
		const nodes = workflowsStore.allNodes;
		let issues: INodeIssues | null;

		for (const node of nodes) {
			issues = getNodeCredentialIssues(node);

			workflowsStore.setNodeIssue({
				node: node.name,
				type: 'credentials',
				value: issues?.credentials ?? null,
			});
		}
	}

	function getNodeTaskData(node: INodeUi | null, runIndex = 0) {
		if (node === null) {
			return null;
		}
		if (workflowsStore.getWorkflowExecution === null) {
			return null;
		}

		const executionData = workflowsStore.getWorkflowExecution.data;
		if (!executionData?.resultData) {
			// unknown status
			return null;
		}
		const runData = executionData.resultData.runData;

		const taskData = get(runData, [node.name, runIndex]);
		if (!taskData) {
			return null;
		}

		return taskData;
	}

	function getNodeInputData(
		node: INodeUi | null,
		runIndex = 0,
		outputIndex = 0,
		paneType: NodePanelType = 'output',
		connectionType: NodeConnectionType = NodeConnectionType.Main,
	): INodeExecutionData[] {
		//TODO: check if this needs to be fixed in different place
		if (
			node?.type === SPLIT_IN_BATCHES_NODE_TYPE &&
			paneType === 'input' &&
			runIndex !== 0 &&
			outputIndex !== 0
		) {
			runIndex = runIndex - 1;
		}

		const taskData = getNodeTaskData(node, runIndex);
		if (taskData === null) {
			return [];
		}

		let data: ITaskDataConnections | undefined = taskData.data;
		if (paneType === 'input' && taskData.inputOverride) {
			data = taskData.inputOverride;
		}

		if (!data) {
			return [];
		}

		return getInputData(data, outputIndex, connectionType);
	}

	function getInputData(
		connectionsData: ITaskDataConnections,
		outputIndex: number,
		connectionType: NodeConnectionType = NodeConnectionType.Main,
	): INodeExecutionData[] {
		return connectionsData?.[connectionType]?.[outputIndex] ?? [];
	}

	function getBinaryData(
		workflowRunData: IRunData | null,
		node: string | null,
		runIndex: number,
		outputIndex: number,
		connectionType: NodeConnectionType = NodeConnectionType.Main,
	): IBinaryKeyData[] {
		if (node === null) {
			return [];
		}

		const runData: IRunData | null = workflowRunData;

		const runDataOfNode = runData?.[node]?.[runIndex]?.data;
		if (!runDataOfNode) {
			return [];
		}

		const inputData = getInputData(runDataOfNode, outputIndex, connectionType);

		const returnData: IBinaryKeyData[] = [];
		for (let i = 0; i < inputData.length; i++) {
			const binaryDataInIdx = inputData[i]?.binary;
			if (binaryDataInIdx !== undefined) {
				returnData.push(binaryDataInIdx);
			}
		}

		return returnData;
	}

	function disableNodes(nodes: INodeUi[], { trackHistory = false, trackBulk = true } = {}) {
		const telemetry = useTelemetry();

		if (trackHistory && trackBulk) {
			historyStore.startRecordingUndo();
		}

		const newDisabledState = nodes.some((node) => !node.disabled);
		for (const node of nodes) {
			if (newDisabledState === node.disabled) {
				continue;
			}

			// Toggle disabled flag
			const updateInformation = {
				name: node.name,
				properties: {
					disabled: newDisabledState,
				} as IDataObject,
			} as INodeUpdatePropertiesInformation;

			telemetry.track('User set node enabled status', {
				node_type: node.type,
				is_enabled: node.disabled,
				workflow_id: workflowsStore.workflowId,
			});

			workflowsStore.updateNodeProperties(updateInformation);
			workflowsStore.clearNodeExecutionData(node.name);
			updateNodeParameterIssues(node);
			updateNodeCredentialIssues(node);
			updateNodesInputIssues();
			if (trackHistory) {
				historyStore.pushCommandToUndo(
					new EnableNodeToggleCommand(node.name, node.disabled === true, newDisabledState),
				);
			}
		}

		if (trackHistory && trackBulk) {
			historyStore.stopRecordingUndo();
		}
	}

	function getNodeSubtitle(
		data: INode,
		nodeType: INodeTypeDescription,
		workflow: Workflow,
	): string | undefined {
		if (!data) {
			return undefined;
		}

		if (data.notesInFlow) {
			return data.notes;
		}

		if (nodeType?.subtitle !== undefined) {
			try {
				ExpressionEvaluatorProxy.setEvaluator(
					useSettingsStore().settings.expressions?.evaluator ?? 'tmpl',
				);
				return workflow.expression.getSimpleParameterValue(
					data,
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

			const operationData = nodeType.properties.find((property: INodeProperties) => {
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
	}

	function setSuccessOutput(data: ITaskData[], sourceNode: INodeUi | null) {
		if (!sourceNode) {
			throw new Error('Source node is null or not defined');
		}

		const allNodeConnections = workflowsStore.outgoingConnectionsByNodeName(sourceNode.name);

		const connectionType = Object.keys(allNodeConnections)[0] as NodeConnectionType;
		const nodeConnections = allNodeConnections[connectionType];
		const outputMap = NodeViewUtils.getOutputSummary(
			data,
			nodeConnections || [],
			connectionType ?? NodeConnectionType.Main,
		);
		const sourceNodeType = nodeTypesStore.getNodeType(sourceNode.type, sourceNode.typeVersion);

		Object.keys(outputMap).forEach((sourceOutputIndex: string) => {
			Object.keys(outputMap[sourceOutputIndex]).forEach((targetNodeName: string) => {
				Object.keys(outputMap[sourceOutputIndex][targetNodeName]).forEach(
					(targetInputIndex: string) => {
						if (targetNodeName) {
							const targetNode = workflowsStore.getNodeByName(targetNodeName);
							const connection = NodeViewUtils.getJSPlumbConnection(
								sourceNode,
								parseInt(sourceOutputIndex, 10),
								targetNode,
								parseInt(targetInputIndex, 10),
								connectionType,
								sourceNodeType,
								canvasStore.jsPlumbInstance,
							);

							if (connection) {
								const output = outputMap[sourceOutputIndex][targetNodeName][targetInputIndex];

								if (output.isArtificialRecoveredEventItem) {
									NodeViewUtils.recoveredConnection(connection);
								} else if (!output?.total && !output.isArtificialRecoveredEventItem) {
									NodeViewUtils.resetConnection(connection);
								} else {
									NodeViewUtils.addConnectionOutputSuccess(connection, output);
								}
							}
						}

						const endpoint = NodeViewUtils.getPlusEndpoint(
							sourceNode,
							parseInt(sourceOutputIndex, 10),
							canvasStore.jsPlumbInstance,
						);
						if (endpoint?.endpoint) {
							const output = outputMap[sourceOutputIndex][NODE_OUTPUT_DEFAULT_KEY][0];

							if (output && output.total > 0) {
								(endpoint.endpoint as N8nPlusEndpoint).setSuccessOutput(
									NodeViewUtils.getRunItemsLabel(output),
								);
							} else {
								(endpoint.endpoint as N8nPlusEndpoint).clearSuccessOutput();
							}
						}
					},
				);
			});
		});
	}

	function matchCredentials(node: INodeUi) {
		if (!node.credentials) {
			return;
		}
		Object.entries(node.credentials).forEach(
			([nodeCredentialType, nodeCredentials]: [string, INodeCredentialsDetails]) => {
				const credentialOptions = credentialsStore.getCredentialsByType(nodeCredentialType);

				// Check if workflows applies old credentials style
				if (typeof nodeCredentials === 'string') {
					nodeCredentials = {
						id: null,
						name: nodeCredentials,
					};
					credentialsUpdated.value = true;
				}

				if (nodeCredentials.id) {
					// Check whether the id is matching with a credential
					const credentialsId = nodeCredentials.id.toString(); // due to a fixed bug in the migration UpdateWorkflowCredentials (just sqlite) we have to cast to string and check later if it has been a number
					const credentialsForId = credentialOptions.find(
						(optionData: ICredentialsResponse) => optionData.id === credentialsId,
					);
					if (credentialsForId) {
						if (
							credentialsForId.name !== nodeCredentials.name ||
							typeof nodeCredentials.id === 'number'
						) {
							node.credentials![nodeCredentialType] = {
								id: credentialsForId.id,
								name: credentialsForId.name,
							};
							credentialsUpdated.value = true;
						}
						return;
					}
				}

				// No match for id found or old credentials type used
				node.credentials![nodeCredentialType] = nodeCredentials;

				// check if only one option with the name would exist
				const credentialsForName = credentialOptions.filter(
					(optionData: ICredentialsResponse) => optionData.name === nodeCredentials.name,
				);

				// only one option exists for the name, take it
				if (credentialsForName.length === 1) {
					node.credentials![nodeCredentialType].id = credentialsForName[0].id;
					credentialsUpdated.value = true;
				}
			},
		);
	}

	function deleteJSPlumbConnection(connection: Connection, trackHistory = false) {
		// Make sure to remove the overlay else after the second move
		// it visibly stays behind free floating without a connection.
		connection.removeOverlays();

		pullConnActiveNodeName.value = null; // prevent new connections when connectionDetached is triggered
		canvasStore.jsPlumbInstance?.deleteConnection(connection); // on delete, triggers connectionDetached event which applies mutation to store
		if (trackHistory && connection.__meta) {
			const connectionData: [IConnection, IConnection] = [
				{
					index: connection.__meta?.sourceOutputIndex,
					node: connection.__meta.sourceNodeName,
					type: NodeConnectionType.Main,
				},
				{
					index: connection.__meta?.targetOutputIndex,
					node: connection.__meta.targetNodeName,
					type: NodeConnectionType.Main,
				},
			];
			const removeCommand = new RemoveConnectionCommand(connectionData);
			historyStore.pushCommandToUndo(removeCommand);
		}
	}

	async function loadNodesProperties(nodeInfos: INodeTypeNameVersion[]): Promise<void> {
		const allNodes: INodeTypeDescription[] = nodeTypesStore.allNodeTypes;

		const nodesToBeFetched: INodeTypeNameVersion[] = [];
		allNodes.forEach((node) => {
			const nodeVersions = Array.isArray(node.version) ? node.version : [node.version];
			if (
				!!nodeInfos.find((n) => n.name === node.name && nodeVersions.includes(n.version)) &&
				!node.hasOwnProperty('properties')
			) {
				nodesToBeFetched.push({
					name: node.name,
					version: Array.isArray(node.version) ? node.version.slice(-1)[0] : node.version,
				});
			}
		});

		if (nodesToBeFetched.length > 0) {
			// Only call API if node information is actually missing
			canvasStore.startLoading();
			await nodeTypesStore.getNodesInformation(nodesToBeFetched);
			canvasStore.stopLoading();
		}
	}

	function addConnectionsTestData() {
		canvasStore.jsPlumbInstance?.connections.forEach((connection) => {
			NodeViewUtils.addConnectionTestData(
				connection.source,
				connection.target,
				connection?.connector?.hasOwnProperty('canvas') ? connection?.connector.canvas : undefined,
			);
		});
	}

	async function processConnectionBatch(batchedConnectionData: Array<[IConnection, IConnection]>) {
		const batchSize = 100;

		for (let i = 0; i < batchedConnectionData.length; i += batchSize) {
			const batch = batchedConnectionData.slice(i, i + batchSize);

			batch.forEach((connectionData) => {
				addConnection(connectionData);
			});
		}
	}

	function addPinDataConnections(pinData?: IPinData) {
		if (!pinData) {
			return;
		}

		Object.keys(pinData).forEach((nodeName) => {
			const node = workflowsStore.getNodeByName(nodeName);
			if (!node) {
				return;
			}

			const nodeElement = document.getElementById(node.id);
			if (!nodeElement) {
				return;
			}

			const hasRun = workflowsStore.getWorkflowResultDataByNodeName(nodeName) !== null;
			// In case we are showing a production execution preview we want
			// to show pinned data connections as they wouldn't have been pinned
			const classNames = isProductionExecutionPreview.value ? [] : ['pinned'];

			if (hasRun) {
				classNames.push('has-run');
			}

			const connections = canvasStore.jsPlumbInstance?.getConnections({
				source: nodeElement,
			});

			const connectionsArray = Array.isArray(connections)
				? connections
				: Object.values(connections);

			connectionsArray.forEach((connection) => {
				NodeViewUtils.addConnectionOutputSuccess(connection, {
					total: pinData[nodeName].length,
					iterations: 0,
					classNames,
				});
			});
		});
	}

	function removePinDataConnections(event: UnpinNodeDataEvent) {
		for (const nodeName of event.nodeNames) {
			const node = workflowsStore.getNodeByName(nodeName);
			if (!node) {
				return;
			}

			const nodeElement = document.getElementById(node.id);
			if (!nodeElement) {
				return;
			}

			const connections = canvasStore.jsPlumbInstance?.getConnections({
				source: nodeElement,
			});

			const connectionsArray = Array.isArray(connections)
				? connections
				: Object.values(connections);

			canvasStore.jsPlumbInstance.setSuspendDrawing(true);
			connectionsArray.forEach(NodeViewUtils.resetConnection);
			canvasStore.jsPlumbInstance.setSuspendDrawing(false, true);
		}
	}

	function getOutputEndpointUUID(
		nodeName: string,
		connectionType: NodeConnectionType,
		index: number,
	): string | null {
		const node = workflowsStore.getNodeByName(nodeName);
		if (!node) {
			return null;
		}

		return NodeViewUtils.getOutputEndpointUUID(node.id, connectionType, index);
	}
	function getInputEndpointUUID(
		nodeName: string,
		connectionType: NodeConnectionType,
		index: number,
	) {
		const node = workflowsStore.getNodeByName(nodeName);
		if (!node) {
			return null;
		}

		return NodeViewUtils.getInputEndpointUUID(node.id, connectionType, index);
	}

	function addConnection(connection: [IConnection, IConnection]) {
		const outputUuid = getOutputEndpointUUID(
			connection[0].node,
			connection[0].type,
			connection[0].index,
		);
		const inputUuid = getInputEndpointUUID(
			connection[1].node,
			connection[1].type,
			connection[1].index,
		);
		if (!outputUuid || !inputUuid) {
			return;
		}

		const uuids: [string, string] = [outputUuid, inputUuid];
		// Create connections in DOM
		canvasStore.jsPlumbInstance?.connect({
			uuids,
			detachable: !route?.meta?.readOnlyCanvas && !sourceControlStore.preferences.branchReadOnly,
		});

		setTimeout(() => {
			addPinDataConnections(workflowsStore.pinnedWorkflowData);
		});
	}

	function removeConnection(
		connection: [IConnection, IConnection],
		removeVisualConnection = false,
	) {
		if (removeVisualConnection) {
			const sourceNode = workflowsStore.getNodeByName(connection[0].node);
			const targetNode = workflowsStore.getNodeByName(connection[1].node);

			if (!sourceNode || !targetNode) {
				return;
			}

			const sourceElement = document.getElementById(sourceNode.id);
			const targetElement = document.getElementById(targetNode.id);

			if (sourceElement && targetElement) {
				const connections = canvasStore.jsPlumbInstance?.getConnections({
					source: sourceElement,
					target: targetElement,
				});

				if (Array.isArray(connections)) {
					connections.forEach((connectionInstance: Connection) => {
						if (connectionInstance.__meta) {
							// Only delete connections from specific indexes (if it can be determined by meta)
							if (
								connectionInstance.__meta.sourceOutputIndex === connection[0].index &&
								connectionInstance.__meta.targetOutputIndex === connection[1].index
							) {
								deleteJSPlumbConnection(connectionInstance);
							}
						} else {
							deleteJSPlumbConnection(connectionInstance);
						}
					});
				}
			}
		}

		workflowsStore.removeConnection({ connection });
	}

	function removeConnectionByConnectionInfo(
		info: ConnectionDetachedParams,
		removeVisualConnection = false,
		trackHistory = false,
	) {
		const connectionInfo: [IConnection, IConnection] | null = getConnectionInfo(info);

		if (connectionInfo) {
			if (removeVisualConnection) {
				deleteJSPlumbConnection(info.connection, trackHistory);
			} else if (trackHistory) {
				historyStore.pushCommandToUndo(new RemoveConnectionCommand(connectionInfo));
			}
			workflowsStore.removeConnection({ connection: connectionInfo });
		}
	}

	async function addConnections(connections: IConnections) {
		const batchedConnectionData: Array<[IConnection, IConnection]> = [];

		for (const sourceNode in connections) {
			for (const type in connections[sourceNode]) {
				connections[sourceNode][type].forEach((outwardConnections, sourceIndex) => {
					if (outwardConnections) {
						outwardConnections.forEach((targetData) => {
							batchedConnectionData.push([
								{
									node: sourceNode,
									type: getEndpointScope(type) ?? NodeConnectionType.Main,
									index: sourceIndex,
								},
								{ node: targetData.node, type: targetData.type, index: targetData.index },
							]);
						});
					}
				});
			}
		}

		// Process the connections in batches
		await processConnectionBatch(batchedConnectionData);
		setTimeout(addConnectionsTestData, 0);
	}

	async function addNodes(nodes: INodeUi[], connections?: IConnections, trackHistory = false) {
		if (!nodes?.length) {
			return;
		}
		isInsertingNodes.value = true;
		// Before proceeding we must check if all nodes contain the `properties` attribute.
		// Nodes are loaded without this information so we must make sure that all nodes
		// being added have this information.
		await loadNodesProperties(
			nodes.map((node) => ({ name: node.type, version: node.typeVersion })),
		);

		// Add the node to the node-list
		let nodeType: INodeTypeDescription | null;
		nodes.forEach((node) => {
			const newNode: INodeUi = {
				...node,
			};

			if (!newNode.id) {
				assignNodeId(newNode);
			}

			nodeType = nodeTypesStore.getNodeType(newNode.type, newNode.typeVersion);

			// Make sure that some properties always exist
			if (!newNode.hasOwnProperty('disabled')) {
				newNode.disabled = false;
			}

			if (!newNode.hasOwnProperty('parameters')) {
				newNode.parameters = {};
			}

			// Load the default parameter values because only values which differ
			// from the defaults get saved
			if (nodeType !== null) {
				let nodeParameters = null;
				try {
					nodeParameters = NodeHelpers.getNodeParameters(
						nodeType.properties,
						newNode.parameters,
						true,
						false,
						node,
					);
				} catch (e) {
					console.error(
						i18n.baseText('nodeView.thereWasAProblemLoadingTheNodeParametersOfNode') +
							`: "${newNode.name}"`,
					);
					console.error(e);
				}
				newNode.parameters = nodeParameters ?? {};

				// if it's a webhook and the path is empty set the UUID as the default path
				if (
					[WEBHOOK_NODE_TYPE, FORM_TRIGGER_NODE_TYPE].includes(newNode.type) &&
					newNode.parameters.path === ''
				) {
					newNode.parameters.path = newNode.webhookId as string;
				}
			}

			// check and match credentials, apply new format if old is used
			matchCredentials(newNode);
			workflowsStore.addNode(newNode);
			if (trackHistory) {
				historyStore.pushCommandToUndo(new AddNodeCommand(newNode));
			}
		});

		// Wait for the nodes to be rendered
		await nextTick();

		canvasStore.jsPlumbInstance?.setSuspendDrawing(true);

		if (connections) {
			await addConnections(connections);
		}
		// Add the node issues at the end as the node-connections are required
		refreshNodeIssues();
		updateNodesInputIssues();
		/////////////////////////////this.resetEndpointsErrors();
		isInsertingNodes.value = false;

		// Now it can draw again
		canvasStore.jsPlumbInstance?.setSuspendDrawing(false, true);
	}

	function assignNodeId(node: INodeUi) {
		const id = window.crypto.randomUUID();
		node.id = id;
		return id;
	}

	function assignWebhookId(node: INodeUi) {
		const id = window.crypto.randomUUID();
		node.webhookId = id;
		return id;
	}

	return {
		hasProxyAuth,
		isCustomApiCallSelected,
		getParameterValue,
		displayParameter,
		getNodeIssues,
		updateNodesInputIssues,
		updateNodesExecutionIssues,
		updateNodesParameterIssues,
		updateNodeInputIssues,
		updateNodeCredentialIssuesByName,
		updateNodeCredentialIssues,
		updateNodeParameterIssuesByName,
		updateNodeParameterIssues,
		getBinaryData,
		disableNodes,
		getNodeSubtitle,
		updateNodesCredentialsIssues,
		getNodeInputData,
		setSuccessOutput,
		matchCredentials,
		isInsertingNodes,
		credentialsUpdated,
		isProductionExecutionPreview,
		pullConnActiveNodeName,
		deleteJSPlumbConnection,
		loadNodesProperties,
		addNodes,
		addConnections,
		addConnection,
		removeConnection,
		removeConnectionByConnectionInfo,
		addPinDataConnections,
		removePinDataConnections,
		getNodeTaskData,
		assignNodeId,
		assignWebhookId,
	};
}
