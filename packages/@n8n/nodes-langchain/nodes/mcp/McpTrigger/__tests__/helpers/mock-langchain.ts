import type { Tool } from '@langchain/core/tools';
import type { Mocked } from 'vitest';
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
): Mocked<Tool> {
	const {
		description = `Mock tool: ${toolName}`,
		invokeReturn = { result: 'success' },
		invokeError,
		metadata,
	} = opts;

	const invoke = vi.fn().mockImplementation(async () => {
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
	} as unknown as Mocked<Tool>;
}

/**
 * Creates multiple mock tools
 */
export function createMockTools(toolNames: string[]): Array<Mocked<Tool>> {
	return toolNames.map((n) => createMockTool(n));
}
