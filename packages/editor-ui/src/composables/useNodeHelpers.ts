import { ref } from 'vue';
import { useHistoryStore } from '@/stores/history.store';
import {
	CUSTOM_API_CALL_KEY,
	PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
	SPLIT_IN_BATCHES_NODE_TYPE,
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
	INodeTypeNameVersion,
	NodeParameterValue,
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
import { EnableNodeToggleCommand } from '@/models/history';
import { useTelemetry } from './useTelemetry';
import { hasPermission } from '@/utils/rbac/permissions';
import { useCanvasStore } from '@/stores/canvas.store';

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

	/** nodes that would execute only once with such parameters add 'undefined' to parameters values if it is parameter's default value */
	const SINGLE_EXECUTION_NODES: { [key: string]: { [key: string]: NodeParameterValue[] } } = {
		'n8n-nodes-base.code': {
			mode: [undefined, 'runOnceForAllItems'],
		},
		'n8n-nodes-base.executeWorkflow': {
			mode: [undefined, 'once'],
		},
		'n8n-nodes-base.crateDb': {
			operation: [undefined, 'update'], // default insert
		},
		'n8n-nodes-base.timescaleDb': {
			operation: [undefined, 'update'], // default insert
		},
		'n8n-nodes-base.microsoftSql': {
			operation: [undefined, 'update', 'delete'], // default insert
		},
		'n8n-nodes-base.questDb': {
			operation: [undefined], // default insert
		},
		'n8n-nodes-base.mongoDb': {
			operation: ['insert', 'update'],
		},
		'n8n-nodes-base.redis': {
			operation: [undefined], // default info
		},
	};

	function isSingleExecution(type: string, parameters: INodeParameters): boolean {
		const singleExecutionCase = SINGLE_EXECUTION_NODES[type];

		if (singleExecutionCase) {
			for (const parameter of Object.keys(singleExecutionCase)) {
				if (!singleExecutionCase[parameter].includes(parameters[parameter] as NodeParameterValue)) {
					return false;
				}
			}

			return true;
		}

		return false;
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
		matchCredentials,
		isInsertingNodes,
		credentialsUpdated,
		isProductionExecutionPreview,
		pullConnActiveNodeName,
		loadNodesProperties,
		getNodeTaskData,
		assignNodeId,
		assignWebhookId,
		isSingleExecution,
	};
}
