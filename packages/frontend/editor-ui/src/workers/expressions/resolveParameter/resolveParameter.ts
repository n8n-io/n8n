import type { IExecutionResponse, INodeUi } from '@/Interface';
import { HTTP_REQUEST_NODE_TYPE, PLACEHOLDER_FILLED_AT_EXECUTION_TIME } from '@/constants';
import { getSourceItems } from '@/utils/pairedItemUtils';
import get from 'lodash/get';
import type { ResolveParameterOptions } from '@/workers/expressions/worker';
import { NodeConnectionTypes } from 'n8n-workflow';
import type {
	IRunExecutionData,
	IConnections,
	IDataObject,
	IPinData,
	INodeParameters,
	NodeParameterValue,
	Workflow,
	IWorkflowDataProxyAdditionalKeys,
} from 'n8n-workflow';
import { executeDataImpl } from '@/workers/expressions/resolveParameter/executeData';
import { connectionInputData } from '@/workers/expressions/resolveParameter/connectionInputData';

export function resolveParameterImpl<T = IDataObject>(
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
