import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';

import type { McpCaller } from './mcp-upstream';

export interface Hydrator {
	hydrate(toolName: string, args: Record<string, unknown>, result: CallToolResult): Promise<void>;
	// Optional. Copies the objects a write refers to (such as its parent) from the real service.
	hydrateWrite?(toolName: string, args: Record<string, unknown>): Promise<void>;
	// Optional. The gym answered a write. The objects it made have no real copy.
	noteWrite?(toolName: string, result: CallToolResult): void;
}

const toolError = (msg: string): CallToolResult => ({
	isError: true,
	content: [{ type: 'text', text: msg }],
});

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : 'unknown error');

export class GuardRouter {
	private gymToolNames?: Set<string>;

	constructor(
		private readonly deps: {
			upstream: McpCaller;
			gym: McpCaller;
			hydrator: Hydrator;
			readTools: ReadonlySet<string>;
			writeTools: ReadonlySet<string>;
			// The args of the call to the real service. The agent's args can ask for less than the
			// hydration needs (a field list without ids), so the real call may ask for more. The gym
			// still answers the agent's own args.
			upstreamArgs?: (name: string, args: Record<string, unknown>) => Record<string, unknown>;
		},
	) {}

	async listTools(): Promise<Tool[]> {
		const tools = await this.deps.upstream.listTools();
		const { readTools, writeTools } = this.deps;
		return tools.filter((t) => readTools.has(t.name) || writeTools.has(t.name));
	}

	async callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
		// Only an exact read-list match is a read. Unknown tools are writes.
		if (!this.deps.readTools.has(name)) {
			log(name, 'gym');
			try {
				// A failed parent read must not block the write. The gym then answers with its own error.
				await this.deps.hydrator.hydrateWrite?.(name, args).catch(() => undefined);
				const res = await this.deps.gym.callTool(name, args);
				if (res.isError) logError(name, 'gym', res);
				else this.deps.hydrator.noteWrite?.(name, res);
				return res;
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
			upstreamResult = await this.deps.upstream.callTool(
				name,
				this.deps.upstreamArgs?.(name, args) ?? args,
			);
		} catch (e) {
			return toolError(`upstream read failed: ${errMsg(e)}`);
		}
		if (upstreamResult.isError) {
			// An object that the agent made in the gym has no real copy. The gym may know it.
			const fromGym =
				isNotFound(upstreamResult) && gymNames.has(name)
					? await this.tryGym(name, args)
					: undefined;
			if (fromGym) return fromGym;
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
			if (res.isError) logError(name, 'gym', res);
			log(name, 'upstream+hydrate+gym');
			return res;
		} catch (e) {
			return toolError(`hydrate or gym read failed: ${errMsg(e)}`);
		}
	}

	// The gym answer of a read, or undefined when the gym fails or has no such object.
	private async tryGym(
		name: string,
		args: Record<string, unknown>,
	): Promise<CallToolResult | undefined> {
		try {
			const res = await this.deps.gym.callTool(name, args);
			if (res.isError) return undefined;
			log(name, 'gym (real read found nothing)');
			return res;
		} catch {
			return undefined;
		}
	}

	private async getGymToolNames(): Promise<Set<string>> {
		if (!this.gymToolNames) {
			this.gymToolNames = new Set((await this.deps.gym.listTools()).map((t) => t.name));
		}
		return this.gymToolNames;
	}
}

// The real service says an object does not exist. Other errors (limits, auth) stay as they are.
function isNotFound(res: CallToolResult): boolean {
	const text = res.content.flatMap((c) => (c.type === 'text' ? [c.text] : [])).join(' ');
	return /not found|could not find|does not exist/i.test(text);
}

// Log the error text of a failed tool result, never the arguments.
function logError(tool: string, route: string, res: CallToolResult): void {
	const text = res.content
		.flatMap((c) => (c.type === 'text' ? [c.text] : []))
		.join(' ')
		.slice(0, 300);
	Container.get(Logger).warn(`mcp-guard ${tool} -> ${route} failed: ${text}`);
}

// Log tool name and route only. Never log args or tokens.
function log(tool: string, route: string): void {
	Container.get(Logger).info(`mcp-guard ${tool} -> ${route}`);
}
