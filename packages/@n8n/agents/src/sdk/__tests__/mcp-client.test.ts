import { describe, expect, it } from 'vitest';

import { McpClient } from '../mcp-client';

describe('McpClient constructor validation', () => {
	it('throws if neither url nor command is provided', () => {
		expect(() => new McpClient([{ name: 'bad' }])).toThrow(
			'exactly one of "url" or "command" must be provided',
		);
	});

	it('throws if both url and command are provided', () => {
		expect(
			() => new McpClient([{ name: 'bad', url: 'http://localhost', command: 'node' }]),
		).toThrow('provide either "url" or "command", not both');
	});

	it('throws if a duplicate server name is registered', () => {
		expect(
			() =>
				new McpClient([
					{ name: 'browser', url: 'http://localhost:9999/sse' },
					{ name: 'browser', url: 'http://localhost:9998/sse' },
				]),
		).toThrow('MCP server name "browser" is already registered');
	});

	it('accepts valid url-based config', () => {
		expect(() => new McpClient([{ name: 'srv', url: 'http://localhost:9999/sse' }])).not.toThrow();
	});

	it('accepts valid command-based config', () => {
		expect(
			() => new McpClient([{ name: 'stdio-srv', command: 'node', args: ['server.mjs'] }]),
		).not.toThrow();
	});

	it('accepts multiple servers with distinct names', () => {
		expect(
			() =>
				new McpClient([
					{ name: 'srv-a', url: 'http://localhost:9999/sse' },
					{ name: 'srv-b', url: 'http://localhost:9998/sse' },
				]),
		).not.toThrow();
	});
});
