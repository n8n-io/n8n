import { ref, computed } from 'vue';
import { useHistoryStore } from '@/app/stores/history.store';
import { CUSTOM_API_CALL_KEY, PLACEHOLDER_FILLED_AT_EXECUTION_TIME } from '@/app/constants';

import { NodeHelpers, NodeConnectionTypes } from 'n8n-workflow';
import type {
	INodeProperties,
	INodeTypeDescription,
	Workflow,
	INodeExecutionData,
	ITaskDataConnections,
	IRunData,
	IBinaryKeyData,
	INode,
	INodePropertyOptions,
	INodeCredentialsDetails,
	INodeParameters,
	INodeTypeNameVersion,
	NodeParameterValue,
	NodeConnectionType,
	IRunExecutionData,
	NodeHint,
} from 'n8n-workflow';

import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import type { AddedNode, INodeUi, INodeUpdatePropertiesInformation } from '@/Interface';
import type { NodePanelType } from '@/features/ndv/shared/ndv.types';

import { isString } from '@/app/utils/typeGuards';
import { isObject } from '@/app/utils/objectUtils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { EnableNodeToggleCommand } from '@/app/models/history';
import { useTelemetry } from './useTelemetry';
import { useCanvasStore } from '@/app/stores/canvas.store';
import { injectWorkflowState, type WorkflowState } from './useWorkflowState';

export function useNodeHelpers(opts: { workflowState?: WorkflowState } = {}) {
	const credentialsStore = useCredentialsStore();
	const historyStore = useHistoryStore();
	const nodeTypesStore = useNodeTypesStore();
	const workflowsStore = useWorkflowsStore();
	const workflowState = opts.workflowState ?? injectWorkflowState();
	const canvasStore = useCanvasStore();

	const isInsertingNodes = ref(false);
	const credentialsUpdated = ref(false);
	const isProductionExecutionPreview = ref(false);
	const pullConnActiveNodeName = ref<string | null>(null);

	const workflowObject = computed(() => workflowsStore.workflowObject as Workflow);

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

	/**
	 * Determines whether a given node is considered executable in the workflow editor.
	 *
	 * A node is considered executable if:
	 * - It structurally qualifies for execution (e.g. is a trigger, tool, or has a 'Main' input),
	 *   AND
	 * - It is either explicitly marked as `executable`, OR uses foreign credentials
	 *   (credentials the current user cannot access, allowed under Workflow Sharing).
	 *
	 * @param node The node to check
	 * @param executable Whether the node is in a state that allows execution (e.g. not readonly)
	 * @param foreignCredentials List of credential IDs that the current user cannot access
	 */
	function isNodeExecutable(
		node: INodeUi | null,
		executable: boolean | undefined,
		foreignCredentials: string[],
	): boolean {
		const nodeType = node ? nodeTypesStore.getNodeType(node.type, node.typeVersion) : null;
		if (node && nodeType) {
			const workflowNode = workflowObject.value.getNode(node.name);

			const isTriggerNode = !!node && nodeTypesStore.isTriggerNode(node.type);
			const isToolNode = !!node && nodeTypesStore.isToolNode(node.type);

			if (workflowNode) {
				const inputs = NodeHelpers.getNodeInputs(workflowObject.value, workflowNode, nodeType);
				const inputNames = NodeHelpers.getConnectionTypes(inputs);

				if (!inputNames.includes(NodeConnectionTypes.Main) && !isToolNode && !isTriggerNode) {
					return false;
				}
			}
		}

		return Boolean(executable || foreignCredentials.length > 0);
	}

	function getNodeTaskData(nodeName: string, runIndex = 0, execution?: IRunExecutionData) {
		return getAllNodeTaskData(nodeName, execution)?.[runIndex] ?? null;
	}

	function getAllNodeTaskData(nodeName: string, execution?: IRunExecutionData) {
		const runData = execution?.resultData.runData ?? workflowsStore.getWorkflowRunData;

		return runData?.[nodeName] ?? null;
	}

	function hasNodeExecuted(nodeName: string) {
		return (
			getAllNodeTaskData(nodeName)?.some(
				({ executionStatus }) => executionStatus && ['success', 'error'].includes(executionStatus),
			) ?? false
		);
	}

	function getLastRunIndexWithData(
		nodeName: string,
		outputIndex = 0,
		connectionType: NodeConnectionType = NodeConnectionTypes.Main,
		execution?: IRunExecutionData,
	) {
		const allTaskData = getAllNodeTaskData(nodeName, execution) ?? [];

		return allTaskData.findLastIndex(
			(taskData) =>
				taskData.data && getInputData(taskData.data, outputIndex, connectionType).length > 0,
		);
	}

	function getNodeInputData(
		node: INodeUi | null,
		runIndex = 0,
		outputIndex = 0,
		paneType: NodePanelType = 'output',
		connectionType: NodeConnectionType = NodeConnectionTypes.Main,
		execution?: IRunExecutionData,
	): INodeExecutionData[] {
		if (!node) return [];
		const taskData = getNodeTaskData(node.name, runIndex, execution);
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
		connectionType: NodeConnectionType = NodeConnectionTypes.Main,
	): INodeExecutionData[] {
		return connectionsData?.[connectionType]?.[outputIndex] ?? [];
	}

	function getBinaryData(
		workflowRunData: IRunData | null,
		node: string | null,
		runIndex: number,
		outputIndex: number,
		connectionType: NodeConnectionType = NodeConnectionTypes.Main,
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
			const updateInformation: INodeUpdatePropertiesInformation = {
				name: node.name,
				properties: {
					disabled: newDisabledState,
				},
			};

			telemetry.track('User set node enabled status', {
				node_type: node.type,
				is_enabled: node.disabled,
				workflow_id: workflowsStore.workflowId,
			});

			workflowState.updateNodeProperties(updateInformation);
			workflowsStore.clearNodeExecutionData(node.name);
			workflowState.updateNodeParameterIssues(node);
			workflowState.updateNodeCredentialIssues(node);
			workflowState.updateNodesInputIssues();
			if (trackHistory) {
				historyStore.pushCommandToUndo(
					new EnableNodeToggleCommand(
						node.name,
						node.disabled === true,
						newDisabledState,
						Date.now(),
					),
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

	function getNodeHints(
		workflow: Workflow,
		node: INode,
		nodeTypeData: INodeTypeDescription,
		nodeInputData?: {
			runExecutionData: IRunExecutionData | null;
			runIndex: number;
			connectionInputData: INodeExecutionData[];
		},
	): NodeHint[] {
		const hints: NodeHint[] = [];

		if (nodeTypeData?.hints?.length) {
			for (const hint of nodeTypeData.hints) {
				if (hint.displayCondition) {
					try {
						let display;

						if (nodeInputData === undefined) {
							display = (workflow.expression.getSimpleParameterValue(
								node,
								hint.displayCondition,
								'internal',
								{},
							) || false) as boolean;
						} else {
							const { runExecutionData, runIndex, connectionInputData } = nodeInputData;
							display = workflow.expression.getParameterValue(
								hint.displayCondition,
								runExecutionData ?? null,
								runIndex,
								0,
								node.name,
								connectionInputData,
								'manual',
								{},
							);
						}

						if (typeof display === 'string' && display.trim() === 'true') {
							display = true;
						}

						if (typeof display !== 'boolean') {
							console.warn(
								`Condition was not resolved as boolean in '${node.name}' node for hint: `,
								hint.message,
							);
							continue;
						}

						if (display) {
							hints.push(hint);
						}
					} catch (e) {
						console.warn(
							`Could not calculate display condition in '${node.name}' node for hint: `,
							hint.message,
						);
					}
				} else {
					hints.push(hint);
				}
			}
		}

		return hints;
	}

	function getDefaultNodeName(node: AddedNode | INode) {
		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		if (nodeType === null) return null;
		const parameters = NodeHelpers.getNodeParameters(
			nodeType?.properties,
			node.parameters ?? {},
			true,
			false,
			node.typeVersion ? { typeVersion: node.typeVersion } : null,
			nodeType,
		);

		return NodeHelpers.makeNodeName(parameters ?? {}, nodeType);
	}

	return {
		isCustomApiCallSelected,
		isNodeExecutable,
		getBinaryData,
		disableNodes,
		getNodeSubtitle,
		getLastRunIndexWithData,
		hasNodeExecuted,
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
		getNodeHints,
		getDefaultNodeName,
	};
}
