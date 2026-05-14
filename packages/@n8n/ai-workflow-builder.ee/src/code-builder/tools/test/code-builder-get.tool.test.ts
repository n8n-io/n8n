/**
 * Smoke test for the LangChain wrapper around `getNodeTypes`.
 *
 * The substantive node-get behaviour (discriminator support, multi-dir resolution,
 * tool variant fallback, path traversal guards) is covered by
 * `packages/@n8n/ai-utilities/src/__tests__/node-catalog/get-node-types.test.ts`
 * because the pure-function implementation lives in `@n8n/ai-utilities`.
 *
 * This file only verifies that the wrapper:
 *   - exposes the expected tool name and schema, and
 *   - round-trips a basic invocation back to the pure function.
 */

import { createCodeBuilderGetTool } from '../code-builder-get.tool';

describe('createCodeBuilderGetTool', () => {
	it('exposes the expected tool name', () => {
		const tool = createCodeBuilderGetTool();
		expect(tool.name).toBe('get_node_types');
	});

	it('round-trips a basic invocation through the pure get helper', async () => {
		const tool = createCodeBuilderGetTool({
			nodeDefinitionDirs: ['/non-existent-path-that-does-not-exist-12345'],
		});

		const result = await tool.invoke({ nodeIds: ['n8n-nodes-base.httpRequest'] });

		// Pure helper returns a string with an error message when the dir doesn't exist
		expect(typeof result).toBe('string');
		expect(result).toContain('not found');
	});
});
