/**
 * Integration tests for McpConnection with stdio transport.
 * Spawns a real child process (mcp-stdio-server.mjs) and communicates via stdin/stdout.
 * No mocking of SDK internals or McpConnection.
 */
import path from 'path';
import { describe, expect, it } from 'vitest';

import { TINY_PNG } from './mcp-server-helpers';
import { McpConnection } from '../../runtime/mcp-connection';

// vitest injects __dirname for TypeScript test files in the node environment.
const FIXTURE_PATH = path.resolve(__dirname, '../fixtures/mcp-stdio-server.mjs');

/** Config that spawns the stdio fixture server. */
function stdioConfig(name = 'test') {
	return {
		name,
		command: 'node',
		args: [FIXTURE_PATH],
	};
}

describe('McpConnection — stdio transport', () => {
	it('connects to a stdio server and lists tools', async () => {
		const conn = new McpConnection(stdioConfig());
		await conn.connect();

		const tools = await conn.listTools();

		expect(tools).toHaveLength(3);
		expect(tools.map((t) => t.name)).toEqual(
			expect.arrayContaining(['test_echo', 'test_add', 'test_image']),
		);

		await conn.disconnect();
	});

	it('calls echo tool and returns text content', async () => {
		const conn = new McpConnection(stdioConfig());
		await conn.connect();

		const result = await conn.callTool('echo', { message: 'hello from stdio' });

		expect(result.isError).toBeFalsy();
		expect(result.content).toHaveLength(1);
		expect(result.content[0]).toEqual({ type: 'text', text: 'hello from stdio' });

		await conn.disconnect();
	});

	it('calls add tool and returns calculated result', async () => {
		const conn = new McpConnection(stdioConfig());
		await conn.connect();

		const result = await conn.callTool('add', { a: 42, b: 58 });

		expect(result.isError).toBeFalsy();
		expect(result.content[0]).toEqual({ type: 'text', text: '100' });

		await conn.disconnect();
	});

	it('calls image tool and returns mixed text + image content', async () => {
		const conn = new McpConnection(stdioConfig());
		await conn.connect();

		const result = await conn.callTool('image', { caption: 'forest' });

		expect(result.isError).toBeFalsy();
		expect(result.content).toHaveLength(2);
		expect(result.content[0]).toMatchObject({ type: 'text', text: 'forest' });
		expect(result.content[1]).toMatchObject({
			type: 'image',
			data: TINY_PNG,
			mimeType: 'image/png',
		});

		await conn.disconnect();
	});

	it('disconnects cleanly, terminating the child process', async () => {
		const conn = new McpConnection(stdioConfig());
		await conn.connect();
		await expect(conn.disconnect()).resolves.toBeUndefined();
	});

	describe('listTools() resolved tools', () => {
		it('prefixes tool names with the server name', async () => {
			const conn = new McpConnection(stdioConfig('fs'));
			await conn.connect();

			const builtTools = await conn.listTools();

			expect(builtTools.every((t) => t.name.startsWith('fs_'))).toBe(true);
			expect(builtTools.map((t) => t.name)).toEqual(
				expect.arrayContaining(['fs_echo', 'fs_add', 'fs_image']),
			);

			await conn.disconnect();
		});

		it('handler invokes the child process tool and returns MCP result', async () => {
			const conn = new McpConnection(stdioConfig());
			await conn.connect();

			const builtTools = await conn.listTools();
			const addTool = builtTools.find((t) => t.name === 'test_add')!;

			const result = await addTool.handler!({ a: 3, b: 4 }, {} as never);
			const mcpResult = result as { content: Array<{ type: string; text: string }> };

			expect(mcpResult.content[0]).toEqual({ type: 'text', text: '7' });

			await conn.disconnect();
		});
	});
});
