import { McpServer } from '@modelcontextprotocol/server';
import { MCP_INSTANCE_SCOPES } from '@n8n/api-types';
import type { User } from '@n8n/db';
import type { ErrorReporter } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { McpFeatureFlags, McpService } from '@/modules/mcp/mcp.service';

import { ASSISTANT_MCP_CLIENT_INFO } from '../instance-mcp-client';
import { InstanceMcpClientFactory } from '../instance-mcp-client.factory';

describe('InstanceMcpClientFactory', () => {
	const user = mock<User>({ id: 'user-1' });
	const featureFlags: McpFeatureFlags = {
		mcpApps: { enabled: false, variant: 'control' },
		instanceContextEnabled: false,
	};

	it('builds the per-request server for the user as the Assistant client with every scope', async () => {
		const mcpService = mock<McpService>();
		mcpService.resolveFeatureFlags.mockResolvedValue(featureFlags);
		mcpService.getServer.mockImplementation(async () => {
			const server = new McpServer(
				{ name: 'n8n MCP Server', version: '1.0.0' },
				{ instructions: 'hi' },
			);
			// A server without tools advertises no tools capability, and the client
			// then answers `listTools()` locally without a request.
			server.registerTool('ping', { description: 'ping' }, () => ({
				content: [{ type: 'text', text: 'pong' }],
			}));
			return server;
		});
		const factory = new InstanceMcpClientFactory(mcpService, mock<ErrorReporter>());
		const ctx = { security: undefined };

		const client = await factory.createForUser(user, ctx);
		const instructions = client.instructions;
		const tools = await client.listTools();
		await client.close();

		expect(instructions).toBe('hi');
		expect(tools.map((tool) => tool.name)).toEqual(['ping']);
		expect(mcpService.resolveFeatureFlags).toHaveBeenCalledWith(user);
		// Discover and list each build their own server, as every request does on the endpoint.
		expect(mcpService.getServer.mock.calls.length).toBeGreaterThanOrEqual(2);
		for (const call of mcpService.getServer.mock.calls) {
			expect(call).toEqual([
				user,
				featureFlags,
				ASSISTANT_MCP_CLIENT_INFO,
				{ grantedScopes: [...MCP_INSTANCE_SCOPES] },
				ctx,
			]);
		}
	});
});
