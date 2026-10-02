import { compat, credential } from '../../entry/credentials';
import { toNodeType } from '../../entry/host';
import { defineNode } from '../../index';
import { runAction } from '../../testing';
import type { JsonSchema } from '../../schema';
import { liftMcpTool, type McpClient, type McpTool } from '../mcp';

const notion = defineNode({
	id: 'notion',
	displayName: 'Notion',
	credential: credential({
		types: [compat('notionApi')],
		scopes: { 'content:read': 'Read content', 'content:insert': 'Insert content' },
	}),
});

const TOOLS: readonly McpTool[] = [
	{
		name: 'notion-search',
		title: 'Search Notion',
		description: 'Search pages and databases by title.\nReturns at most 10 results.',
		inputSchema: {
			type: 'object',
			properties: { query: { type: 'string' }, limit: { type: 'integer', minimum: 1 } },
			required: ['query'],
		},
		outputSchema: {
			type: 'object',
			properties: { results: { type: 'array', items: { type: 'string' } } },
			required: ['results'],
		},
		annotations: { readOnlyHint: true },
	},
	{
		name: 'create_page',
		description: 'Create a page.',
		// A server may send keywords outside the checked subset.
		inputSchema: {
			type: 'object',
			properties: { parent: { $ref: '#/$defs/parent' }, title: { type: 'string' } },
			required: ['parent', 'title'],
		} as JsonSchema,
		annotations: { destructiveHint: false },
	},
];

/** A fake MCP server: `tools/list` and `tools/call`, no transport. */
function fakeServer() {
	const calls: Array<{ name: string; arguments: Record<string, unknown> }> = [];
	const client: McpClient = {
		async callTool(request) {
			calls.push({ name: request.name, arguments: request.arguments });
			if (request.name === 'notion-search') {
				const query = String(request.arguments.query);
				return await Promise.resolve({
					content: [{ type: 'text', text: `found ${query}` }],
					structuredContent: { results: [`${query} page`] },
				});
			}
			if (request.arguments.title === 'Untitled') {
				return { isError: true, content: [{ type: 'text', text: 'pick a title' }] };
			}
			return { content: [{ type: 'text', text: 'created p-1' }] };
		},
	};
	return { tools: TOOLS, client, calls };
}

describe('liftMcpTool', () => {
	it('lifts each tool to a partial contract with its input, flow and output claim', () => {
		const server = fakeServer();
		const [search, create] = server.tools.map((tool) =>
			liftMcpTool(notion, tool, server.client, { resource: 'mcp' }),
		);
		expect(search?.contract).toMatchObject({
			id: 'notion.mcp.notionSearch',
			action: 'Search Notion',
			summary: 'Search pages and databases by title.',
			flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
			credentials: ['notionApi'],
			input: { required: ['query'], properties: { limit: { type: 'integer', minimum: 1 } } },
			derived: true,
			outputClaim: 'inferred',
		});
		expect(create?.contract).toMatchObject({
			id: 'notion.mcp.createPage',
			flow: { effect: 'write' },
			outputClaim: 'unknown',
		});
		expect(create?.issues).toEqual(['input.properties.parent.$ref']);
	});

	it('runs the tool through the executor: input checked, structured output emitted', async () => {
		const server = fakeServer();
		const [search] = server.tools.map((tool) =>
			liftMcpTool(notion, tool, server.client, { scopes: ['content:read'] }),
		);
		if (!search) throw new Error('no tool');
		const credentials = [{ name: 'notionApi', displayName: 'Notion', properties: [] }];
		const run = async (input: Record<string, unknown>) =>
			await runAction(search.action, {
				input,
				credential: { type: 'notionApi', data: {} },
				credentials,
			});
		expect(await run({ query: 'roadmap' })).toEqual({
			ok: true,
			items: [{ results: ['roadmap page'] }],
		});
		expect(await run({ query: 'roadmap', limit: 0 })).toMatchObject({
			ok: false,
			error: { path: 'input.limit' },
		});
		expect(server.calls).toEqual([{ name: 'notion-search', arguments: { query: 'roadmap' } }]);
		expect(search.contract.scopes).toEqual(['content:read']);
		expect(new (toNodeType(search.action))().description.name).toBe('notionNotionSearch');
	});

	it('turns a tool error into a failed item', async () => {
		const server = fakeServer();
		const create = liftMcpTool(notion, TOOLS[1] ?? TOOLS[0], server.client);
		const result = await runAction(create.action, {
			input: { parent: { page: 'p' }, title: 'Untitled' },
			credential: { type: 'notionApi', data: {} },
			credentials: [{ name: 'notionApi', displayName: 'Notion', properties: [] }],
		});
		expect(result).toEqual({
			ok: false,
			error: { message: 'MCP tool create_page failed: pick a title' },
		});
	});
});
