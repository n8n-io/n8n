/**
 * Integration tests for McpConnection with Streamable HTTP transport.
 * Uses a real in-process HTTP server implementing the MCP Streamable HTTP protocol.
 * No mocking of SDK internals or McpConnection.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startStreamableHttpServer, TINY_PNG, type TestServer } from './mcp-server-helpers';
import { McpConnection } from '../../runtime/mcp-connection';
import type { ContentFile, ContentText, Message } from '../../types/sdk/message';

describe('McpConnection — Streamable HTTP transport', () => {
	let server: TestServer;

	beforeAll(async () => {
		server = await startStreamableHttpServer();
	});

	afterAll(async () => {
		await server.close();
	});

	it('connects to a Streamable HTTP server and lists tools', async () => {
		const conn = new McpConnection({ name: 'test', url: server.url, transport: 'streamableHttp' });
		await conn.connect();

		const tools = await conn.listTools();

		expect(tools).toHaveLength(3);
		expect(tools.map((t) => t.name)).toEqual(
			expect.arrayContaining(['test_echo', 'test_add', 'test_image']),
		);

		await conn.disconnect();
	});

	it('calls echo tool and returns text content', async () => {
		const conn = new McpConnection({ name: 'test', url: server.url, transport: 'streamableHttp' });
		await conn.connect();

		const result = await conn.callTool('echo', { message: 'hello from streamable-http' });

		expect(result.isError).toBeFalsy();
		expect(result.content).toHaveLength(1);
		expect(result.content[0]).toEqual({ type: 'text', text: 'hello from streamable-http' });

		await conn.disconnect();
	});

	it('calls add tool and returns calculated result', async () => {
		const conn = new McpConnection({ name: 'test', url: server.url, transport: 'streamableHttp' });
		await conn.connect();

		const result = await conn.callTool('add', { a: 100, b: 200 });

		expect(result.isError).toBeFalsy();
		expect(result.content[0]).toEqual({ type: 'text', text: '300' });

		await conn.disconnect();
	});

	it('calls image tool and returns mixed text + image content', async () => {
		const conn = new McpConnection({ name: 'test', url: server.url, transport: 'streamableHttp' });
		await conn.connect();

		const result = await conn.callTool('image', { caption: 'mountains' });

		expect(result.isError).toBeFalsy();
		expect(result.content).toHaveLength(2);
		expect(result.content[0]).toMatchObject({ type: 'text', text: 'mountains' });
		expect(result.content[1]).toMatchObject({
			type: 'image',
			data: TINY_PNG,
			mimeType: 'image/png',
		});

		await conn.disconnect();
	});

	it('disconnects cleanly without throwing', async () => {
		const conn = new McpConnection({ name: 'test', url: server.url, transport: 'streamableHttp' });
		await conn.connect();
		await expect(conn.disconnect()).resolves.toBeUndefined();
	});

	describe('listTools() resolved tools', () => {
		it('prefixes tool names with the server name', async () => {
			const conn = new McpConnection({
				name: 'devtools',
				url: server.url,
				transport: 'streamableHttp',
			});
			await conn.connect();

			const builtTools = await conn.listTools();

			expect(builtTools.every((t) => t.name.startsWith('devtools_'))).toBe(true);
			expect(builtTools.map((t) => t.name)).toEqual(
				expect.arrayContaining(['devtools_echo', 'devtools_add', 'devtools_image']),
			);

			await conn.disconnect();
		});

		it('toMessage returns a user message with file part for image results', async () => {
			const conn = new McpConnection({
				name: 'test',
				url: server.url,
				transport: 'streamableHttp',
			});
			await conn.connect();

			const builtTools = await conn.listTools();
			const imageTool = builtTools.find((t) => t.name === 'test_image')!;

			const mcpResult = await conn.callTool('image', { caption: 'sunset' });
			const message = imageTool.toMessage!(mcpResult);

			expect(message).toBeDefined();
			const llmMessage = message as Message;
			expect(llmMessage.role).toBe('assistant');

			const content = llmMessage.content as Array<ContentText | ContentFile>;
			const filePart = content.find((c): c is ContentFile => c.type === 'file');
			expect(filePart).toBeDefined();
			expect(filePart!.mediaType).toBe('image/png');

			await conn.disconnect();
		});
	});
});
