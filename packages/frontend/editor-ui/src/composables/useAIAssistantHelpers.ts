import { deepCopy } from 'n8n-workflow';
import type {
	IDataObject,
	IRunExecutionData,
	NodeApiError,
	NodeError,
	NodeOperationError,
	INode,
} from 'n8n-workflow';
import { useWorkflowHelpers } from './useWorkflowHelpers';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { executionDataToJson, getMainAuthField, getNodeAuthOptions } from '@/utils/nodeTypesUtils';
import type { ChatRequest } from '@/types/assistant.types';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useDataSchema } from './useDataSchema';
import { AI_ASSISTANT_MAX_CONTENT_LENGTH, VIEWS } from '@/constants';
import { useI18n } from '@n8n/i18n';
import type { IWorkflowDb } from '@/Interface';
import { getObjectSizeInKB } from '@/utils/objectUtils';

const CANVAS_VIEWS = [VIEWS.NEW_WORKFLOW, VIEWS.WORKFLOW, VIEWS.EXECUTION_DEBUG];
const EXECUTION_VIEWS = [VIEWS.EXECUTION_PREVIEW];
const WORKFLOW_LIST_VIEWS = [VIEWS.WORKFLOWS, VIEWS.PROJECTS_WORKFLOWS];
const CREDENTIALS_LIST_VIEWS = [VIEWS.CREDENTIALS, VIEWS.PROJECTS_CREDENTIALS];

export const useAIAssistantHelpers = () => {
	const ndvStore = useNDVStore();
	const nodeTypesStore = useNodeTypesStore();
	const workflowsStore = useWorkflowsStore();

	const workflowHelpers = useWorkflowHelpers();
	const locale = useI18n();

	/**
		Regular expression to extract the node names from the expressions in the template.
		Supports single quotes, double quotes, and backticks.
	*/
	const entityRegex = /\$\(\s*(\\?["'`])((?:\\.|(?!\1)[^\\])*)\1\s*\)/g;

	/**
	 * Extract the node names from the expressions in the template.
	 */
	function extractNodeNames(template: string): string[] {
		let matches;
		const nodeNames: string[] = [];
		while ((matches = entityRegex.exec(template)) !== null) {
			nodeNames.push(matches[2]);
		}
		return nodeNames;
	}

	/**
	 * Unescape quotes in the string. Supports single quotes, double quotes, and backticks.
	 */
	function unescapeQuotes(str: string): string {
		return str.replace(/\\(['"`])/g, '$1');
	}

	/**
	 * Extract the node names from the expressions in the node parameters.
	 */
	function getReferencedNodes(node: INode): string[] {
		const referencedNodes: Set<string> = new Set();
		if (!node) {
			return [];
		}
		// Go through all parameters and check if they contain expressions on any level
		for (const key in node.parameters) {
			let names: string[] = [];
			if (
				node.parameters[key] &&
				typeof node.parameters[key] === 'object' &&
				Object.keys(node.parameters[key]).length
			) {
				names = extractNodeNames(JSON.stringify(node.parameters[key]));
			} else if (typeof node.parameters[key] === 'string' && node.parameters[key]) {
				names = extractNodeNames(node.parameters[key]);
			}
			if (names.length) {
				names
					.map((name) => unescapeQuotes(name))
					.forEach((name) => {
						referencedNodes.add(name);
					});
			}
		}
		return referencedNodes.size ? Array.from(referencedNodes) : [];
	}

	/**
	 * Processes node object before sending it to AI assistant
	 * - Removes unnecessary properties
	 * - Extracts expressions from the parameters and resolves them
	 * @param node original node object
	 * @param propsToRemove properties to remove from the node object
	 * @returns processed node
	 */
	function processNodeForAssistant(node: INode, propsToRemove: string[]): INode {
		// Make a copy of the node object so we don't modify the original
		const nodeForLLM = deepCopy(node);
		propsToRemove.forEach((key) => {
			delete nodeForLLM[key as keyof INode];
		});
		const resolvedParameters = workflowHelpers.getNodeParametersWithResolvedExpressions(
			nodeForLLM.parameters,
		);
		nodeForLLM.parameters = resolvedParameters;
		return nodeForLLM;
	}

	function getNodeInfoForAssistant(node: INode): ChatRequest.NodeInfo {
		if (!node) {
			return {};
		}
		// Get all referenced nodes and their schemas
		const referencedNodeNames = getReferencedNodes(node);
		const schemas = getNodesSchemas(referencedNodeNames);

		const nodeType = nodeTypesStore.getNodeType(node.type);

		// Get node credentials details for the ai assistant
		let authType = undefined;
		if (nodeType) {
			const authField = getMainAuthField(nodeType);
			const credentialInUse = node.parameters[authField?.name ?? ''];
			const availableAuthOptions = getNodeAuthOptions(nodeType);
			authType = availableAuthOptions.find((option) => option.value === credentialInUse);
		}
		let nodeInputData: { inputNodeName?: string; inputData?: IDataObject } | undefined = undefined;
		const ndvInput = ndvStore.ndvInputData;
		if (isNodeReferencingInputData(node) && ndvInput?.length) {
			const inputData = ndvStore.ndvInputData[0].json;
			const inputNodeName = ndvStore.input.nodeName;
			nodeInputData = {
				inputNodeName,
				inputData,
			};
		}
		return {
			authType,
			schemas,
			nodeInputData,
		};
	}

	/**
	 * Simplify node error object for AI assistant
	 */
	function simplifyErrorForAssistant(
		error: NodeError | NodeApiError | NodeOperationError,
	): ChatRequest.ErrorContext['error'] {
		const simple: ChatRequest.ErrorContext['error'] = {
			name: error.name,
			message: error.message,
		};
		if ('type' in error) {
			simple.type = error.type;
		}
		if ('description' in error && error.description) {
			simple.description = error.description;
		}
		if (error.stack) {
			simple.stack = error.stack;
		}
		if ('lineNumber' in error) {
			simple.lineNumber = error.lineNumber;
		}
		return simple;
	}

	function isNodeReferencingInputData(node: INode): boolean {
		const parametersString = JSON.stringify(node.parameters);
		const references = ['$json', '$input', '$binary'];
		return references.some((ref) => parametersString.includes(ref));
	}

	/**
	 * Get the schema for the referenced nodes as expected by the AI assistant
	 * @param nodeNames The names of the nodes to get the schema for
	 * @returns An array of NodeExecutionSchema objects
	 */
	function getNodesSchemas(nodeNames: string[], excludeValues?: boolean) {
		const schemas: ChatRequest.NodeExecutionSchema[] = [];
		for (const name of nodeNames) {
			const node = workflowsStore.getNodeByName(name);
			if (!node) {
				continue;
			}
			const { getSchemaForExecutionData, getInputDataWithPinned } = useDataSchema();
			const schema = getSchemaForExecutionData(
				executionDataToJson(getInputDataWithPinned(node)),
				excludeValues,
			);
			schemas.push({
				nodeName: node.name,
				schema,
			});
		}
		return schemas;
	}

	function getCurrentViewDescription(view: VIEWS) {
		switch (true) {
			case WORKFLOW_LIST_VIEWS.includes(view):
				return locale.baseText('aiAssistant.prompts.currentView.workflowList');
			case CREDENTIALS_LIST_VIEWS.includes(view):
				return locale.baseText('aiAssistant.prompts.currentView.credentialsList');
			case EXECUTION_VIEWS.includes(view):
				return locale.baseText('aiAssistant.prompts.currentView.executionsView');
			case CANVAS_VIEWS.includes(view):
				return locale.baseText('aiAssistant.prompts.currentView.workflowEditor');
			default:
				return undefined;
		}
	}
	/**
	 * Prepare workflow execution result data for the AI assistant
	 * by removing data from nodes
	 **/
	function simplifyResultData(
		data: IRunExecutionData['resultData'],
	): ChatRequest.ExecutionResultData {
		const simplifiedResultData: ChatRequest.ExecutionResultData = {
			runData: {},
		};

		// Handle optional error
		if (data.error) {
			simplifiedResultData.error = data.error;
		}
		// Map runData, excluding the `data` field from ITaskData
		for (const key of Object.keys(data.runData)) {
			const taskDataArray = data.runData[key];
			simplifiedResultData.runData[key] = taskDataArray.map((taskData) => {
				const { data: taskDataContent, ...taskDataWithoutData } = taskData;
				return taskDataWithoutData;
			});
		}
		// Handle lastNodeExecuted if it exists
		if (data.lastNodeExecuted) {
			simplifiedResultData.lastNodeExecuted = data.lastNodeExecuted;
		}
		// Handle metadata if it exists
		if (data.metadata) {
			simplifiedResultData.metadata = data.metadata;
		}
		return simplifiedResultData;
	}

	const simplifyWorkflowForAssistant = (workflow: IWorkflowDb): Partial<IWorkflowDb> => ({
		name: workflow.name,
		active: workflow.active,
		connections: workflow.connections,
		nodes: workflow.nodes,
	});

	/**
	 * Reduces AI Assistant request payload size to make it fit the specified content length.
	 * If, after two passes, the payload is still too big, throws an error'
	 * @param payload The request payload to trim
	 * @param size The maximum size of the payload in KB
	 */
	const trimPayloadToSize = (
		payload: ChatRequest.RequestPayload,
		size = AI_ASSISTANT_MAX_CONTENT_LENGTH,
	): void => {
		// Create a deep copy to avoid mutating the original payload
		const payloadCopy = deepCopy(payload);
		const requestPayload = payloadCopy.payload;

		// For support chat, remove parameters from the active node object and all nodes in the workflow
		if (requestPayload.type === 'init-support-chat') {
			if (requestPayload.context?.activeNodeInfo?.node) {
				requestPayload.context.activeNodeInfo.node.parameters = {};
			}
			if (requestPayload.context?.currentWorkflow) {
				requestPayload.context.currentWorkflow?.nodes?.forEach((node) => {
					node.parameters = {};
				});
			}
			if (requestPayload.context?.executionData?.runData) {
				requestPayload.context.executionData.runData = {};
			}
			if (
				requestPayload.context?.executionData?.error &&
				'node' in requestPayload.context?.executionData?.error
			) {
				if (requestPayload.context?.executionData?.error?.node) {
					requestPayload.context.executionData.error.node.parameters = {};
				}
			}
			// If the payload is still too big, remove the whole context object
			if (getRequestPayloadSize(payloadCopy) > size) {
				requestPayload.context = undefined;
			}
			// For error helper, remove parameters from the active node object
			// This will leave just the error, user info and basic node structure in the payload
		} else if (requestPayload.type === 'init-error-helper') {
			requestPayload.node.parameters = {};
		}
		// If the payload is still too big, throw an error that will be shown to the user
		if (getRequestPayloadSize(payloadCopy) > size) {
			throw new Error(locale.baseText('aiAssistant.payloadTooBig.message'));
		}

		// Apply the trimmed payload back to the original object
		payload.payload = payloadCopy.payload;
	};

	/**
	 * Get the size of the request payload in KB, returns 0 if the payload is not a valid object
	 */
	const getRequestPayloadSize = (payload: ChatRequest.RequestPayload): number => {
		try {
			return getObjectSizeInKB(payload.payload);
		} catch (error) {
			return 0;
		}
	};

	return {
		processNodeForAssistant,
		getNodeInfoForAssistant,
		simplifyErrorForAssistant,
		isNodeReferencingInputData,
		getNodesSchemas,
		getCurrentViewDescription,
		getReferencedNodes,
		simplifyResultData,
		simplifyWorkflowForAssistant,
		trimPayloadSize: trimPayloadToSize,
	};
};
