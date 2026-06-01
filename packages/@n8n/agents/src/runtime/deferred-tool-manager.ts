import { z } from 'zod';

import type { AgentDbMessage, ContentToolCall } from '../types/sdk/message';
import type { BuiltTool } from '../types/sdk/tool';

export const SEARCH_TOOLS_TOOL_NAME = 'search_tools';
export const LOAD_TOOL_TOOL_NAME = 'load_tool';

const DEFAULT_TOP_K = 5;

const searchToolsInputSchema = z.object({
	query: z.string().min(1).describe('Keywords describing the capability or integration you need'),
});

const toolSummarySchema = z.object({
	name: z.string(),
	description: z.string(),
	loaded: z.boolean(),
});

const searchToolsOutputSchema = z.object({
	results: z.array(toolSummarySchema),
});

const loadToolInputSchema = z.object({
	toolName: z.string().min(1).describe('Exact tool name returned by search_tools'),
});

const loadToolOutputSchema = z.object({
	status: z.enum(['loaded', 'already_loaded', 'not_found']),
	toolName: z.string(),
	tool: toolSummarySchema.optional(),
	candidates: z.array(toolSummarySchema).optional(),
	message: z.string(),
});

type SearchToolsOutput = z.infer<typeof searchToolsOutputSchema>;
type ToolSummary = z.infer<typeof toolSummarySchema>;
type LoadToolOutput = z.infer<typeof loadToolOutputSchema>;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function tokenize(value: string): Set<string> {
	return new Set(
		value
			.toLowerCase()
			.split(/[^a-z0-9_@./-]+/i)
			.map((token) => token.trim())
			.filter(Boolean),
	);
}

function scoreTool(tool: BuiltTool, query: string): number {
	const normalizedQuery = query.toLowerCase().trim();
	const queryTokens = tokenize(query);
	const name = tool.name.toLowerCase();
	const description = tool.description.toLowerCase();
	const nameTokens = tokenize(name);
	const descriptionTokens = tokenize(description);
	let score = 0;

	if (name === normalizedQuery) score += 100;
	if (name.includes(normalizedQuery)) score += 40;
	if (description.includes(normalizedQuery)) score += 15;

	for (const token of queryTokens) {
		if (nameTokens.has(token)) score += 20;
		if (name.includes(token)) score += 10;
		if (descriptionTokens.has(token)) score += 8;
		if (description.includes(token)) score += 4;
	}

	return score;
}

export interface DeferredToolManagerOptions {
	topK?: number;
}

export class DeferredToolManager {
	private readonly toolsByName = new Map<string, BuiltTool>();

	private readonly loadedToolNames = new Set<string>();

	private readonly topK: number;

	private readonly searchTool: BuiltTool;

	private readonly loadTool: BuiltTool;

	constructor(tools: BuiltTool[], options: DeferredToolManagerOptions = {}) {
		for (const tool of tools) {
			if (tool.name === SEARCH_TOOLS_TOOL_NAME || tool.name === LOAD_TOOL_TOOL_NAME) {
				throw new Error(`Deferred tool name "${tool.name}" is reserved`);
			}
			if (this.toolsByName.has(tool.name)) {
				throw new Error(`Duplicate deferred tool name "${tool.name}"`);
			}
			this.toolsByName.set(tool.name, tool);
		}

		this.topK = options.topK ?? DEFAULT_TOP_K;
		this.searchTool = this.createSearchTool();
		this.loadTool = this.createLoadTool();
	}

	get hasTools(): boolean {
		return this.toolsByName.size > 0;
	}

	get totalToolCount(): number {
		return this.toolsByName.size;
	}

	get loadedToolCount(): number {
		return this.loadedToolNames.size;
	}

	getControllerTools(): BuiltTool[] {
		if (!this.hasTools) return [];
		return [this.searchTool, this.loadTool];
	}

	getLoadedTools(): BuiltTool[] {
		return Array.from(this.loadedToolNames)
			.map((name) => this.toolsByName.get(name))
			.filter((tool): tool is BuiltTool => tool !== undefined);
	}

	hydrateLoadedToolsFromMessages(messages: AgentDbMessage[]): void {
		this.loadedToolNames.clear();

		for (const message of messages) {
			if (!('content' in message) || !Array.isArray(message.content)) continue;
			for (const block of message.content) {
				if (!this.isSuccessfulLoadToolCall(block)) continue;
				const toolName = this.getLoadedToolNameFromOutput(block.output);
				if (toolName && this.toolsByName.has(toolName)) {
					this.loadedToolNames.add(toolName);
				}
			}
		}
	}

	private createSearchTool(): BuiltTool {
		return {
			name: SEARCH_TOOLS_TOOL_NAME,
			description:
				'Search for additional tools that can be loaded when the current toolset is missing a capability.',
			inputSchema: searchToolsInputSchema,
			outputSchema: searchToolsOutputSchema,
			handler: async (input) => {
				const { query } = searchToolsInputSchema.parse(input);
				return await Promise.resolve(this.search(query));
			},
		};
	}

	private createLoadTool(): BuiltTool {
		return {
			name: LOAD_TOOL_TOOL_NAME,
			description:
				'Load a deferred tool by exact name. The tool becomes available on the next model turn and remains available for this conversation.',
			inputSchema: loadToolInputSchema,
			outputSchema: loadToolOutputSchema,
			handler: async (input) => {
				const { toolName } = loadToolInputSchema.parse(input);
				return await Promise.resolve(this.load(toolName));
			},
		};
	}

	private search(query: string): SearchToolsOutput {
		const scored = Array.from(this.toolsByName.values())
			.map((tool) => ({
				tool,
				score: scoreTool(tool, query),
			}))
			.sort((left, right) => {
				if (left.score !== right.score) return right.score - left.score;
				return left.tool.name.localeCompare(right.tool.name);
			});

		const positiveMatches = scored.filter(({ score }) => score > 0);
		const matches = positiveMatches.length > 0 ? positiveMatches : scored;

		return {
			results: matches.slice(0, this.topK).map(({ tool }) => this.summarizeTool(tool)),
		};
	}

	private load(toolName: string): LoadToolOutput {
		const tool = this.toolsByName.get(toolName);
		if (!tool) {
			return {
				status: 'not_found',
				toolName,
				candidates: this.search(toolName).results,
				message: `Tool "${toolName}" was not found. Use search_tools to find the exact tool name.`,
			};
		}

		if (this.loadedToolNames.has(toolName)) {
			return {
				status: 'already_loaded',
				toolName,
				tool: this.summarizeTool(tool),
				message: `Tool "${toolName}" is already loaded.`,
			};
		}

		this.loadedToolNames.add(toolName);
		return {
			status: 'loaded',
			toolName,
			tool: this.summarizeTool(tool),
			message: `Tool "${toolName}" is loaded and will be available on the next model turn.`,
		};
	}

	private summarizeTool(tool: BuiltTool): ToolSummary {
		return {
			name: tool.name,
			description: tool.description,
			loaded: this.loadedToolNames.has(tool.name),
		};
	}

	private isSuccessfulLoadToolCall(
		block: unknown,
	): block is Extract<ContentToolCall, { state: 'resolved' }> {
		return (
			isRecord(block) &&
			block.type === 'tool-call' &&
			block.toolName === LOAD_TOOL_TOOL_NAME &&
			block.state === 'resolved'
		);
	}

	private getLoadedToolNameFromOutput(output: unknown): string | undefined {
		if (!isRecord(output)) return undefined;
		if (output.status !== 'loaded' && output.status !== 'already_loaded') return undefined;
		return typeof output.toolName === 'string' ? output.toolName : undefined;
	}
}
