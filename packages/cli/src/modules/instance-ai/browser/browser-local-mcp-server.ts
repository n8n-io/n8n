import type { McpTool, McpToolCallRequest, McpToolCallResult } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { LocalMcpServer } from '@n8n/instance-ai';
import type {
	AffectedResource,
	BrowserToolkit,
	ToolContext,
	ToolDefinition,
} from '@n8n/mcp-browser';

import {
	browserErrorResult,
	executeBrowserTool,
	gateBrowserAccess,
	toBrowserMcpTool,
	type BrowserDomainGate,
} from './browser.helpers';

export type { BrowserDomainGate } from './browser.helpers';

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
			const mcpTool = toBrowserMcpTool(tool);
			if (!mcpTool) {
				this.logger.warn('Skipping browser tool with unsupported input schema', {
					tool: tool.name,
				});
				continue;
			}

			this.toolsByName.set(tool.name, tool);
			this.mcpTools.push(mcpTool);
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
			return browserErrorResult(`Unknown browser tool: ${req.name}`);
		}

		const { _confirmation, ...rawArgs } = req.arguments;
		return await executeBrowserTool(
			tool,
			rawArgs,
			this.toolContext,
			async (args) => await this.gateAccess(tool, args, _confirmation),
		);
	}

	private async gateAccess(
		tool: ToolDefinition,
		args: unknown,
		confirmation: unknown,
	): Promise<McpToolCallResult | undefined> {
		const gate = this.gate;
		if (!gate) {
			return undefined;
		}

		const affected = await this.affectedResource(tool, args);
		if (!affected || affected.resource === NO_DOMAIN) {
			return undefined;
		}

		return await gateBrowserAccess(gate, affected, confirmation);
	}

	private async affectedResource(
		tool: ToolDefinition,
		args: unknown,
	): Promise<AffectedResource | undefined> {
		try {
			const resources = await tool.getAffectedResources(args, this.toolContext);
			return resources[0];
		} catch {
			return undefined;
		}
	}
}
