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

function resolveNodeType(
	node: INodeUi,
	nodeType?: INodeTypeDescription | null,
): INodeTypeDescription | null {
	return nodeType !== undefined ? nodeType : getNodeTypeDescription(node);
}

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

export function isInputTrigger(node: INodeUi, nodeType?: INodeTypeDescription | null): boolean {
	const nt = resolveNodeType(node, nodeType);
	if (!nt) return false;
	return nt.group?.includes('trigger') ?? false;
}

export function isExternalService(node: INodeUi, nodeType?: INodeTypeDescription | null): boolean {
	if (node.type === 'n8n-nodes-base.httpRequest') return true;
	const nt = resolveNodeType(node, nodeType);
	if (!nt) return false;
	return (nt.credentials?.length ?? 0) > 0;
}

export function isCodeNode(node: INodeUi, nodeType?: INodeTypeDescription | null): boolean {
	const nt = resolveNodeType(node, nodeType);
	if (!nt) {
		return node.type === 'n8n-nodes-base.code' || node.type === 'n8n-nodes-base.codeNode';
	}
	return nt.properties.some((prop) => prop.typeOptions?.editor === 'codeNodeEditor');
}

export function getCodeParameters(node: INodeUi, nodeType?: INodeTypeDescription | null): string[] {
	const nt = resolveNodeType(node, nodeType);
	if (!nt) return ['jsCode'];
	const params = nt.properties
		.filter((prop) => prop.typeOptions?.editor === 'codeNodeEditor')
		.map((prop) => prop.name);
	return params.length > 0 ? params : ['jsCode'];
}

export function getAssignmentFields(
	node: INodeUi,
	nodeType?: INodeTypeDescription | null,
): string[] {
	const nt = resolveNodeType(node, nodeType);
	if (!nt) return [];
	return nt.properties
		.filter((prop) => prop.type === 'assignmentCollection')
		.map((prop) => prop.name);
}

/**
 * Checks `codex.categories` for 'AI' or checks if the node has AI connection types.
 * Falls back to prefix check if metadata is unavailable.
 */
export function isAiNode(node: INodeUi, nodeType?: INodeTypeDescription | null): boolean {
	const nt = resolveNodeType(node, nodeType);
	if (!nt) {
		return node.type.startsWith('@n8n/n8n-nodes-langchain');
	}
	if (nt.codex?.categories?.includes('AI')) return true;
	return hasConnectionType(nt, AI_CONNECTION_TYPES);
}

/**
 * Determines if a node is an AI agent (accepts ai_tool inputs).
 * Falls back to checking the type string and codex subcategories.
 */
export function isAiAgent(node: INodeUi, nodeType?: INodeTypeDescription | null): boolean {
	const nt = resolveNodeType(node, nodeType);
	if (!nt) {
		return node.type === '@n8n/n8n-nodes-langchain.agent';
	}
	if (Array.isArray(nt.inputs)) {
		const acceptsTools = nt.inputs.some((input: unknown) => {
			const inputType = typeof input === 'string' ? input : (input as { type?: string })?.type;
			return inputType === NodeConnectionTypes.AiTool;
		});
		if (acceptsTools) return true;
	}
	return nt.codex?.subcategories?.AI?.includes('Agents') ?? false;
}

/**
 * Determines if a tool node is "dangerous" — i.e., it grants the LLM
 * arbitrary code execution or HTTP access.
 */
export function isDangerousTool(
	node: INodeUi,
	nodeType?: INodeTypeDescription | null,
): { isDangerous: boolean; reason: string } {
	const nt = resolveNodeType(node, nodeType);

	if (!nt) {
		if (node.type.endsWith('.toolHttpRequest')) {
			return { isDangerous: true, reason: 'make arbitrary HTTP requests' };
		}
		if (node.type.endsWith('.toolCode')) {
			return { isDangerous: true, reason: 'execute arbitrary code' };
		}
		return { isDangerous: false, reason: '' };
	}

	const hasCodeEditor = nt.properties.some((prop) => prop.typeOptions?.editor === 'codeNodeEditor');
	if (hasCodeEditor) {
		return { isDangerous: true, reason: 'execute arbitrary code' };
	}

	const isToolOutput =
		Array.isArray(nt.outputs) &&
		nt.outputs.some((output: unknown) => {
			const outputType = typeof output === 'string' ? output : (output as { type?: string })?.type;
			return outputType === NodeConnectionTypes.AiTool;
		});
	if (isToolOutput) {
		const nameIndicatesHttp =
			nt.name.toLowerCase().includes('http') || nt.displayName.toLowerCase().includes('http');
		if (nameIndicatesHttp) {
			return { isDangerous: true, reason: 'make arbitrary HTTP requests' };
		}
	}

	return { isDangerous: false, reason: '' };
}

/**
 * Returns the names of parameters that hold prompt text for an AI node.
 * Falls back to known prompt parameter names if metadata is unavailable.
 */
export function getPromptParameters(
	node: INodeUi,
	nodeType?: INodeTypeDescription | null,
): string[] {
	const FALLBACK = ['systemMessage', 'text', 'messages'];
	const nt = resolveNodeType(node, nodeType);
	if (!nt) return FALLBACK;

	const promptParams = nt.properties
		.filter(
			(prop) =>
				(prop.type === 'string' || prop.type === 'fixedCollection') &&
				(PROMPT_NAME_PATTERN.test(prop.name) || PROMPT_DISPLAY_PATTERN.test(prop.displayName)),
		)
		.map((prop) => prop.name);

	return promptParams.length > 0 ? promptParams : FALLBACK;
}

export function isWebhookNode(node: INodeUi, nodeType?: INodeTypeDescription | null): boolean {
	const nt = resolveNodeType(node, nodeType);
	if (!nt) {
		return node.type === 'n8n-nodes-base.webhook';
	}
	return (nt.webhooks?.length ?? 0) > 0;
}
