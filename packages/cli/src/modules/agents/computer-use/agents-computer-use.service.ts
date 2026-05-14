import type { BuiltTool, InterruptibleToolContext } from '@n8n/agents';
import type {
	AgentComputerUseAffectedResource,
	AgentComputerUseStatusResponse,
	McpTool,
	McpToolCallResult,
} from '@n8n/api-types';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { JSONSchema7 } from 'json-schema';
import { z } from 'zod';

import { ComputerUseGatewayService } from '@/modules/computer-use-gateway/computer-use-gateway.service';
import type { LocalGateway } from '@/modules/computer-use-gateway/local-gateway';
import { UrlService } from '@/services/url.service';

import type { AgentJsonConfig } from '../json-config/agent-json-config';

const FILESYSTEM_READ_TOOLS = new Set([
	'list_files',
	'get_file_tree',
	'stat_path',
	'search_files',
	'read_file',
]);

const FILESYSTEM_WRITE_TOOLS = new Set([
	'write_file',
	'edit_file',
	'create_directory',
	'copy_file',
	'move',
	'delete_to_trash',
]);

const SHELL_TOOLS = new Set([
	'shell_execute',
	'process_start',
	'process_poll',
	'process_wait',
	'process_write',
	'process_kill',
]);

const APPROVAL_REQUIRED_TOOLS = new Set([
	...FILESYSTEM_WRITE_TOOLS,
	'shell_execute',
	'process_start',
	'process_write',
	'process_kill',
]);

const PROCESS_TOOLS = new Set([
	'process_start',
	'process_poll',
	'process_wait',
	'process_write',
	'process_kill',
]);

const affectedResourceSchema = z.object({
	toolGroup: z.enum(['filesystemRead', 'filesystemWrite', 'shell', 'process']),
	resource: z.string(),
	description: z.string(),
	preview: z
		.object({
			kind: z.enum(['text', 'diff']),
			title: z.string().optional(),
			content: z.string(),
			truncated: z.boolean().optional(),
		})
		.optional(),
}) satisfies z.ZodType<AgentComputerUseAffectedResource>;

const approvalSuspendSchema = z.object({
	type: z.literal('approval'),
	toolName: z.string(),
	args: z.unknown(),
	resources: z.array(affectedResourceSchema),
});

const approvalResumeSchema = z.object({
	approved: z.boolean(),
});

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stripConfirmation(args: unknown): Record<string, unknown> {
	if (!isRecord(args)) return {};
	const { _confirmation, _n8nPreviewOnly, ...cleanArgs } = args;
	return cleanArgs;
}

function normalizeToolResult(result: McpToolCallResult): unknown {
	if (result.isError) {
		const message = result.structuredContent?.error ?? textContent(result) ?? 'Gateway tool failed';
		throw new Error(String(message));
	}

	if (result.structuredContent !== undefined) return result.structuredContent;

	const text = textContent(result);
	if (!text) return {};

	try {
		return JSON.parse(text) as unknown;
	} catch {
		return { content: text };
	}
}

function textContent(result: McpToolCallResult): string {
	return result.content
		.filter((item): item is { type: 'text'; text: string } => item.type === 'text')
		.map((item) => item.text)
		.join('\n');
}

@Service()
export class AgentsComputerUseService {
	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly gatewayService: ComputerUseGatewayService,
		private readonly urlService: UrlService,
	) {}

	isModuleEnabled(): boolean {
		return this.agentsConfig.modules.includes('computer-use');
	}

	createPairingLink(userId: string): {
		token: string;
		command: string;
		expiresAt: string | null;
		ttlSeconds: number | null;
	} {
		const token = this.gatewayService.generatePairingToken(userId);
		const expiresAt = this.gatewayService.getGatewayApiKeyExpiresAt(userId, token);
		const ttlSeconds = expiresAt
			? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000))
			: null;
		const baseUrl = this.urlService.getInstanceBaseUrl();
		return {
			token,
			command: `npx @n8n/computer-use ${baseUrl} ${token}`,
			expiresAt: expiresAt?.toISOString() ?? null,
			ttlSeconds,
		};
	}

	getStatus(userId: string): AgentComputerUseStatusResponse {
		const status = this.gatewayService.getGatewayStatus(userId);
		const tools = new Set(status.tools.map((tool) => tool.name));
		const categories = new Map(status.toolCategories.map((category) => [category.name, category]));
		const filesystemCategory = categories.get('filesystem');
		const shellCategory = categories.get('shell');

		return {
			moduleEnabled: this.isModuleEnabled(),
			connected: status.connected,
			connectedAt: status.connectedAt,
			directory: status.directory,
			hostIdentifier: status.hostIdentifier,
			capabilities: {
				filesystem: {
					enabled: filesystemCategory?.enabled === true,
					write:
						filesystemCategory?.enabled === true &&
						filesystemCategory.writeAccess === true &&
						[...FILESYSTEM_WRITE_TOOLS].some((toolName) => tools.has(toolName)),
				},
				shell: {
					enabled: shellCategory?.enabled === true && tools.has('shell_execute'),
					processes:
						shellCategory?.enabled === true && [...PROCESS_TOOLS].some((name) => tools.has(name)),
				},
			},
		};
	}

	getRuntimeTools(config: AgentJsonConfig, userId: string): BuiltTool[] {
		if (!this.isModuleEnabled()) return [];
		if (config.computerUse?.enabled !== true) return [];

		const gateway = this.gatewayService.findGateway(userId);
		if (!gateway?.isConnected) return [];

		const status = gateway.getStatus();
		const categories = new Map(status.toolCategories.map((category) => [category.name, category]));
		const filesystemCategory = categories.get('filesystem');
		const shellCategory = categories.get('shell');

		const filesystemEnabled =
			config.computerUse.filesystem?.enabled !== false && filesystemCategory?.enabled === true;
		const filesystemWriteEnabled =
			filesystemEnabled &&
			config.computerUse.filesystem?.write === true &&
			filesystemCategory?.writeAccess === true;
		const shellEnabled =
			config.computerUse.shell?.enabled === true && shellCategory?.enabled === true;

		return status.tools.flatMap((tool) => {
			if (FILESYSTEM_READ_TOOLS.has(tool.name)) {
				return filesystemEnabled ? [this.toBuiltTool(tool, userId)] : [];
			}
			if (FILESYSTEM_WRITE_TOOLS.has(tool.name)) {
				return filesystemWriteEnabled ? [this.toBuiltTool(tool, userId)] : [];
			}
			if (SHELL_TOOLS.has(tool.name)) {
				return shellEnabled ? [this.toBuiltTool(tool, userId)] : [];
			}
			return [];
		});
	}

	private toBuiltTool(tool: McpTool, userId: string): BuiltTool {
		const requiresApproval = APPROVAL_REQUIRED_TOOLS.has(tool.name);
		const builtTool: BuiltTool = {
			name: tool.name,
			description:
				tool.description ?? `Run ${tool.name} through the connected computer-use gateway`,
			inputSchema: tool.inputSchema as JSONSchema7,
			editable: false,
			metadata: { computerUse: true },
			handler: async (input, ctx) => await this.handleToolCall(tool.name, userId, input, ctx),
		};

		if (!requiresApproval) return builtTool;

		return {
			...builtTool,
			suspendSchema: approvalSuspendSchema,
			resumeSchema: approvalResumeSchema,
		};
	}

	private async handleToolCall(
		toolName: string,
		userId: string,
		input: unknown,
		ctx: Parameters<NonNullable<BuiltTool['handler']>>[1],
	): Promise<unknown> {
		const gateway = this.gatewayService.findGateway(userId);
		if (!gateway?.isConnected) {
			throw new Error('Computer Use gateway is not connected');
		}

		const args = stripConfirmation(input);

		if (APPROVAL_REQUIRED_TOOLS.has(toolName)) {
			const interruptCtx = ctx as InterruptibleToolContext<
				z.infer<typeof approvalSuspendSchema>,
				z.infer<typeof approvalResumeSchema>
			>;
			if (interruptCtx.resumeData === undefined) {
				return await interruptCtx.suspend({
					type: 'approval',
					toolName,
					args,
					resources: await this.getAffectedResources(toolName, args, gateway),
				});
			}

			if (!interruptCtx.resumeData.approved) {
				return {
					approved: false,
					message: `Computer Use action "${toolName}" was not approved`,
				};
			}
		}

		const result = await gateway.callTool({
			name: toolName,
			arguments: APPROVAL_REQUIRED_TOOLS.has(toolName)
				? { ...args, _confirmation: 'allowOnce' }
				: args,
		});
		return normalizeToolResult(result);
	}

	private async getAffectedResources(
		toolName: string,
		args: Record<string, unknown>,
		gateway: LocalGateway,
	): Promise<AgentComputerUseAffectedResource[]> {
		const result = await gateway.previewTool({
			name: toolName,
			arguments: args,
		});
		const normalized = normalizeToolResult(result);
		if (!isRecord(normalized) || !Array.isArray(normalized.resources)) {
			throw new Error(`Computer Use gateway did not return affected resources for "${toolName}"`);
		}

		return z.array(affectedResourceSchema).parse(normalized.resources);
	}
}
