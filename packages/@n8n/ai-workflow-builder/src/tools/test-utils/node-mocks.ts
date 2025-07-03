// Re-export from fixtures for backward compatibility
export { getAllTestNodeTypes as createMockNodeTypes } from './fixtures';

// Import the specific nodes we need
import { TEST_NODE_TYPES } from './fixtures';
import type { INodeTypeDescription } from 'n8n-workflow';

// Create a custom function that includes the nodes we need for the refactored tests
export function createMockNodeTypesForRefactoredTools(): INodeTypeDescription[] {
	return [
		TEST_NODE_TYPES.httpRequest,
		TEST_NODE_TYPES.set,
		TEST_NODE_TYPES.code,
		TEST_NODE_TYPES.aiAgent,
		TEST_NODE_TYPES.basicLlmChain,
		TEST_NODE_TYPES.calculatorTool,
		TEST_NODE_TYPES.codeTool,
		TEST_NODE_TYPES.openAiChat, // Use the specific naming expected by tests
		TEST_NODE_TYPES.anthropicChat,
		TEST_NODE_TYPES.windowBufferMemory,
		TEST_NODE_TYPES.openAiEmbeddings,
	];
}
