import type { INodeUi } from '@/Interface';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

/** AI connection types used to detect AI-related nodes. */
const AI_CONNECTION_TYPES: NodeConnectionType[] = [
	NodeConnectionTypes.AiAgent,
	NodeConnectionTypes.AiChain,
	NodeConnectionTypes.AiDocument,
	NodeConnectionTypes.AiEmbedding,
	NodeConnectionTypes.AiLanguageModel,
	NodeConnectionTypes.AiMemory,
	NodeConnectionTypes.AiOutputParser,
	NodeConnectionTypes.AiRetriever,
	NodeConnectionTypes.AiReranker,
	NodeConnectionTypes.AiTextSplitter,
	NodeConnectionTypes.AiTool,
	NodeConnectionTypes.AiVectorStore,
];

/** Parameter name or displayName patterns that indicate prompt text. */
const PROMPT_NAME_PATTERN = /^(systemMessage|text|messages|prompt|instructions?)$/i;
const PROMPT_DISPLAY_PATTERN = /prompt|system\s*message|instruction/i;

function getNodeTypeDescription(node: INodeUi): INodeTypeDescription | null {
	const nodeTypesStore = useNodeTypesStore();
	return nodeTypesStore.getNodeType(node.type, node.typeVersion);
}

/**
 * Checks whether any input or output of the node type matches the given connection types.
 */
function hasConnectionType(
	nodeType: INodeTypeDescription,
	connectionTypes: NodeConnectionType[],
): boolean {
	const check = (ios: unknown): boolean => {
		if (!Array.isArray(ios)) return false;
		return ios.some((io: unknown) => {
			const ioType = typeof io === 'string' ? io : (io as { type?: string })?.type;
			return ioType !== undefined && connectionTypes.includes(ioType as NodeConnectionType);
		});
	};
	return check(nodeType.inputs) || check(nodeType.outputs);
}

/**
 * Determines if a node is an input trigger by checking its node type metadata.
 * Uses `group: ['trigger']` from INodeTypeDescription instead of a hardcoded list.
 */
export function isInputTrigger(node: INodeUi): boolean {
	const nodeType = getNodeTypeDescription(node);
	if (!nodeType) return false;
	return nodeType.group?.includes('trigger') ?? false;
}

/**
 * Determines if a node sends data to an external service.
 * A node is considered external if it has credential definitions
 * (meaning it authenticates to a third-party service) or is an HTTP Request node.
 */
export function isExternalService(node: INodeUi): boolean {
	if (node.type === 'n8n-nodes-base.httpRequest') return true;
	const nodeType = getNodeTypeDescription(node);
	if (!nodeType) return false;
	return (nodeType.credentials?.length ?? 0) > 0;
}

/**
 * Determines if a node executes user-supplied code.
 * Checks if the node type has properties with `typeOptions.editor === 'codeNodeEditor'`.
 * Falls back to known code node types if metadata is unavailable.
 */
export function isCodeNode(node: INodeUi): boolean {
	const nodeType = getNodeTypeDescription(node);
	if (!nodeType) {
		return node.type === 'n8n-nodes-base.code' || node.type === 'n8n-nodes-base.codeNode';
	}
	return nodeType.properties.some((prop) => prop.typeOptions?.editor === 'codeNodeEditor');
}

/**
 * Returns the names of all code editor parameters for a given node.
 * These are properties with `typeOptions.editor === 'codeNodeEditor'`.
 * Falls back to `['jsCode']` if metadata is unavailable.
 */
export function getCodeParameters(node: INodeUi): string[] {
	const nodeType = getNodeTypeDescription(node);
	if (!nodeType) return ['jsCode'];
	const params = nodeType.properties
		.filter((prop) => prop.typeOptions?.editor === 'codeNodeEditor')
		.map((prop) => prop.name);
	return params.length > 0 ? params : ['jsCode'];
}

/**
 * Returns the names of all assignment collection parameters for a given node.
 * These are properties with `type === 'assignmentCollection'`.
 */
export function getAssignmentFields(node: INodeUi): string[] {
	const nodeType = getNodeTypeDescription(node);
	if (!nodeType) return [];
	return nodeType.properties
		.filter((prop) => prop.type === 'assignmentCollection')
		.map((prop) => prop.name);
}

/**
 * Determines if a node is an AI node.
 * Checks `codex.categories` for 'AI' or checks if the node has AI connection types
 * in its inputs or outputs. Falls back to prefix check if metadata is unavailable.
 */
export function isAiNode(node: INodeUi): boolean {
	const nodeType = getNodeTypeDescription(node);
	if (!nodeType) {
		return node.type.startsWith('@n8n/n8n-nodes-langchain');
	}
	if (nodeType.codex?.categories?.includes('AI')) return true;
	return hasConnectionType(nodeType, AI_CONNECTION_TYPES);
}

/**
 * Determines if a node is an AI agent (accepts ai_tool inputs).
 * Falls back to checking the type string and codex subcategories.
 */
export function isAiAgent(node: INodeUi): boolean {
	const nodeType = getNodeTypeDescription(node);
	if (!nodeType) {
		return node.type === '@n8n/n8n-nodes-langchain.agent';
	}
	// Check if node accepts ai_tool input connections
	if (Array.isArray(nodeType.inputs)) {
		const acceptsTools = nodeType.inputs.some((input: unknown) => {
			const inputType = typeof input === 'string' ? input : (input as { type?: string })?.type;
			return inputType === NodeConnectionTypes.AiTool;
		});
		if (acceptsTools) return true;
	}
	// If inputs is an expression, check codex subcategories
	return nodeType.codex?.subcategories?.AI?.includes('Agents') ?? false;
}

/**
 * Determines if a tool node is "dangerous" — i.e., it grants the LLM
 * arbitrary code execution or HTTP access.
 *
 * Returns `{ isDangerous, reason }` describing the capability.
 */
export function isDangerousTool(node: INodeUi): { isDangerous: boolean; reason: string } {
	const nodeType = getNodeTypeDescription(node);

	if (!nodeType) {
		if (node.type.endsWith('.toolHttpRequest')) {
			return { isDangerous: true, reason: 'make arbitrary HTTP requests' };
		}
		if (node.type.endsWith('.toolCode')) {
			return { isDangerous: true, reason: 'execute arbitrary code' };
		}
		return { isDangerous: false, reason: '' };
	}

	// Code execution capability: has a code editor property
	const hasCodeEditor = nodeType.properties.some(
		(prop) => prop.typeOptions?.editor === 'codeNodeEditor',
	);
	if (hasCodeEditor) {
		return { isDangerous: true, reason: 'execute arbitrary code' };
	}

	// HTTP access capability: tool node whose name/displayName indicates HTTP
	const isToolOutput =
		Array.isArray(nodeType.outputs) &&
		nodeType.outputs.some((output: unknown) => {
			const outputType = typeof output === 'string' ? output : (output as { type?: string })?.type;
			return outputType === NodeConnectionTypes.AiTool;
		});
	if (isToolOutput) {
		const nameIndicatesHttp =
			nodeType.name.toLowerCase().includes('http') ||
			nodeType.displayName.toLowerCase().includes('http');
		if (nameIndicatesHttp) {
			return { isDangerous: true, reason: 'make arbitrary HTTP requests' };
		}
	}

	return { isDangerous: false, reason: '' };
}

/**
 * Returns the names of parameters that hold prompt text for an AI node.
 * Scans node type properties for names or displayNames matching prompt-related patterns.
 * Falls back to known prompt parameter names if metadata is unavailable.
 */
export function getPromptParameters(node: INodeUi): string[] {
	const FALLBACK = ['systemMessage', 'text', 'messages'];
	const nodeType = getNodeTypeDescription(node);
	if (!nodeType) return FALLBACK;

	const promptParams = nodeType.properties
		.filter(
			(prop) =>
				(prop.type === 'string' || prop.type === 'fixedCollection') &&
				(PROMPT_NAME_PATTERN.test(prop.name) || PROMPT_DISPLAY_PATTERN.test(prop.displayName)),
		)
		.map((prop) => prop.name);

	return promptParams.length > 0 ? promptParams : FALLBACK;
}

/**
 * Determines if a node exposes a public webhook endpoint.
 * Checks for `webhooks[]` in the node type description.
 * Falls back to checking the known webhook type if metadata is unavailable.
 */
export function isWebhookNode(node: INodeUi): boolean {
	const nodeType = getNodeTypeDescription(node);
	if (!nodeType) {
		return node.type === 'n8n-nodes-base.webhook';
	}
	return (nodeType.webhooks?.length ?? 0) > 0;
}
