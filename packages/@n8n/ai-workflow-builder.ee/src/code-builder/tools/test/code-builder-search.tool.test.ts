/**
 * Smoke test for the LangChain wrapper around `searchCodeBuilderNodes`.
 *
 * The substantive search behaviour (builder hints, related nodes, discriminator
 * formatting, etc.) is covered by `packages/@n8n/ai-utilities/src/__tests__/node-catalog/search.test.ts`
 * because the pure-function implementation lives in `@n8n/ai-utilities`.
 *
 * This file only verifies that the wrapper:
 *   - exposes the expected tool name and schema, and
 *   - round-trips a basic invocation back to the pure function.
 */

import { NodeTypeParser } from '@n8n/ai-utilities';
import type { INodeTypeDescription } from 'n8n-workflow';

import { createCodeBuilderSearchTool } from '../code-builder-search.tool';

const mockHttpRequestNode: INodeTypeDescription = {
	name: 'n8n-nodes-base.httpRequest',
	displayName: 'HTTP Request',
	description: 'Makes HTTP requests and returns the response data',
	group: ['transform'],
	version: 4,
	defaults: { name: 'HTTP Request' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [],
};

describe('createCodeBuilderSearchTool', () => {
	it('exposes the expected tool name', () => {
		const nodeTypeParser = new NodeTypeParser([mockHttpRequestNode]);
		const tool = createCodeBuilderSearchTool(nodeTypeParser);
		expect(tool.name).toBe('search_nodes');
	});

	it('round-trips a basic invocation through the pure search helper', async () => {
		const nodeTypeParser = new NodeTypeParser([mockHttpRequestNode]);
		const tool = createCodeBuilderSearchTool(nodeTypeParser);

		const result = await tool.invoke({ queries: ['http'] });

		expect(typeof result).toBe('string');
		expect(result).toContain('n8n-nodes-base.httpRequest');
		expect(result).toContain('HTTP Request');
	});
});
