import {
	AddMcpServerResourceDto,
	AddMcpServerToolDto,
	UpdateMcpServerDto,
	UpdateMcpServerToolDto,
	type McpServerDetailDto,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { InstanceAiMcpServerBuilderService } from '@n8n/instance-ai';

import { McpServerStoreService } from './mcp-server-store.service';
import { McpServerTargetsService } from './mcp-server-targets.service';

/** What the Assistant reads: the server without counts it does not need. */
function forAssistant(server: McpServerDetailDto): Record<string, unknown> {
	return {
		id: server.id,
		name: server.name,
		slug: server.slug,
		url: server.url,
		description: server.description,
		instructions: server.instructions,
		active: server.active,
		accessMode: server.accessMode,
		rateLimitPerMinute: server.rateLimitPerMinute,
		shareVisibility: server.shareVisibility,
		confirmDestructive: server.confirmDestructive,
		confirmWrite: server.confirmWrite,
		tools: server.tools.map((tool) => ({
			toolId: tool.id,
			name: tool.name,
			kind: tool.kind,
			targetId: tool.targetId,
			targetName: tool.targetName,
			description: tool.description,
			behavior: tool.behavior,
			inputs: tool.inputs,
			enabled: tool.enabled,
			available: tool.available,
			...(tool.unavailableReason ? { unavailableReason: tool.unavailableReason } : {}),
		})),
		resources: server.resources.map((resource) => ({
			resourceId: resource.id,
			kind: resource.kind,
			name: resource.name,
			description: resource.description,
		})),
		apiKeyCount: server.apiKeys.length,
	};
}

/** The Assistant changes servers through the store, so the open page reloads on each change. */
export function createMcpServerBuilderService(user: User): InstanceAiMcpServerBuilderService {
	const store = Container.get(McpServerStoreService);
	const targets = Container.get(McpServerTargetsService);
	return {
		get: async (serverId) => forAssistant(await store.get(serverId)),
		update: async (serverId, changes) =>
			forAssistant(await store.update(serverId, UpdateMcpServerDto.parse(changes), 'assistant')),
		searchTargets: async (query) =>
			(await targets.listTargets(user, query ?? '')).slice(0, 40).map((target) => ({ ...target })),
		searchSkills: async (query) =>
			(await targets.listSkills(user, query ?? '')).slice(0, 40).map((skill) => ({ ...skill })),
		addTool: async (serverId, tool) => {
			const row = await store.addTool(serverId, AddMcpServerToolDto.parse(tool), 'assistant');
			return { addedToolId: row.id, server: forAssistant(await store.get(serverId)) };
		},
		updateTool: async (serverId, toolId, changes) =>
			forAssistant(
				await store.updateTool(
					serverId,
					toolId,
					UpdateMcpServerToolDto.parse(changes),
					'assistant',
				),
			),
		removeTool: async (serverId, toolId) => {
			await store.removeTool(serverId, toolId, 'assistant');
			return forAssistant(await store.get(serverId));
		},
		addResource: async (serverId, resource) =>
			forAssistant(
				await store.addResource(serverId, AddMcpServerResourceDto.parse(resource), 'assistant'),
			),
		removeResource: async (serverId, resourceId) => {
			await store.removeResource(serverId, resourceId, 'assistant');
			return forAssistant(await store.get(serverId));
		},
	};
}

/** Per-turn context for a thread bound to an MCP server. */
export async function buildMcpServerTargetBlock(serverId: string): Promise<string> {
	let server: McpServerDetailDto;
	try {
		server = await Container.get(McpServerStoreService).get(serverId);
	} catch {
		return '';
	}
	const tools = server.tools.length
		? server.tools
				.map(
					(tool) =>
						`- ${tool.name} (${tool.kind} "${tool.targetName}", ${tool.behavior}${tool.enabled ? '' : ', off'}${tool.available ? '' : ', unavailable'})`,
				)
				.join('\n')
		: '- none yet';
	const resources = server.resources.length
		? server.resources.map((resource) => `- ${resource.kind}: ${resource.name}`).join('\n')
		: '- none yet';
	return [
		'<mcp_server_target>',
		`This conversation builds the MCP server "${server.name}" (serverId ${server.id}, URL ${server.url}). The user sees this server on the right side of the page. It updates after each change you make.`,
		'Use the `mcp-server-builder` tool for every change to the server. Omit serverId: the tool uses this server.',
		'How to build a server from a request:',
		'1. Call `mcp-server-builder` with action `search_targets` to find the workflows and agents that fit. Reuse them.',
		'2. If a needed tool has no workflow, build one. It must start with a "When Executed by Another Workflow" trigger that declares its inputs (input source "Define using fields below") and must end with the data to return. Then add it with `add_tool`.',
		'3. For each tool, set a snake_case name that starts with a verb, a description that says what it does, what it returns and when to use it, and the behavior (read, write or delete).',
		'4. Give the server a name, a one-sentence description and short instructions for AI clients. Pick a safe access mode: n8n sign-in (oauth) for colleagues, API keys for other agents, public only for open data. Keep the confirmation for deleting tools on.',
		'5. End with one short summary of what you did and one question about the next step.',
		`Current access: ${server.accessMode}. Active: ${server.active}.`,
		'Current tools:',
		tools,
		'Current resources:',
		resources,
		'</mcp_server_target>',
	].join('\n');
}
