/**
 * Unit-style tests for McpConnection.listTools() approval wrapping.
 *
 * These tests use a real in-process MCP SSE server but do NOT require an LLM.
 * They verify that the `requireApproval` field on McpServerConfig (and the
 * global `shouldRequireToolApproval` constructor flag) correctly wrap the
 * appropriate tools with a suspend/resume approval gate.
 *
 * Tool names from the test server: echo, add, image (prefixed: tools_echo, tools_add, tools_image).
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { startSseServer, type TestServer } from './mcp-server-helpers';
import { McpConnection } from '../../runtime/mcp-connection';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true when the tool has been wrapped with an approval gate (has a suspendSchema). */
function isApprovalWrapped(tool: { suspendSchema?: unknown }): boolean {
	return tool.suspendSchema !== undefined;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('McpConnection.listTools() — requireApproval config', () => {
	let server: TestServer;
	let connection: McpConnection | undefined;

	beforeAll(async () => {
		server = await startSseServer();
	});

	afterAll(async () => {
		await server.close();
	});

	afterEach(async () => {
		if (connection) {
			await connection.disconnect();
			connection = undefined;
		}
	});

	// -----------------------------------------------------------------------
	// no approval
	// -----------------------------------------------------------------------

	it('does not wrap any tools when requireApproval is not set', async () => {
		connection = new McpConnection({ name: 'tools', url: server.url });
		await connection.connect();
		const tools = await connection.listTools();

		expect(tools.length).toBeGreaterThan(0);
		expect(tools.every((t) => !isApprovalWrapped(t))).toBe(true);
	});

	it('does not wrap any tools when requireApproval is false', async () => {
		connection = new McpConnection({ name: 'tools', url: server.url, requireApproval: false });
		await connection.connect();
		const tools = await connection.listTools();

		expect(tools.every((t) => !isApprovalWrapped(t))).toBe(true);
	});

	it('does not wrap any tools when requireApproval is an empty array', async () => {
		connection = new McpConnection({ name: 'tools', url: server.url, requireApproval: [] });
		await connection.connect();
		const tools = await connection.listTools();

		expect(tools.every((t) => !isApprovalWrapped(t))).toBe(true);
	});

	// -----------------------------------------------------------------------
	// requireApproval: true — all tools
	// -----------------------------------------------------------------------

	it('wraps all tools when requireApproval: true in server config', async () => {
		connection = new McpConnection({ name: 'tools', url: server.url, requireApproval: true });
		await connection.connect();
		const tools = await connection.listTools();

		expect(tools.length).toBeGreaterThan(0);
		expect(tools.every((t) => isApprovalWrapped(t))).toBe(true);
	});

	// -----------------------------------------------------------------------
	// requireApproval: string[] — selective tools
	// -----------------------------------------------------------------------

	it('wraps only the listed tool when requireApproval names a single tool', async () => {
		connection = new McpConnection({
			name: 'tools',
			url: server.url,
			requireApproval: ['echo'],
		});
		await connection.connect();
		const tools = await connection.listTools();

		const echo = tools.find((t) => t.name === 'tools_echo');
		const add = tools.find((t) => t.name === 'tools_add');
		const image = tools.find((t) => t.name === 'tools_image');

		expect(echo).toBeDefined();
		expect(add).toBeDefined();
		expect(image).toBeDefined();

		expect(isApprovalWrapped(echo!)).toBe(true);
		expect(isApprovalWrapped(add!)).toBe(false);
		expect(isApprovalWrapped(image!)).toBe(false);
	});

	it('wraps multiple listed tools when requireApproval names several tools', async () => {
		connection = new McpConnection({
			name: 'tools',
			url: server.url,
			requireApproval: ['echo', 'add'],
		});
		await connection.connect();
		const tools = await connection.listTools();

		const echo = tools.find((t) => t.name === 'tools_echo');
		const add = tools.find((t) => t.name === 'tools_add');
		const image = tools.find((t) => t.name === 'tools_image');

		expect(isApprovalWrapped(echo!)).toBe(true);
		expect(isApprovalWrapped(add!)).toBe(true);
		expect(isApprovalWrapped(image!)).toBe(false);
	});

	it('does not wrap tools that are not in the requireApproval list', async () => {
		connection = new McpConnection({
			name: 'tools',
			url: server.url,
			requireApproval: ['image'],
		});
		await connection.connect();
		const tools = await connection.listTools();

		const echo = tools.find((t) => t.name === 'tools_echo');
		const add = tools.find((t) => t.name === 'tools_add');
		const image = tools.find((t) => t.name === 'tools_image');

		expect(isApprovalWrapped(echo!)).toBe(false);
		expect(isApprovalWrapped(add!)).toBe(false);
		expect(isApprovalWrapped(image!)).toBe(true);
	});

	// -----------------------------------------------------------------------
	// global shouldRequireToolApproval flag
	// -----------------------------------------------------------------------

	it('wraps all tools when global shouldRequireToolApproval flag is true', async () => {
		connection = new McpConnection({ name: 'tools', url: server.url }, true);
		await connection.connect();
		const tools = await connection.listTools();

		expect(tools.every((t) => isApprovalWrapped(t))).toBe(true);
	});

	// -----------------------------------------------------------------------
	// global flag + config.requireApproval interaction
	// -----------------------------------------------------------------------

	it('wraps all tools when global flag is true even if config.requireApproval names only some tools', async () => {
		connection = new McpConnection(
			{ name: 'tools', url: server.url, requireApproval: ['echo'] },
			true,
		);
		await connection.connect();
		const tools = await connection.listTools();

		expect(tools.every((t) => isApprovalWrapped(t))).toBe(true);
	});

	it('wraps all tools when config.requireApproval: true even if global flag is false', async () => {
		connection = new McpConnection(
			{ name: 'tools', url: server.url, requireApproval: true },
			false,
		);
		await connection.connect();
		const tools = await connection.listTools();

		expect(tools.every((t) => isApprovalWrapped(t))).toBe(true);
	});

	// -----------------------------------------------------------------------
	// prefix stripping — server name used as prefix
	// -----------------------------------------------------------------------

	it('matches tool names without prefix when requireApproval contains un-prefixed names', async () => {
		// The server is named 'srv'; tools will be 'srv_echo', 'srv_add', 'srv_image'.
		// requireApproval uses the un-prefixed original names.
		connection = new McpConnection({ name: 'srv', url: server.url, requireApproval: ['echo'] });
		await connection.connect();
		const tools = await connection.listTools();

		const echo = tools.find((t) => t.name === 'srv_echo');
		const add = tools.find((t) => t.name === 'srv_add');

		expect(isApprovalWrapped(echo!)).toBe(true);
		expect(isApprovalWrapped(add!)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Disconnect idempotency
// ---------------------------------------------------------------------------

type McpConnectionInternals = { client: { close(): Promise<void> } };

describe('McpConnection.disconnect() — idempotency', () => {
	let server: TestServer;

	beforeAll(async () => {
		server = await startSseServer();
	});

	afterAll(async () => {
		await server.close();
	});

	it('does not throw and does not call client.close() again when disconnect is called on an already-closed connection', async () => {
		const conn = new McpConnection({ name: 'tools', url: server.url });
		await conn.connect();

		const clientClose = vi
			.spyOn((conn as unknown as McpConnectionInternals).client, 'close')
			.mockResolvedValue(undefined);

		await conn.disconnect();
		await conn.disconnect();

		expect(clientClose).toHaveBeenCalledTimes(1);
	});

	it('does not throw and calls client.close() exactly once when disconnect is called concurrently', async () => {
		const conn = new McpConnection({ name: 'tools', url: server.url });
		await conn.connect();

		const clientClose = vi
			.spyOn((conn as unknown as McpConnectionInternals).client, 'close')
			.mockResolvedValue(undefined);

		await Promise.all([conn.disconnect(), conn.disconnect()]);

		expect(clientClose).toHaveBeenCalledTimes(1);
	});
});
