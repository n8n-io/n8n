import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';

import { classifyTool } from './classify';
import { LINEAR_READ_TOOLS, LINEAR_WRITE_TOOLS } from './linear-tools';
import type { McpCaller } from './mcp-upstream';

export interface Hydrator {
	hydrate(toolName: string, args: Record<string, unknown>, result: CallToolResult): Promise<void>;
}

const toolError = (msg: string): CallToolResult => ({
	isError: true,
	content: [{ type: 'text', text: msg }],
});

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : 'unknown error');

export class GuardRouter {
	private gymToolNames?: Set<string>;

	constructor(
		private readonly deps: { upstream: McpCaller; gym: McpCaller; hydrator: Hydrator },
	) {}

	async listTools(): Promise<Tool[]> {
		const tools = await this.deps.upstream.listTools();
		return tools.filter((t) => LINEAR_READ_TOOLS.has(t.name) || LINEAR_WRITE_TOOLS.has(t.name));
	}

	async callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
		const route = classifyTool(name);
		if (route === 'write') {
			log(name, 'gym');
			try {
				return await this.deps.gym.callTool(name, args);
			} catch (e) {
				return toolError(`gym call failed: ${errMsg(e)}`);
			}
		}

		let gymNames: Set<string>;
		try {
			gymNames = await this.getGymToolNames();
		} catch (e) {
			return toolError(`gym unreachable: ${errMsg(e)}`);
		}
		let upstreamResult: CallToolResult;
		try {
			upstreamResult = await this.deps.upstream.callTool(name, args);
		} catch (e) {
			return toolError(`upstream read failed: ${errMsg(e)}`);
		}
		if (upstreamResult.isError) {
			log(name, 'upstream');
			return upstreamResult;
		}
		if (!gymNames.has(name)) {
			log(name, 'upstream (gym lacks tool)');
			return upstreamResult;
		}
		try {
			await this.deps.hydrator.hydrate(name, args, upstreamResult);
			const res = await this.deps.gym.callTool(name, args);
			log(name, 'upstream+hydrate+gym');
			return res;
		} catch (e) {
			return toolError(`hydrate or gym read failed: ${errMsg(e)}`);
		}
	}

	private async getGymToolNames(): Promise<Set<string>> {
		if (!this.gymToolNames) {
			this.gymToolNames = new Set((await this.deps.gym.listTools()).map((t) => t.name));
		}
		return this.gymToolNames;
	}
}

// Log tool name and route only. Never log args or tokens.
function log(tool: string, route: string): void {
	Container.get(Logger).debug(`mcp-guard ${tool} -> ${route}`);
}
