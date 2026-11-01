import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { configs } from '../plugin.js';

const mcpRuleId = '@n8n/community-nodes/no-mcp-protocol-client';
const mcpMessage =
	"This node speaks MCP JSON-RPC. n8n ships its own MCP Client node, so a package that only proxies an MCP server duplicates a built-in. Use the vendor's REST API, with resources and operations modelled on it. If the vendor has no REST API, the package is not currently eligible for verification.";

describe.each([
	['recommended', configs.recommended],
	['recommendedWithoutN8nCloudSupport', configs.recommendedWithoutN8nCloudSupport],
] as const)('%s MCP protocol checks', (_name, config) => {
	const linter = new Linter();
	const lint = (code: string, filename = 'nodes/Example/GenericFunctions.ts') =>
		linter.verify(
			code,
			{
				files: ['**/*.ts'],
				plugins: config.plugins,
				// Use the shipped setting. A missing rule must produce a missing diagnostic.
				rules: Object.fromEntries(
					Object.entries(config.rules).filter(([ruleId]) => ruleId === mcpRuleId),
				),
			},
			{ filename },
		);

	it.each([
		"jsonrpc: '2.0'",
		"'jsonrpc': '2.0'",
		"['jsonrpc']: '2.0'",
		"method: 'tools/call'",
		"method: 'tools/list'",
		"method: 'initialize'",
		"method: 'resources/list'",
		"method: 'resources/read'",
		"method: 'prompts/list'",
		"method: 'prompts/get'",
		"method: 'notifications/initialized'",
		"'Mcp-Session-Id': sessionId",
		"'MCP-Protocol-Version': '2024-11-05'",
		"'mcp-session-id': sessionId",
	])('rejects a standalone protocol property: %s', (property) => {
		expect(lint(`export const transport = { ${property} };`)).toEqual([
			expect.objectContaining({ ruleId: mcpRuleId, severity: 2, message: mcpMessage }),
		]);
	});

	it.each(["jsonrpc: '2.0'", "method: 'tools/list'"])(
		'reports protocolVersion before and after %s in the same file',
		(property) => {
			expect(
				lint(`
export const before = { protocolVersion: '2024-11-05' };
export const transport = { ${property} };
export const after = { protocolVersion: '2024-11-05' };
`),
			).toEqual([
				expect.objectContaining({ line: 2, message: mcpMessage }),
				expect.objectContaining({ line: 3, message: mcpMessage }),
				expect.objectContaining({ line: 4, message: mcpMessage }),
			]);
		},
	);

	it.each([
		"export const request = { jsonrpc: '1.0', method: 'POST' };",
		"export const settings = { protocolVersion: '1.0', value: 'tools/call' };",
		"export const { jsonrpc = '2.0', method = 'initialize' } = settings;",
		"export const request = { [jsonrpc]: '2.0', [method]: 'initialize' };",
	])('accepts properties without protocol evidence: %s', (code) => {
		expect(lint(code)).toEqual([]);
	});

	// CE-3542: Detect the protocol in node files and helpers, without an MCP URL.
	it.each(['nodes/Example/Example.node.ts', 'nodes/Example/GenericFunctions.ts'])(
		'rejects an MCP JSON-RPC transport in %s',
		(filename) => {
			const code = `
export async function callTool(context, sessionId) {
	return context.helpers.httpRequestWithAuthentication.call(context, 'exampleApi', {
		method: 'POST',
		url: 'https://api.example.com/transport',
		headers: { 'Mcp-Session-Id': sessionId },
		body: {
			jsonrpc: '2.0',
			id: 1,
			method: 'tools/call',
			params: { name: 'search', arguments: {} },
		},
	});
}
export const initialization = { protocolVersion: '2024-11-05' };
`;

			expect(lint(code, filename)).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ ruleId: mcpRuleId, severity: 2, message: mcpMessage }),
				]),
			);
		},
	);

	it.each(['https://mcp.example.com/v1/images', 'https://api.example.com/mcp'])(
		'accepts a REST transport at %s',
		(url) => {
			expect(
				lint(`
export async function createImage(context) {
	return context.helpers.httpRequestWithAuthentication.call(context, 'exampleApi', {
		method: 'POST',
		url: '${url}',
		body: { imageUrl: 'https://example.com/image.png' },
	});
}`),
			).toEqual([]);
		},
	);

	it('accepts MCP option values, display text, and codex aliases', () => {
		expect(
			lint(`
export const properties = [
	{
		displayName: 'Protocol',
		name: 'protocol',
		type: 'options',
		options: [{ name: 'MCP', value: 'mcp' }],
		default: 'mcp',
	},
	{
		displayName: 'MCP Tool Name',
		name: 'toolName',
		type: 'string',
		description: 'The MCP tool name sent through the REST API',
		default: '',
	},
];
export const codex = { alias: ['MCP', 'MCP Tool'] };
`),
		).toEqual([]);
	});

	it('accepts protocolVersion without a JSON-RPC envelope or MCP method in the file', () => {
		expect(lint("export const settings = { protocolVersion: '2024-11-05' };")).toEqual([]);
	});

	it('accepts protocol markers in strings and comments', () => {
		expect(
			lint(`
// jsonrpc: '2.0', method: 'tools/call', protocolVersion: '2024-11-05'
export const example = '{ "jsonrpc": "2.0", "method": "initialize" }';
export const headerNames = ['Mcp-Session-Id', 'MCP-Protocol-Version'];
export const methodNames = ['tools/list', 'resources/read', 'prompts/get'];
`),
		).toEqual([]);
	});
});
