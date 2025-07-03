import type { INodeTypeDescription } from 'n8n-workflow';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import type { ToolContext } from '../base/types';

/**
 * Create a mock ToolContext for testing
 */
export function createMockToolContext(
	nodeTypes: INodeTypeDescription[],
	getCurrentTaskInput: () => unknown = () => ({}),
	config: Partial<LangGraphRunnableConfig> = {},
): ToolContext {
	const mockReporter = {
		start: jest.fn(),
		progress: jest.fn(),
		complete: jest.fn(),
		error: jest.fn(),
		createBatchReporter: jest.fn(() => ({
			init: jest.fn(),
			next: jest.fn(),
			complete: jest.fn(),
		})),
	};

	const mockResponseBuilder = {
		withMessage: jest.fn().mockReturnThis(),
		withError: jest.fn().mockReturnThis(),
		withState: jest.fn().mockReturnThis(),
		build: jest.fn(),
	};

	// Create a minimal mock that satisfies the type requirements
	return {
		nodeTypes,
		reporter: mockReporter as any,
		responseBuilder: mockResponseBuilder as any,
		config: config as LangGraphRunnableConfig,
		getCurrentTaskInput,
	};
}
