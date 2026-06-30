/**
 * Minimal MCP server for stdio transport integration tests.
 * Spawned as a child process by mcp-stdio-transport.test.ts.
 * Run with: node mcp-stdio-server.mjs
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// 1×1 transparent PNG in base64 (smallest valid PNG)
const TINY_PNG =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const server = new Server(
	{ name: 'test-stdio-server', version: '1.0.0' },
	{ capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
	tools: [
		{
			name: 'echo',
			description: 'Echo the message back as-is',
			inputSchema: {
				type: 'object',
				properties: { message: { type: 'string', description: 'Message to echo' } },
				required: ['message'],
			},
		},
		{
			name: 'add',
			description: 'Add two numbers together',
			inputSchema: {
				type: 'object',
				properties: {
					a: { type: 'number', description: 'First number' },
					b: { type: 'number', description: 'Second number' },
				},
				required: ['a', 'b'],
			},
		},
		{
			name: 'image',
			description: 'Return a small image with a caption',
			inputSchema: {
				type: 'object',
				properties: { caption: { type: 'string', description: 'Image caption' } },
				required: ['caption'],
			},
		},
	],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args = {} } = request.params;

	if (name === 'echo') {
		return { content: [{ type: 'text', text: String(args.message ?? '') }] };
	}

	if (name === 'add') {
		const sum = Number(args.a ?? 0) + Number(args.b ?? 0);
		return { content: [{ type: 'text', text: String(sum) }] };
	}

	if (name === 'image') {
		return {
			content: [
				{ type: 'text', text: String(args.caption ?? '') },
				{ type: 'image', data: TINY_PNG, mimeType: 'image/png' },
			],
		};
	}

	return {
		isError: true,
		content: [{ type: 'text', text: `Unknown tool: ${name}` }],
	};
});

const transport = new StdioServerTransport();
await server.connect(transport);
