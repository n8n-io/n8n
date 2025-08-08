import { handleActions } from 'typed-worker';
import type {
	IConnections,
	IDataObject,
	INode,
	IExecuteData,
	INodeConnection,
	INodeExecutionData,
	INodeParameters,
	IPinData,
	IRunData,
	IRunExecutionData,
	IWorkflowDataProxyAdditionalKeys,
	INodeType,
	NodeParameterValue,
	INodeTypes,
	INodeTypeDescription,
} from 'n8n-workflow';
import { jsonParse, Workflow, NodeConnectionTypes } from 'n8n-workflow';
import type { IExecutionResponse, INodeUi, TargetItem } from '@/Interface';
import {
	ERROR_TRIGGER_NODE_TYPE,
	START_NODE_TYPE,
	HTTP_REQUEST_NODE_TYPE,
	PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
} from '@/constants';
import { getSourceItems } from '@/utils/pairedItemUtils';
import get from 'lodash/get';
import * as workflowUtils from 'n8n-workflow/common';
import { useSQLite } from '@/data/useSQLite';

export type ResolveParameterOptions = {
	targetItem?: TargetItem;
	inputNodeName?: string;
	inputRunIndex?: number;
	inputBranchIndex?: number;
	additionalKeys?: IWorkflowDataProxyAdditionalKeys;
	isForCredential?: boolean;
	contextNodeName?: string;
	connections?: IConnections;
};

const dbPromise = useSQLite();

function executeDataImpl(
	connections: IConnections,
	parentNodes: string[],
	currentNode: string,
	inputName: string,
	runIndex: number,
	shouldReplaceInputDataWithPinData: boolean,
	pinData: IPinData | undefined,
	workflowRunData: IRunData | null,
	parentRunIndex?: number,
): IExecuteData {
	const connectionsByDestinationNode = workflowUtils.mapConnectionsByDestination(connections);

	const executeData = {
		node: {},
		data: {},
		source: null,
	} as IExecuteData;

	parentRunIndex = parentRunIndex ?? runIndex;

	// Find the parent node which has data
	for (const parentNodeName of parentNodes) {
		if (shouldReplaceInputDataWithPinData) {
			const parentPinData = pinData?.[parentNodeName];

			// populate `executeData` from `pinData`

			if (parentPinData) {
				executeData.data = { main: [parentPinData] };
				executeData.source = { main: [{ previousNode: parentNodeName }] };

				return executeData;
			}
		}

		// populate `executeData` from `runData`
		if (workflowRunData === null) {
			return executeData;
		}

		if (
			!workflowRunData[parentNodeName] ||
			workflowRunData[parentNodeName].length <= parentRunIndex ||
			!workflowRunData[parentNodeName][parentRunIndex] ||
			!workflowRunData[parentNodeName][parentRunIndex].hasOwnProperty('data') ||
			!workflowRunData[parentNodeName][parentRunIndex].data?.hasOwnProperty(inputName)
		) {
			executeData.data = {};
		} else {
			executeData.data = workflowRunData[parentNodeName][parentRunIndex].data!;
			if (workflowRunData[currentNode] && workflowRunData[currentNode][runIndex]) {
				executeData.source = {
					[inputName]: workflowRunData[currentNode][runIndex].source,
				};
			} else {
				let previousNodeOutput: number | undefined;
				// As the node can be connected through either of the outputs find the correct one
				// and set it to make pairedItem work on not executed nodes
				if (connectionsByDestinationNode[currentNode]?.main) {
					mainConnections: for (const mainConnections of connectionsByDestinationNode[currentNode]
						.main) {
						for (const connection of mainConnections ?? []) {
							if (
								connection.type === NodeConnectionTypes.Main &&
								connection.node === parentNodeName
							) {
								previousNodeOutput = connection.index;
								break mainConnections;
							}
						}
					}
				}

				// The current node did not get executed in UI yet so build data manually
				executeData.source = {
					[inputName]: [
						{
							previousNode: parentNodeName,
							previousNodeOutput,
							previousNodeRun: parentRunIndex,
						},
					],
				};
			}
			return executeData;
		}
	}

	return executeData;
}

function connectionInputData(
	connections: IConnections,
	parentNode: string[],
	currentNode: string,
	inputName: string,
	runIndex: number,
	shouldReplaceInputDataWithPinData: boolean,
	pinData: IPinData | undefined,
	workflowRunData: IRunData | null,
	nodeConnection: INodeConnection = { sourceIndex: 0, destinationIndex: 0 },
): INodeExecutionData[] | null {
	let connectionInputData: INodeExecutionData[] | null = null;
	const _executeData = executeDataImpl(
		connections,
		parentNode,
		currentNode,
		inputName,
		runIndex,
		shouldReplaceInputDataWithPinData,
		pinData,
		workflowRunData,
	);
	if (parentNode.length) {
		if (
			!Object.keys(_executeData.data).length ||
			_executeData.data[inputName].length <= nodeConnection.sourceIndex
		) {
			connectionInputData = [];
		} else {
			connectionInputData = _executeData.data[inputName][nodeConnection.sourceIndex];

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

	return connectionInputData;
}

function resolveParameterImpl<T = IDataObject>(
	parameter: NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[],
	workflowObject: Workflow,
	connections: IConnections,
	envVars: Record<string, string | boolean | number>,
	ndvActiveNode: INodeUi | null,
	executionData: IExecutionResponse | null,
	shouldReplaceInputDataWithPinData: boolean,
	pinData: IPinData | undefined,
	opts: ResolveParameterOptions = {},
): T | null {
	let itemIndex = opts?.targetItem?.itemIndex || 0;

	const additionalKeys: IWorkflowDataProxyAdditionalKeys = {
		$execution: {
			id: PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
			mode: 'test',
			resumeUrl: PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
			resumeFormUrl: PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
		},
		$vars: envVars,

		// deprecated
		$executionId: PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
		$resumeWebhookUrl: PLACEHOLDER_FILLED_AT_EXECUTION_TIME,

		...opts.additionalKeys,
	};

	if (opts.isForCredential) {
		// node-less expression resolution
		return workflowObject.expression.getParameterValue(
			parameter,
			null,
			0,
			itemIndex,
			'',
			[],
			'manual',
			additionalKeys,
			undefined,
			false,
			undefined,
			'',
		) as T;
	}

	const inputName = NodeConnectionTypes.Main;

	const activeNode = ndvActiveNode ?? workflowObject.getNode(opts.contextNodeName || '');
	let contextNode = activeNode;

	if (activeNode) {
		contextNode = workflowObject.getParentMainInputNode(activeNode) ?? null;
	}

	const workflowRunData = executionData?.data?.resultData.runData ?? null;
	let parentNode = workflowObject.getParentNodes(contextNode!.name, inputName, 1);

	let runIndexParent = opts?.inputRunIndex ?? 0;
	const nodeConnection = workflowObject.getNodeConnectionIndexes(contextNode!.name, parentNode[0]);
	if (opts.targetItem && opts?.targetItem?.nodeName === contextNode!.name && executionData) {
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
		connections,
		parentNode,
		contextNode!.name,
		inputName,
		runIndexParent,
		shouldReplaceInputDataWithPinData,
		pinData,
		executionData?.data?.resultData.runData ?? null,
		nodeConnection,
	);

	if (_connectionInputData === null && contextNode && activeNode?.name !== contextNode.name) {
		// For Sub-Nodes connected to Trigger-Nodes use the data of the root-node
		// (Gets for example used by the Memory connected to the Chat-Trigger-Node)
		const _executeData = executeDataImpl(
			connections,
			[contextNode.name],
			contextNode.name,
			inputName,
			0,
			shouldReplaceInputDataWithPinData,
			pinData,
			executionData?.data?.resultData.runData ?? null,
		);
		_connectionInputData = get(_executeData, ['data', inputName, 0], null);
	}

	let runExecutionData: IRunExecutionData;
	if (!executionData?.data) {
		runExecutionData = {
			resultData: {
				runData: {},
			},
		};
	} else {
		runExecutionData = executionData.data;
	}

	if (_connectionInputData === null) {
		_connectionInputData = [];
	}

	if (activeNode?.type === HTTP_REQUEST_NODE_TYPE) {
		const EMPTY_RESPONSE = { statusCode: 200, headers: {}, body: {} };
		const EMPTY_REQUEST = { headers: {}, body: {}, qs: {} };
		// Add $request,$response,$pageCount for HTTP Request-Nodes as it is used
		// in pagination expressions
		additionalKeys.$pageCount = 0;
		additionalKeys.$response = get(
			executionData,
			['data', 'executionData', 'contextData', `node:${activeNode.name}`, 'response'],
			EMPTY_RESPONSE,
		);
		additionalKeys.$request = EMPTY_REQUEST;
	}

	let runIndexCurrent = opts?.targetItem?.runIndex ?? 0;
	if (
		opts?.targetItem === undefined &&
		workflowRunData !== null &&
		workflowRunData[contextNode!.name]
	) {
		runIndexCurrent = workflowRunData[contextNode!.name].length - 1;
	}
	let _executeData = executeDataImpl(
		connections,
		parentNode,
		contextNode!.name,
		inputName,
		runIndexCurrent,
		shouldReplaceInputDataWithPinData,
		pinData,
		executionData?.data?.resultData.runData ?? null,
		runIndexParent,
	);

	if (!_executeData.source) {
		// fallback to parent's run index for multi-output case
		_executeData = executeDataImpl(
			connections,
			parentNode,
			contextNode!.name,
			inputName,
			runIndexParent,
			shouldReplaceInputDataWithPinData,
			pinData,
			executionData?.data?.resultData.runData ?? null,
		);
	}

	return workflowObject.expression.getParameterValue(
		parameter,
		runExecutionData,
		runIndexCurrent,
		itemIndex,
		activeNode!.name,
		_connectionInputData,
		'manual',
		additionalKeys,
		_executeData,
		false,
		{},
		contextNode!.name,
	) as T;
}

let nodeTypes: INodeTypes = {};

function getNodeType(nodeTypeName: string, version?: number): INodeTypeDescription | null {
	// @TODO Currently unsupported node types
	// if (nodeTypeUtils.isCredentialOnlyNodeType(nodeTypeName)) {
	// 	return getCredentialOnlyNodeType.value(nodeTypeName, version);
	// }

	const nodeVersions = nodeTypes[nodeTypeName];

	if (!nodeVersions) return null;

	const versionNumbers = Object.keys(nodeVersions).map(Number);
	const nodeType = nodeVersions[version ?? Math.max(...versionNumbers)];
	return nodeType ?? null;
}

export const actions = {
	async resolveParameter<T = IDataObject>(
		parameter: NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[],
		options: {
			executionId?: string;
			workflowId: string;
			nodeName?: string;
			nodes: string;
			connectionsBySourceNode: string;
			envVars: string;
			pinData: string;
			inputNode?: string;
			additionalKeys: string;
		} = {},
	): Promise<T | null> {
		const db = await dbPromise;
		const executionId = options.executionId ?? null;
		const execution = null;
		if (executionId) {
			const result = await db.promiser('exec', {
				dbId: db.dbId,
				sql: 'SELECT * FROM executions WHERE id = ?',
				bind: [executionId],
			});

			console.log('Execution result in worker', result);
		}

		const workflowId = options.workflowId;
		const nodeName = options.nodeName ?? null;
		const nodes = options.nodes ? jsonParse<INode[]>(options.nodes) : [];
		const node = nodes.find((n) => n.name === nodeName);
		const connectionsBySourceNode = options.connectionsBySourceNode
			? jsonParse<IConnections>(options.connectionsBySourceNode)
			: {};
		const envVars = options.envVars
			? jsonParse<Record<string, string | boolean | number>>(options.envVars)
			: {};
		const pinData = options.pinData ? jsonParse<IPinData>(options.pinData) : {};
		const inputNode = options.inputNode
			? jsonParse<{ name: string; runIndex: number; branchIndex: number }>(options.inputNode)
			: null;
		const additionalKeys = options.additionalKeys
			? jsonParse<IDataObject>(options.additionalKeys)
			: {};

		const workflowObject = new Workflow({
			id: workflowId,
			nodes,
			connections: connectionsBySourceNode,
			active: false,
			nodeTypes: {
				nodeTypes,
				init: async (): Promise<void> => {},
				getByNameAndVersion: (nodeType: string, version?: number): INodeType | undefined => {
					const nodeTypeDescription = getNodeType(nodeType, version);

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
			},
		});

		console.log('resolveParameter in WORKER', parameter, {
			executionId,
			nodeName,
			nodes,
			connectionsBySourceNode,
			envVars,
			pinData,
			inputNode,
			additionalKeys,
			workflowObject,
		});

		return await resolveParameterImpl(
			parameter,
			workflowObject,
			connectionsBySourceNode,
			envVars,
			node,
			execution,
			true,
			pinData,
			{
				inputNodeName: inputNode?.name,
				inputRunIndex: inputNode?.runIndex,
				inputBranchIndex: inputNode?.branchIndex,
				additionalKeys,
			},
		);
	},
	// @TODO Replace with fetch nodes.json alternative
	setNodeTypes(value: string): void {
		nodeTypes = jsonParse<INodeTypes>(value);
	},
};

export type Actions = typeof actions;

handleActions(actions);
