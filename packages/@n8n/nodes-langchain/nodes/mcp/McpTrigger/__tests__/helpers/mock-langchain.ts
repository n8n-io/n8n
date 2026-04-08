import type { Tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Creates a mock Tool for testing
 */
export function createMockTool(
	toolName: string,
	opts: {
		description?: string;
		invokeReturn?: unknown;
		invokeError?: Error;
		metadata?: Record<string, unknown>;
	} = {},
): jest.Mocked<Tool> {
	const {
		description = `Mock tool: ${toolName}`,
		invokeReturn = { result: 'success' },
		invokeError,
		metadata,
	} = opts;

	const invoke = jest.fn().mockImplementation(async () => {
		await Promise.resolve();
		if (invokeError) {
			throw invokeError;
		}
		return invokeReturn;
	});

	return {
		name: toolName,
		description,
		schema: z.object({}),
		invoke,
		metadata,
	} as unknown as jest.Mocked<Tool>;
}

/**
 * Creates multiple mock tools
 */
export function createMockTools(toolNames: string[]): Array<jest.Mocked<Tool>> {
	return toolNames.map((n) => createMockTool(n));
}
