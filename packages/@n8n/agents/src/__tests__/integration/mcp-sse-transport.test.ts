/**
 * Integration tests for McpConnection with SSE transport.
 * Uses a real in-process HTTP server implementing the MCP SSE protocol.
 * No mocking of SDK internals or McpConnection.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startSseServer, TINY_PNG, type TestServer } from './mcp-server-helpers';
import { McpConnection } from '../../runtime/mcp-connection';
import type { ContentFile, ContentText, Message } from '../../types/sdk/message';
import { isZodSchema } from '../../utils/zod';

describe('McpConnection — SSE transport', () => {
	let server: TestServer;

	beforeAll(async () => {
		server = await startSseServer();
	});

	afterAll(async () => {
		await server.close();
	});

	it('connects to an SSE server and lists tools', async () => {
		const conn = new McpConnection({ name: 'test', url: server.url });
		await conn.connect();

		const tools = await conn.listTools();

		expect(tools).toHaveLength(3);
		expect(tools.map((t) => t.name)).toEqual(
			expect.arrayContaining(['test_echo', 'test_add', 'test_image']),
		);

		await conn.disconnect();
	});

	it('calls echo tool and returns text content', async () => {
		const conn = new McpConnection({ name: 'test', url: server.url });
		await conn.connect();

		const result = await conn.callTool('echo', { message: 'hello from sse' });

		expect(result.isError).toBeFalsy();
		expect(result.content).toHaveLength(1);
		expect(result.content[0]).toEqual({ type: 'text', text: 'hello from sse' });

		await conn.disconnect();
	});

	it('calls add tool and returns calculated result', async () => {
		const conn = new McpConnection({ name: 'test', url: server.url });
		await conn.connect();

		const result = await conn.callTool('add', { a: 7, b: 13 });

		expect(result.isError).toBeFalsy();
		expect(result.content[0]).toEqual({ type: 'text', text: '20' });

		await conn.disconnect();
	});

	it('calls image tool and returns mixed text + image content', async () => {
		const conn = new McpConnection({ name: 'test', url: server.url });
		await conn.connect();

		const result = await conn.callTool('image', { caption: 'landscape' });

		expect(result.isError).toBeFalsy();
		expect(result.content).toHaveLength(2);
		expect(result.content[0]).toMatchObject({ type: 'text', text: 'landscape' });
		expect(result.content[1]).toMatchObject({
			type: 'image',
			data: TINY_PNG,
			mimeType: 'image/png',
		});

		await conn.disconnect();
	});

	it('disconnects cleanly without throwing', async () => {
		const conn = new McpConnection({ name: 'test', url: server.url });
		await conn.connect();
		await expect(conn.disconnect()).resolves.toBeUndefined();
	});

	it('throws when listTools() is called without connecting first', async () => {
		const conn = new McpConnection({ name: 'test', url: server.url });
		// Do NOT call conn.connect()
		await expect(conn.listTools()).rejects.toThrow();
	});

	it('throws when callTool() is called without connecting first', async () => {
		const conn = new McpConnection({ name: 'test', url: server.url });
		await expect(conn.callTool('echo', { message: 'hi' })).rejects.toThrow();
	});

	it('is idempotent — calling connect() twice resolves without starting a second connection', async () => {
		const conn = new McpConnection({ name: 'test', url: server.url });
		await conn.connect();
		await expect(conn.connect()).resolves.toBeUndefined();
		await conn.disconnect();
	});

	it('deduplicates concurrent connect() calls — both resolve via the same promise', async () => {
		const conn = new McpConnection({ name: 'test', url: server.url });
		const [r1, r2] = await Promise.all([conn.connect(), conn.connect()]);
		expect(r1).toBeUndefined();
		expect(r2).toBeUndefined();
		await conn.disconnect();
	});

	describe('listTools() resolved tools', () => {
		it('prefixes tool names with the server name', async () => {
			const conn = new McpConnection({ name: 'browser', url: server.url });
			await conn.connect();

			const builtTools = await conn.listTools();

			expect(builtTools.every((t) => t.name.startsWith('browser_'))).toBe(true);
			expect(builtTools.map((t) => t.name)).toEqual(
				expect.arrayContaining(['browser_echo', 'browser_add', 'browser_image']),
			);

			await conn.disconnect();
		});

		it('sets inputSchema as raw JSON Schema (not Zod) and sets mcpTool flag', async () => {
			const conn = new McpConnection({ name: 'test', url: server.url });
			await conn.connect();

			const builtTools = await conn.listTools();

			for (const t of builtTools) {
				expect(t.inputSchema).toBeDefined();
				expect(isZodSchema(t.inputSchema!)).toBe(false);
				expect(t.mcpTool).toBe(true);
				expect(t.mcpServerName).toBe('test');
			}

			await conn.disconnect();
		});

		it('handler calls the tool and returns the MCP result', async () => {
			const conn = new McpConnection({ name: 'test', url: server.url });
			await conn.connect();

			const builtTools = await conn.listTools();
			const echoTool = builtTools.find((t) => t.name === 'test_echo')!;

			const result = await echoTool.handler!({ message: 'from handler' }, {} as never);
			const mcpResult = result as { content: Array<{ type: string; text: string }> };

			expect(mcpResult.content[0]).toEqual({ type: 'text', text: 'from handler' });

			await conn.disconnect();
		});

		it('toMessage returns undefined for text-only results', async () => {
			const conn = new McpConnection({ name: 'test', url: server.url });
			await conn.connect();

			const builtTools = await conn.listTools();
			const echoTool = builtTools.find((t) => t.name === 'test_echo')!;

			const mcpResult = await conn.callTool('echo', { message: 'text only' });
			const message = echoTool.toMessage!(mcpResult);

			expect(message).toBeUndefined();

			await conn.disconnect();
		});

		it('toMessage returns a user message with file part for image results', async () => {
			const conn = new McpConnection({ name: 'test', url: server.url });
			await conn.connect();

			const builtTools = await conn.listTools();
			const imageTool = builtTools.find((t) => t.name === 'test_image')!;

			const mcpResult = await conn.callTool('image', { caption: 'my photo' });
			const message = imageTool.toMessage!(mcpResult);

			expect(message).toBeDefined();
			const llmMessage = message as Message;
			expect(llmMessage.role).toBe('assistant');

			const content = llmMessage.content as Array<ContentText | ContentFile>;
			const textPart = content.find((c): c is ContentText => c.type === 'text');
			const filePart = content.find((c): c is ContentFile => c.type === 'file');

			expect(textPart).toBeDefined();
			expect(textPart!.text).toBe('my photo');
			expect(filePart).toBeDefined();
			expect(filePart!.mediaType).toBe('image/png');
			expect(filePart!.data).toBe(TINY_PNG);

			await conn.disconnect();
		});
	});
});
