import { MCP_INSTANCE_SCOPES } from '@n8n/api-types';
import type { OperationContext, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { lazyImport } from '@n8n/utils/lazy-import';
import { ErrorReporter } from 'n8n-core';

import { McpService } from '@/modules/mcp/mcp.service';
import type { McpAuthContext } from '@/modules/mcp/mcp.types';

import { createInProcessFetch } from './in-process-fetch';
import { ASSISTANT_MCP_CLIENT_INFO, InstanceMcpClient } from './instance-mcp-client';

/**
 * Connects the Assistant to the instance MCP server as a modern client. The
 * server is the same per-request `McpServer` the public endpoint builds, so
 * tool availability, scope filtering, the read-only block, and tool-call
 * telemetry all apply. The Assistant presents every instance scope, is marked
 * first-party so the per-workflow "Available in MCP" switch does not limit it,
 * and is told apart in telemetry by its `clientInfo`.
 */
@Service()
export class InstanceMcpClientFactory {
	constructor(
		private readonly mcpService: McpService,
		private readonly errorReporter: ErrorReporter,
	) {}

	async createForUser(user: User, ctx: OperationContext = {}): Promise<InstanceMcpClient> {
		const { createMcpHandler } = await lazyImport<typeof import('@modelcontextprotocol/server')>(
			async () => await import('@modelcontextprotocol/server'),
		);
		const featureFlags = await this.mcpService.resolveFeatureFlags(user);
		// First-party: the per-workflow "Available in MCP" switch is for third-party clients.
		const auth: McpAuthContext = { grantedScopes: [...MCP_INSTANCE_SCOPES], firstParty: true };
		const handler = createMcpHandler(
			async () =>
				await this.mcpService.getServer(user, featureFlags, ASSISTANT_MCP_CLIENT_INFO, auth, ctx),
			{
				// The client pins the modern revision, so legacy traffic is a bug, not a client.
				legacy: 'reject',
				onerror: (error) => this.errorReporter.error(error),
			},
		);
		return await InstanceMcpClient.connect({
			fetch: createInProcessFetch(handler),
			onClose: async () => await handler.close(),
		});
	}
}
