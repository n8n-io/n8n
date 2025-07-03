import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

/**
 * Create a mock node type for testing
 */
export function createMockNodeType(
	overrides: Partial<INodeTypeDescription> = {},
): INodeTypeDescription {
	return {
		displayName: overrides.displayName || 'Mock Node',
		name: overrides.name || 'n8n-nodes-base.mockNode',
		group: overrides.group || ['transform'],
		version: overrides.version || 1,
		description: overrides.description || 'A mock node for testing',
		defaults: overrides.defaults || {
			name: 'Mock Node',
		},
		inputs: overrides.inputs || ['main'],
		outputs: overrides.outputs || ['main'],
		properties: overrides.properties || [],
		...overrides,
	};
}

/**
 * Common test node types
 */
export const TEST_NODE_TYPES = {
	// Regular nodes
	httpRequest: createMockNodeType({
		displayName: 'HTTP Request',
		name: 'n8n-nodes-base.httpRequest',
		description: 'Makes HTTP requests and returns the response',
		group: ['input'],
		properties: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				description: 'The URL to make the request to',
			},
			{
				displayName: 'Method',
				name: 'method',
				type: 'options',
				options: [
					{ name: 'GET', value: 'GET' },
					{ name: 'POST', value: 'POST' },
				],
				default: 'GET',
			},
		],
	}),

	set: createMockNodeType({
		displayName: 'Set',
		name: 'n8n-nodes-base.set',
		description: 'Sets values on items and optionally removes other values',
		group: ['input'],
	}),

	code: createMockNodeType({
		displayName: 'Code',
		name: 'n8n-nodes-base.code',
		description: 'Run custom JavaScript code',
		group: ['transform'],
	}),

	// AI main nodes
	aiAgent: createMockNodeType({
		displayName: 'AI Agent',
		name: '@n8n/n8n-nodes-langchain.agent',
		description: 'AI Agent that can use tools',
		inputs: [
			NodeConnectionTypes.Main,
			{
				type: NodeConnectionTypes.AiLanguageModel,
				required: true,
			},
			{
				type: NodeConnectionTypes.AiTool,
				required: false,
			},
		],
		outputs: [NodeConnectionTypes.Main],
	}),

	basicLlmChain: createMockNodeType({
		displayName: 'Basic LLM Chain',
		name: '@n8n/n8n-nodes-langchain.chainLlm',
		description: 'Basic LLM Chain for conversations',
		inputs: [
			NodeConnectionTypes.Main,
			{
				type: NodeConnectionTypes.AiLanguageModel,
				required: true,
			},
			{
				type: NodeConnectionTypes.AiMemory,
				required: false,
			},
		],
		outputs: [NodeConnectionTypes.Main],
	}),

	// AI sub-nodes (tools)
	calculatorTool: createMockNodeType({
		displayName: 'Calculator Tool',
		name: '@n8n/n8n-nodes-langchain.toolCalculator',
		description: 'Tool for mathematical calculations',
		inputs: [],
		outputs: [NodeConnectionTypes.AiTool],
		group: ['transform'],
	}),

	codeTool: createMockNodeType({
		displayName: 'Code Tool',
		name: '@n8n/n8n-nodes-langchain.toolCode',
		description: 'Tool for executing code',
		inputs: [],
		outputs: [NodeConnectionTypes.AiTool],
		group: ['transform'],
	}),

	// AI sub-nodes (language models)
	openAiChat: createMockNodeType({
		displayName: 'OpenAI Chat Model',
		name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
		description: 'OpenAI Chat Model for AI interactions',
		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		group: ['transform'],
	}),

	anthropicChat: createMockNodeType({
		displayName: 'Anthropic Chat Model',
		name: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
		description: 'Anthropic Claude for AI interactions',
		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		group: ['transform'],
	}),

	// AI sub-nodes (memory)
	windowBufferMemory: createMockNodeType({
		displayName: 'Window Buffer Memory',
		name: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
		description: 'Stores conversation in a window buffer',
		inputs: [],
		outputs: [NodeConnectionTypes.AiMemory],
		group: ['transform'],
	}),

	// AI sub-nodes (embeddings)
	openAiEmbeddings: createMockNodeType({
		displayName: 'Embeddings OpenAI',
		name: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
		description: 'OpenAI embeddings for vector operations',
		inputs: [],
		outputs: [NodeConnectionTypes.AiEmbedding],
		group: ['transform'],
	}),
};

/**
 * Get all test node types as an array
 */
export function getAllTestNodeTypes(): INodeTypeDescription[] {
	// Get all nodes but filter out duplicates by node name
	const nodes = Object.values(TEST_NODE_TYPES);
	const seen = new Set<string>();
	return nodes.filter((node) => {
		if (seen.has(node.name)) {
			return false;
		}
		seen.add(node.name);
		return true;
	});
}

/**
 * Get only AI sub-nodes for testing
 */
export function getAiSubNodes(): INodeTypeDescription[] {
	return getAllTestNodeTypes().filter((node) => {
		const outputs = Array.isArray(node.outputs) ? node.outputs : [];
		return outputs.some((output) => typeof output === 'string' && output.startsWith('ai_'));
	});
}

/**
 * Get only regular nodes (non-AI) for testing
 */
export function getRegularNodes(): INodeTypeDescription[] {
	return [TEST_NODE_TYPES.httpRequest, TEST_NODE_TYPES.set, TEST_NODE_TYPES.code];
}

/**
 * Create a minimal workflow state for testing
 */
export function createMockWorkflowState(overrides: any = {}) {
	return {
		workflowJSON: {
			nodes: [],
			connections: {},
			...overrides.workflowJSON,
		},
		messages: [],
		currentStep: 0,
		...overrides,
	};
}
