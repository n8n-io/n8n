import { Agent } from '@mastra/core/agent';
import { MCPClient } from '@mastra/mcp';

import { createMemory } from '../memory/memory-config';
import { createAllTools } from '../tools';
import type { CreateInstanceAgentOptions } from '../types';
import { getSystemPrompt } from './system-prompt';
import { withLangsmithMetadata } from '@mastra/langsmith';
import { buildTracingOptions } from '@mastra/observability';

export async function createInstanceAgent(options: CreateInstanceAgentOptions): Promise<Agent> {
	const { modelId, context, mcpServers = [], memoryConfig } = options;

	// Build native n8n tools (context captured via closures)
	const tools = createAllTools(context);

	// Build MCP tools from external servers
	let mcpTools: Record<string, unknown> = {};
	if (mcpServers.length > 0) {
		const servers: Record<
			string,
			{ url: URL } | { command: string; args?: string[]; env?: Record<string, string> }
		> = {};
		for (const server of mcpServers) {
			if (server.url) {
				servers[server.name] = { url: new URL(server.url) };
			} else if (server.command) {
				servers[server.name] = { command: server.command, args: server.args, env: server.env };
			}
		}
		const mcpClient = new MCPClient({ servers });
		mcpTools = await mcpClient.listTools();
	}

	// Create memory (handles all 3 tiers)
	const memory = createMemory(memoryConfig);

	return new Agent({
		id: 'n8n-instance-agent',
		name: 'n8n Instance Agent',
		instructions: getSystemPrompt(),
		model: modelId,
		tools: { ...tools, ...mcpTools },
		defaultOptions: {
			tracingOptions: buildTracingOptions(withLangsmithMetadata({ projectName: 'instance-ai' })),
		},
		memory,
	});
}
