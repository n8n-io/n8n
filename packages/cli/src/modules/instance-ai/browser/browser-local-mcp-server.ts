import type {
	InstanceAiPermissionMode,
	McpTool,
	McpToolCallRequest,
	McpToolCallResult,
} from '@n8n/api-types';
import {
	GATEWAY_CONFIRMATION_REQUIRED_PREFIX,
	mcpToolCallResultSchema,
	mcpToolSchema,
} from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { DomainAccessTracker, LocalMcpServer } from '@n8n/instance-ai';
import type { BrowserToolkit, ToolContext, ToolDefinition } from '@n8n/mcp-browser';
import { zodToJsonSchema } from 'zod-to-json-schema';

export interface BrowserDomainGate {
	tracker: DomainAccessTracker;
	runId: string;
	permissionMode?: InstanceAiPermissionMode;
}

const NO_DOMAIN = 'browser';

export class BrowserLocalMcpServer implements LocalMcpServer {
	private readonly toolsByName = new Map<string, ToolDefinition>();

	private readonly mcpTools: McpTool[] = [];

	private gate?: BrowserDomainGate;

	constructor(
		toolkit: BrowserToolkit,
		private readonly toolContext: ToolContext,
		private readonly logger: Logger,
	) {
		for (const tool of toolkit.tools) {
			const candidate = {
				name: tool.name,
				description: tool.description,
				inputSchema: zodToJsonSchema(tool.inputSchema),
				annotations: { category: 'browser' },
			};
			const parsed = mcpToolSchema.safeParse(candidate);
			if (!parsed.success) {
				this.logger.warn('Skipping browser tool with unsupported input schema', {
					tool: tool.name,
				});
				continue;
			}

			this.toolsByName.set(tool.name, tool);
			this.mcpTools.push(parsed.data);
		}
	}

	setDomainGate(gate: BrowserDomainGate | undefined): void {
		this.gate = gate;
	}

	getAvailableTools(): McpTool[] {
		return this.mcpTools;
	}

	getToolsByCategory(category: string): McpTool[] {
		return category === 'browser' ? this.mcpTools : [];
	}

	async callTool(req: McpToolCallRequest): Promise<McpToolCallResult> {
		const tool = this.toolsByName.get(req.name);
		if (!tool) {
			return errorResult(`Unknown browser tool: ${req.name}`);
		}

		try {
			const { _confirmation, ...rawArgs } = req.arguments;
			const args: unknown = tool.inputSchema.parse(rawArgs);

			const gateResult = await this.gateDomainAccess(tool, args, _confirmation);
			if (gateResult) {
				return gateResult;
			}

			const result = await tool.execute(args, this.toolContext);
			const parsed = mcpToolCallResultSchema.safeParse(result);
			if (parsed.success) {
				return parsed.data;
			}

			return {
				content: [{ type: 'text', text: JSON.stringify(result.content) }],
				...(result.isError === true ? { isError: true } : {}),
			};
		} catch (error) {
			return errorResult(error instanceof Error ? error.message : String(error));
		}
	}

	private async gateDomainAccess(
		tool: ToolDefinition,
		args: unknown,
		confirmation: unknown,
	): Promise<McpToolCallResult | undefined> {
		const gate = this.gate;
		if (!gate) {
			return undefined;
		}

		const host = await this.affectedHost(tool, args);
		if (!host || host === NO_DOMAIN) {
			return undefined;
		}

		if (typeof confirmation === 'string') {
			switch (confirmation) {
				case 'allowForSession':
					gate.tracker.approveDomain(host);
					return undefined;
				case 'allowOnce':
					gate.tracker.approveOnce(gate.runId, host);
					return undefined;
				default:
					return errorResult('Access denied by user');
			}
		}

		if (gate.permissionMode === 'blocked') {
			return errorResult('Browser access blocked by admin');
		}
		if (gate.permissionMode !== 'always_allow' && !gate.tracker.isHostAllowed(host, gate.runId)) {
			return confirmationRequiredResult(host);
		}
		return undefined;
	}

	private async affectedHost(tool: ToolDefinition, args: unknown): Promise<string | undefined> {
		try {
			const resources = await tool.getAffectedResources(args, this.toolContext);
			return resources[0]?.resource;
		} catch {
			return undefined;
		}
	}
}

function confirmationRequiredResult(host: string): McpToolCallResult {
	const payload = {
		toolGroup: 'browser',
		resource: host,
		description: `Browser: ${host}`,
		options: ['denyOnce', 'allowOnce', 'allowForSession'],
	};
	return {
		content: [
			{ type: 'text', text: `${GATEWAY_CONFIRMATION_REQUIRED_PREFIX}${JSON.stringify(payload)}` },
		],
		isError: true,
	};
}

function errorResult(message: string): McpToolCallResult {
	return { content: [{ type: 'text', text: message }], isError: true };
}
