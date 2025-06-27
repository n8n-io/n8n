import {
	HTTP_REQUEST_NODE_TYPE,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
} from '@/constants';

import type {
	IConnections,
	IDataObject,
	IExecuteData,
	INode,
	INodeConnection,
	INodeCredentials,
	INodeExecutionData,
	INodeParameters,
	INodeProperties,
	INodeTypes,
	IRunExecutionData,
	IWebhookDescription,
	IWorkflowDataProxyAdditionalKeys,
	NodeParameterValue,
	Workflow,
} from 'n8n-workflow';
import {
	FORM_TRIGGER_NODE_TYPE,
	NodeConnectionTypes,
	NodeHelpers,
	WEBHOOK_NODE_TYPE,
} from 'n8n-workflow';

import type {
	ICredentialsResponse,
	INodeTypesMaxCount,
	INodeUi,
	IWorkflowDb,
	TargetItem,
	WorkflowTitleStatus,
	XYPosition,
} from '@/Interface';
import type { ITag } from '@n8n/rest-api-client/api/tags';
import type { WorkflowData, WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';

import { useNodeHelpers } from '@/composables/useNodeHelpers';

import get from 'lodash/get';

import { useEnvironmentsStore } from '@/stores/environments.ee.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { getSourceItems } from '@/utils/pairedItemUtils';
import { getCredentialTypeName, isCredentialOnlyNodeType } from '@/utils/credentialOnlyNodes';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useI18n } from '@n8n/i18n';
import { useProjectsStore } from '@/stores/projects.store';
import { useTagsStore } from '@/stores/tags.store';
import { useWorkflowsEEStore } from '@/stores/workflows.ee.store';
import { findWebhook } from '@n8n/rest-api-client/api/webhooks';

export type ResolveParameterOptions = {
	targetItem?: TargetItem;
	inputNodeName?: string;
	inputRunIndex?: number;
	inputBranchIndex?: number;
	additionalKeys?: IWorkflowDataProxyAdditionalKeys;
	isForCredential?: boolean;
	contextNodeName?: string;
};

export function resolveParameter<T = IDataObject>(
	parameter: NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[],
	opts: ResolveParameterOptions = {},
): T | null {
	let itemIndex = opts?.targetItem?.itemIndex || 0;

	const workflow = getCurrentWorkflow();

	const additionalKeys: IWorkflowDataProxyAdditionalKeys = {
		$execution: {
			id: PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
			mode: 'test',
			resumeUrl: PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
			resumeFormUrl: PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
		},
		$vars: useEnvironmentsStore().variablesAsObject,

		// deprecated
		$executionId: PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
		$resumeWebhookUrl: PLACEHOLDER_FILLED_AT_EXECUTION_TIME,

		...opts.additionalKeys,
	};

	if (opts.isForCredential) {
		// node-less expression resolution
		return workflow.expression.getParameterValue(
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

	const activeNode =
		useNDVStore().activeNode ?? useWorkflowsStore().getNodeByName(opts.contextNodeName || '');
	let contextNode = activeNode;

	if (activeNode) {
		contextNode = workflow.getParentMainInputNode(activeNode);
	}

	const workflowRunData = useWorkflowsStore().getWorkflowRunData;
	let parentNode = workflow.getParentNodes(contextNode!.name, inputName, 1);
	const executionData = useWorkflowsStore().getWorkflowExecution;

	let runIndexParent = opts?.inputRunIndex ?? 0;
	const nodeConnection = workflow.getNodeConnectionIndexes(contextNode!.name, parentNode[0]);
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
		parentNode,
		contextNode!.name,
		inputName,
		runIndexParent,
		nodeConnection,
	);

	if (_connectionInputData === null && contextNode && activeNode?.name !== contextNode.name) {
		// For Sub-Nodes connected to Trigger-Nodes use the data of the root-node
		// (Gets for example used by the Memory connected to the Chat-Trigger-Node)
		const _executeData = executeData([contextNode.name], contextNode.name, inputName, 0);
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
	let _executeData = executeData(
		parentNode,
		contextNode!.name,
		inputName,
		runIndexCurrent,
		runIndexParent,
	);

	if (!_executeData.source) {
		// fallback to parent's run index for multi-output case
		_executeData = executeData(parentNode, contextNode!.name, inputName, runIndexParent);
	}

	return workflow.expression.getParameterValue(
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

export function resolveRequiredParameters(
	currentParameter: INodeProperties,
	parameters: INodeParameters,
	opts: {
		targetItem?: TargetItem;
		inputNodeName?: string;
		inputRunIndex?: number;
		inputBranchIndex?: number;
	} = {},
): IDataObject | null {
	const loadOptionsDependsOn = new Set(currentParameter?.typeOptions?.loadOptionsDependsOn ?? []);

	const resolvedParameters = Object.fromEntries(
		Object.entries(parameters).map(([name, parameter]): [string, IDataObject | null] => {
			const required = loadOptionsDependsOn.has(name);

			if (required) {
				return [name, resolveParameter(parameter as NodeParameterValue, opts)];
			} else {
				try {
					return [name, resolveParameter(parameter as NodeParameterValue, opts)];
				} catch (error) {
					// ignore any expressions errors for non required parameters
					return [name, null];
				}
			}
		}),
	);

	return resolvedParameters;
}

function getCurrentWorkflow(copyData?: boolean): Workflow {
	return useWorkflowsStore().getCurrentWorkflow(copyData);
}

function getConnectedNodes(
	direction: 'upstream' | 'downstream',
	workflow: Workflow,
	nodeName: string,
): string[] {
	let checkNodes: string[];
	if (direction === 'downstream') {
		checkNodes = workflow.getChildNodes(nodeName);
	} else if (direction === 'upstream') {
		checkNodes = workflow.getParentNodes(nodeName);
	} else {
		throw new Error(`The direction "${direction}" is not supported!`);
	}

	// Find also all nodes which are connected to the child nodes via a non-main input
	let connectedNodes: string[] = [];
	checkNodes.forEach((checkNode) => {
		connectedNodes = [
			...connectedNodes,
			checkNode,
			...workflow.getParentNodes(checkNode, 'ALL_NON_MAIN'),
		];
	});

	// Remove duplicates
	return [...new Set(connectedNodes)];
}

// Returns a workflow instance.
function getWorkflow(nodes: INodeUi[], connections: IConnections, copyData?: boolean): Workflow {
	return useWorkflowsStore().getWorkflow(nodes, connections, copyData);
}

function getNodeTypes(): INodeTypes {
	return useWorkflowsStore().getNodeTypes();
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

export function executeData(
	parentNodes: string[],
	currentNode: string,
	inputName: string,
	runIndex: number,
	parentRunIndex?: number,
): IExecuteData {
	const executeData = {
		node: {},
		data: {},
		source: null,
	} as IExecuteData;

	parentRunIndex = parentRunIndex ?? runIndex;

	const workflowsStore = useWorkflowsStore();

	// Find the parent node which has data
	for (const parentNodeName of parentNodes) {
		if (workflowsStore.shouldReplaceInputDataWithPinData) {
			const parentPinData = workflowsStore.pinnedWorkflowData![parentNodeName];

			// populate `executeData` from `pinData`

			if (parentPinData) {
				executeData.data = { main: [parentPinData] };
				executeData.source = { main: [{ previousNode: parentNodeName }] };

				return executeData;
			}
		}

		// populate `executeData` from `runData`
		const workflowRunData = workflowsStore.getWorkflowRunData;
		if (workflowRunData === null) {
			return executeData;
		}

		if (
			!workflowRunData[parentNodeName] ||
			workflowRunData[parentNodeName].length <= parentRunIndex ||
			!workflowRunData[parentNodeName][parentRunIndex] ||
			!workflowRunData[parentNodeName][parentRunIndex].hasOwnProperty('data') ||
			workflowRunData[parentNodeName][parentRunIndex].data === undefined ||
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
				const workflow = getCurrentWorkflow();

				let previousNodeOutput: number | undefined;
				// As the node can be connected through either of the outputs find the correct one
				// and set it to make pairedItem work on not executed nodes
				if (workflow.connectionsByDestinationNode[currentNode]?.main) {
					mainConnections: for (const mainConnections of workflow.connectionsByDestinationNode[
						currentNode
					].main) {
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

export function useWorkflowHelpers() {
	const nodeTypesStore = useNodeTypesStore();
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();
	const workflowsEEStore = useWorkflowsEEStore();
	const uiStore = useUIStore();
	const nodeHelpers = useNodeHelpers();
	const projectsStore = useProjectsStore();
	const tagsStore = useTagsStore();

	const i18n = useI18n();
	const documentTitle = useDocumentTitle();

	const setDocumentTitle = (workflowName: string, status: WorkflowTitleStatus) => {
		let icon = '⚠️';
		if (status === 'EXECUTING') {
			icon = '🔄';
		} else if (status === 'IDLE') {
			icon = '▶️';
		}
		documentTitle.set(`${icon} ${workflowName}`);
	};

	function getNodeTypesMaxCount() {
		const nodes = workflowsStore.allNodes;

		const returnData: INodeTypesMaxCount = {};

		const nodeTypes = nodeTypesStore.allNodeTypes;
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
	}

	function getNodeTypeCount(nodeType: string) {
		const nodes = workflowsStore.allNodes;

		let count = 0;

		for (const node of nodes) {
			if (node.type === nodeType) {
				count++;
			}
		}

		return count;
	}

	async function getWorkflowDataToSave() {
		const workflowNodes = workflowsStore.allNodes;
		const workflowConnections = workflowsStore.allConnections;

		let nodeData;

		const nodes: INode[] = [];
		for (let nodeIndex = 0; nodeIndex < workflowNodes.length; nodeIndex++) {
			nodeData = getNodeDataToSave(workflowNodes[nodeIndex]);

			nodes.push(nodeData);
		}

		const data: WorkflowData = {
			name: workflowsStore.workflowName,
			nodes,
			pinData: workflowsStore.pinnedWorkflowData,
			connections: workflowConnections,
			active: workflowsStore.isWorkflowActive,
			settings: workflowsStore.workflow.settings,
			tags: workflowsStore.workflowTags,
			versionId: workflowsStore.workflow.versionId,
			meta: workflowsStore.workflow.meta,
		};

		const workflowId = workflowsStore.workflowId;
		if (workflowId !== PLACEHOLDER_EMPTY_WORKFLOW_ID) {
			data.id = workflowId;
		}

		return data;
	}

	function getNodeDataToSave(node: INodeUi): INodeUi {
		const skipKeys = [
			'color',
			'continueOnFail',
			'credentials',
			'disabled',
			'issues',
			'onError',
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
		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);

		if (nodeType !== null) {
			const isCredentialOnly = isCredentialOnlyNodeType(nodeType.name);

			if (isCredentialOnly) {
				nodeData.type = HTTP_REQUEST_NODE_TYPE;
				nodeData.extendsCredential = getCredentialTypeName(nodeType.name);
			}

			// Node-Type is known so we can save the parameters correctly
			const nodeParameters = NodeHelpers.getNodeParameters(
				nodeType.properties,
				node.parameters,
				isCredentialOnly,
				false,
				node,
				nodeType,
			);
			nodeData.parameters = nodeParameters !== null ? nodeParameters : {};

			// Add the node credentials if there are some set and if they should be displayed
			if (node.credentials !== undefined && nodeType.credentials !== undefined) {
				const saveCredentials: INodeCredentials = {};
				for (const nodeCredentialTypeName of Object.keys(node.credentials)) {
					if (
						nodeHelpers.hasProxyAuth(node) ||
						Object.keys(node.parameters).includes('genericAuthType')
					) {
						saveCredentials[nodeCredentialTypeName] = node.credentials[nodeCredentialTypeName];
						continue;
					}

					const credentialTypeDescription = nodeType.credentials
						// filter out credentials with same name in different node versions
						.filter((c) => nodeHelpers.displayParameter(node.parameters, c, '', node))
						.find((c) => c.name === nodeCredentialTypeName);

					if (credentialTypeDescription === undefined) {
						// Credential type is not know so do not save
						continue;
					}

					if (!nodeHelpers.displayParameter(node.parameters, credentialTypeDescription, '', node)) {
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

		// Save the disabled property, continueOnFail and onError only when is set
		if (node.disabled === true) {
			nodeData.disabled = true;
		}
		if (node.continueOnFail === true) {
			nodeData.continueOnFail = true;
		}
		if (node.onError !== 'stopWorkflow') {
			nodeData.onError = node.onError;
		}
		// Save the notes only if when they contain data
		if (![undefined, ''].includes(node.notes)) {
			nodeData.notes = node.notes;
		}

		return nodeData;
	}

	function getWebhookExpressionValue(
		webhookData: IWebhookDescription,
		key: string,
		stringify = true,
		nodeName?: string,
	): string {
		if (webhookData[key] === undefined) {
			return 'empty';
		}
		try {
			return resolveExpression(
				webhookData[key] as string,
				undefined,
				{ contextNodeName: nodeName },
				stringify,
			) as string;
		} catch (e) {
			return i18n.baseText('nodeWebhooks.invalidExpression');
		}
	}

	function getWebhookUrl(
		webhookData: IWebhookDescription,
		node: INode,
		showUrlFor: 'test' | 'production',
	): string {
		const { nodeType, restartWebhook } = webhookData;
		if (restartWebhook === true) {
			return nodeType === 'form' ? '$execution.resumeFormUrl' : '$execution.resumeUrl';
		}

		const baseUrls = {
			test: {
				form: rootStore.formTestUrl,
				mcp: rootStore.mcpTestUrl,
				webhook: rootStore.webhookTestUrl,
			},
			production: {
				form: rootStore.formUrl,
				mcp: rootStore.mcpUrl,
				webhook: rootStore.webhookUrl,
			},
		} as const;
		const baseUrl = baseUrls[showUrlFor][nodeType ?? 'webhook'];
		const workflowId = workflowsStore.workflowId;
		const path = getWebhookExpressionValue(webhookData, 'path', true, node.name) ?? '';
		const isFullPath =
			(getWebhookExpressionValue(
				webhookData,
				'isFullPath',
				true,
				node.name,
			) as unknown as boolean) || false;

		return NodeHelpers.getNodeWebhookUrl(baseUrl, workflowId, node, path, isFullPath);
	}

	/**
	 * Returns a copy of provided node parameters with added resolvedExpressionValue
	 * @param nodeParameters
	 * @returns
	 */
	function getNodeParametersWithResolvedExpressions(
		nodeParameters: INodeParameters,
	): INodeParameters {
		function recurse(currentObj: INodeParameters, currentPath: string): INodeParameters {
			const newObj: INodeParameters = {};
			for (const key in currentObj) {
				const value = currentObj[key as keyof typeof currentObj];
				const path = currentPath ? `${currentPath}.${key}` : key;
				if (typeof value === 'object' && value !== null) {
					newObj[key] = recurse(value as INodeParameters, path);
				} else if (typeof value === 'string' && String(value).startsWith('=')) {
					// Resolve the expression if it is one
					let resolved;
					try {
						resolved = resolveExpression(value, undefined, { isForCredential: false });
					} catch (error) {
						resolved = `Error in expression: "${error.message}"`;
					}
					newObj[key] = {
						value,
						resolvedExpressionValue: String(resolved),
					};
				} else {
					newObj[key] = value;
				}
			}
			return newObj;
		}
		return recurse(nodeParameters, '');
	}

	function resolveExpression(
		expression: string,
		siblingParameters: INodeParameters = {},
		opts: ResolveParameterOptions & { c?: number } = {},
		stringifyObject = true,
	) {
		const parameters = {
			__xxxxxxx__: expression,
			...siblingParameters,
		};
		const returnData: IDataObject | null = resolveParameter(parameters, opts);
		if (!returnData) {
			return null;
		}

		const obj = returnData.__xxxxxxx__;
		if (typeof obj === 'object' && stringifyObject) {
			const proxy = obj as { isProxy: boolean; toJSON?: () => unknown } | null;
			if (proxy?.isProxy && proxy.toJSON) return JSON.stringify(proxy.toJSON());
			const workflow = getCurrentWorkflow();
			return workflow.expression.convertObjectValueToString(obj as object);
		}
		return obj;
	}

	async function updateWorkflow(
		{ workflowId, active }: { workflowId: string; active?: boolean },
		partialData = false,
	) {
		let data: WorkflowDataUpdate = {};

		const isCurrentWorkflow = workflowId === workflowsStore.workflowId;
		if (isCurrentWorkflow) {
			data = partialData
				? { versionId: workflowsStore.workflowVersionId }
				: await getWorkflowDataToSave();
		} else {
			const { versionId } = await workflowsStore.fetchWorkflow(workflowId);
			data.versionId = versionId;
		}

		if (active !== undefined) {
			data.active = active;
		}

		const workflow = await workflowsStore.updateWorkflow(workflowId, data);
		workflowsStore.setWorkflowVersionId(workflow.versionId);

		if (isCurrentWorkflow) {
			workflowsStore.setActive(!!workflow.active);
			uiStore.stateIsDirty = false;
		}

		if (workflow.active) {
			workflowsStore.setWorkflowActive(workflowId);
		} else {
			workflowsStore.setWorkflowInactive(workflowId);
		}
	}

	// Updates the position of all the nodes that the top-left node
	// is at the given position
	function updateNodePositions(
		workflowData: WorkflowData | WorkflowDataUpdate,
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
	}

	function removeForeignCredentialsFromWorkflow(
		workflow: WorkflowData | WorkflowDataUpdate,
		usableCredentials: ICredentialsResponse[],
	): void {
		(workflow.nodes ?? []).forEach((node: INode) => {
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
	}

	function getWorkflowProjectRole(workflowId: string): 'owner' | 'sharee' | 'member' {
		const workflow = workflowsStore.workflowsById[workflowId];

		if (
			workflow?.homeProject?.id === projectsStore.personalProject?.id ||
			workflowId === PLACEHOLDER_EMPTY_WORKFLOW_ID
		) {
			return 'owner';
		} else if (
			workflow?.sharedWithProjects?.some(
				(project) => project.id === projectsStore.personalProject?.id,
			)
		) {
			return 'sharee';
		} else {
			return 'member';
		}
	}

	function initState(workflowData: IWorkflowDb) {
		workflowsStore.addWorkflow(workflowData);
		workflowsStore.setActive(workflowData.active || false);
		workflowsStore.setIsArchived(workflowData.isArchived);
		workflowsStore.setWorkflowId(workflowData.id);
		workflowsStore.setWorkflowName({
			newName: workflowData.name,
			setStateDirty: uiStore.stateIsDirty,
		});
		workflowsStore.setWorkflowSettings(workflowData.settings ?? {});
		workflowsStore.setWorkflowPinData(workflowData.pinData ?? {});
		workflowsStore.setWorkflowVersionId(workflowData.versionId);
		workflowsStore.setWorkflowMetadata(workflowData.meta);
		workflowsStore.setWorkflowScopes(workflowData.scopes);

		if (workflowData.usedCredentials) {
			workflowsStore.setUsedCredentials(workflowData.usedCredentials);
		}

		if (workflowData.sharedWithProjects) {
			workflowsEEStore.setWorkflowSharedWith({
				workflowId: workflowData.id,
				sharedWithProjects: workflowData.sharedWithProjects,
			});
		}

		const tags = (workflowData.tags ?? []) as ITag[];
		const tagIds = tags.map((tag) => tag.id);
		workflowsStore.setWorkflowTagIds(tagIds || []);
		tagsStore.upsertTags(tags);
	}

	/**
	 * Check if workflow contains any node from specified package
	 * by performing a quick check based on the node type name.
	 */
	const containsNodeFromPackage = (workflow: IWorkflowDb, packageName: string) => {
		return workflow.nodes.some((node) => node.type.startsWith(packageName));
	};

	function getMethod(trigger: INode) {
		if (trigger.type === WEBHOOK_NODE_TYPE) {
			return (trigger.parameters.method as string) ?? 'GET';
		}
		return 'GET';
	}

	function getWebhookPath(trigger: INode) {
		if (trigger.type === WEBHOOK_NODE_TYPE) {
			return trigger.parameters.path as string;
		}
		if (trigger.type === FORM_TRIGGER_NODE_TYPE) {
			return (
				(((trigger.parameters.options as { path: string }) || {}).path as string) ??
				trigger.webhookId
			);
		}
		return '';
	}

	async function checkConflictingWebhooks(workflowId: string) {
		let data;
		if (uiStore.stateIsDirty) {
			data = await getWorkflowDataToSave();
		} else {
			data = await workflowsStore.fetchWorkflow(workflowId);
		}

		const triggers = data.nodes.filter(
			(node) =>
				node.disabled !== true && [WEBHOOK_NODE_TYPE, FORM_TRIGGER_NODE_TYPE].includes(node.type),
		);

		for (const trigger of triggers) {
			const method = getMethod(trigger);

			const path = getWebhookPath(trigger);

			const conflict = await findWebhook(rootStore.restApiContext, {
				path,
				method,
			});

			if (conflict && conflict.workflowId !== workflowId) {
				return { trigger, conflict };
			}
		}

		return null;
	}

	return {
		setDocumentTitle,
		resolveParameter,
		resolveRequiredParameters,
		getCurrentWorkflow,
		getConnectedNodes,
		getWorkflow,
		getNodeTypes,
		connectionInputData,
		executeData,
		getNodeTypesMaxCount,
		getNodeTypeCount,
		getWorkflowDataToSave,
		getNodeDataToSave,
		getWebhookExpressionValue,
		getWebhookUrl,
		resolveExpression,
		updateWorkflow,
		updateNodePositions,
		removeForeignCredentialsFromWorkflow,
		getWorkflowProjectRole,
		initState,
		getNodeParametersWithResolvedExpressions,
		containsNodeFromPackage,
		checkConflictingWebhooks,
	};
}
