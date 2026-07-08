import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

import { resolveRecommendedToolNames } from './resolve-recommended-tool-names';
import { SKILL_LOAD_TOOL_NAME } from '../../skills/types';
import type { AgentDbMessage, ContentToolCall } from '../../types/sdk/message';
import type { BuiltTool } from '../../types/sdk/tool';

export const SEARCH_TOOLS_TOOL_NAME = 'search_tools';
export const LOAD_TOOLS_TOOL_NAME = 'load_tools';
/** @deprecated Legacy single-tool loader — hydration only. */
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

const loadToolsInputSchema = z.object({
	toolNames: z
		.array(z.string().min(1))
		.min(1)
		.describe('Exact tool names to load — from search_tools or a skill recommendedTools list'),
});

const loadToolResultSchema = z.object({
	toolName: z.string(),
	status: z.enum(['loaded', 'already_loaded', 'not_found']),
	tool: toolSummarySchema.optional(),
	candidates: z.array(toolSummarySchema).optional(),
});

const loadToolsOutputSchema = z.object({
	results: z.array(loadToolResultSchema),
	loadedCount: z.number(),
	message: z.string(),
});

type SearchToolsOutput = z.infer<typeof searchToolsOutputSchema>;
type ToolSummary = z.infer<typeof toolSummarySchema>;
type LoadToolResult = z.infer<typeof loadToolResultSchema>;
type LoadToolsOutput = z.infer<typeof loadToolsOutputSchema>;

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

export interface HydrateLoadedToolsOptions {
	/** Tool names that must be available after hydration (e.g. a suspended resume target). */
	ensureLoadedToolNames?: readonly string[];
	skillToolActivation?: {
		resolveRecommendedTools: (input: {
			skillId?: string;
			name?: string;
			filePath?: string;
		}) => string[] | undefined;
	};
}

export class DeferredToolManager {
	private readonly toolsByName = new Map<string, BuiltTool>();

	private readonly loadedToolNames = new Set<string>();

	private readonly topK: number;

	private readonly searchTool: BuiltTool;

	private readonly loadTools: BuiltTool;

	constructor(tools: BuiltTool[], options: DeferredToolManagerOptions = {}) {
		for (const tool of tools) {
			if (
				tool.name === SEARCH_TOOLS_TOOL_NAME ||
				tool.name === LOAD_TOOLS_TOOL_NAME ||
				tool.name === LOAD_TOOL_TOOL_NAME
			) {
				throw new Error(`Deferred tool name "${tool.name}" is reserved`);
			}
			if (this.toolsByName.has(tool.name)) {
				throw new Error(`Duplicate deferred tool name "${tool.name}"`);
			}
			this.toolsByName.set(tool.name, tool);
		}

		this.topK = options.topK ?? DEFAULT_TOP_K;
		this.searchTool = this.createSearchTool();
		this.loadTools = this.createLoadTools();
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

	getAvailableToolNames(): ReadonlySet<string> {
		return new Set(this.toolsByName.keys());
	}

	getControllerTools(): BuiltTool[] {
		if (!this.hasTools) return [];
		return [this.searchTool, this.loadTools];
	}

	getLoadedTools(): BuiltTool[] {
		return Array.from(this.loadedToolNames)
			.map((name) => this.toolsByName.get(name))
			.filter((tool): tool is BuiltTool => tool !== undefined);
	}

	hydrateLoadedToolsFromMessages(
		messages: AgentDbMessage[],
		options?: HydrateLoadedToolsOptions,
	): void {
		this.loadedToolNames.clear();

		for (const message of messages) {
			if (!('content' in message) || !Array.isArray(message.content)) continue;
			for (const block of message.content) {
				if (!isRecord(block) || block.type !== 'tool-call') continue;

				if (this.isSuccessfulLoadToolsCall(block)) {
					for (const toolName of this.getLoadedToolNamesFromOutput(block.output)) {
						this.markLoadedIfDeferred(toolName);
					}
					continue;
				}

				const resolvedSkillLoad = this.asResolvedSkillLoadCall(block);
				if (resolvedSkillLoad && options?.skillToolActivation) {
					if (this.isMainSkillLoad(resolvedSkillLoad.input, resolvedSkillLoad.output)) {
						const recommended = options.skillToolActivation.resolveRecommendedTools(
							this.getSkillLoadInput(resolvedSkillLoad.input),
						);
						if (recommended?.length) {
							this.markRecommendedToolsLoaded(recommended);
						}
					}
					continue;
				}

				if (typeof block.toolName === 'string') {
					this.markLoadedIfDeferred(block.toolName);
				}
			}
		}

		for (const toolName of options?.ensureLoadedToolNames ?? []) {
			this.markLoadedIfDeferred(toolName);
		}
	}

	/** Load deferred tools by name. Resolves skill aliases when needed. */
	loadMany(toolNames: readonly string[]): LoadToolsOutput {
		const results: LoadToolResult[] = [];
		const seen = new Set<string>();

		for (const requestedName of toolNames) {
			const resolvedName = resolveRecommendedToolNames(
				[requestedName],
				this.getAvailableToolNames(),
			)[0];
			if (!resolvedName) {
				results.push({
					toolName: requestedName,
					status: 'not_found',
					candidates: this.search(requestedName).results,
				});
				continue;
			}
			if (seen.has(resolvedName)) continue;
			seen.add(resolvedName);
			results.push(this.loadOne(resolvedName));
		}

		const loadedCount = results.filter(
			(result) => result.status === 'loaded' || result.status === 'already_loaded',
		).length;

		return {
			results,
			loadedCount,
			message:
				loadedCount > 0
					? `${loadedCount} tool(s) loaded and will be available on the next model turn.`
					: 'No tools were loaded. Use search_tools to find exact tool names.',
		};
	}

	/** Returns names that were newly loaded or already loaded. */
	activateRecommendedTools(recommended: readonly string[]): string[] {
		const output = this.loadMany(recommended);
		return output.results
			.filter((result) => result.status === 'loaded' || result.status === 'already_loaded')
			.map((result) => result.toolName);
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

	private createLoadTools(): BuiltTool {
		return {
			name: LOAD_TOOLS_TOOL_NAME,
			description:
				'Load one or more deferred tools by exact name. Loaded tools become available on the next model turn and remain available for this conversation.',
			inputSchema: loadToolsInputSchema,
			outputSchema: loadToolsOutputSchema,
			handler: async (input) => {
				const { toolNames } = loadToolsInputSchema.parse(input);
				return await Promise.resolve(this.loadMany(toolNames));
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

	private loadOne(toolName: string): LoadToolResult {
		const tool = this.toolsByName.get(toolName);
		if (!tool) {
			return {
				toolName,
				status: 'not_found',
				candidates: this.search(toolName).results,
			};
		}

		if (this.loadedToolNames.has(toolName)) {
			return {
				toolName,
				status: 'already_loaded',
				tool: this.summarizeTool(tool),
			};
		}

		this.loadedToolNames.add(toolName);
		return {
			toolName,
			status: 'loaded',
			tool: this.summarizeTool(tool),
		};
	}

	private markLoadedIfDeferred(toolName: string): void {
		if (this.toolsByName.has(toolName)) {
			this.loadedToolNames.add(toolName);
		}
	}

	private markRecommendedToolsLoaded(recommended: readonly string[]): void {
		for (const toolName of resolveRecommendedToolNames(recommended, this.getAvailableToolNames())) {
			this.loadedToolNames.add(toolName);
		}
	}

	private getSkillLoadInput(input: unknown): {
		skillId?: string;
		name?: string;
		filePath?: string;
	} {
		if (!isRecord(input)) return {};
		return {
			skillId: typeof input.skillId === 'string' ? input.skillId : undefined,
			name: typeof input.name === 'string' ? input.name : undefined,
			filePath: typeof input.filePath === 'string' ? input.filePath : undefined,
		};
	}

	private isMainSkillLoad(input: unknown, output: unknown): boolean {
		if (!isRecord(input)) return false;
		const filePath = input.filePath;
		if (typeof filePath === 'string' && filePath.trim() !== '' && filePath !== 'SKILL.md') {
			return false;
		}
		if (isRecord(output) && output.type === 'content') return true;
		if (isRecord(output) && output.success === true && output.filePath === undefined) return true;
		return false;
	}

	private summarizeTool(tool: BuiltTool): ToolSummary {
		return {
			name: tool.name,
			description: tool.description,
			loaded: this.loadedToolNames.has(tool.name),
		};
	}

	private isSuccessfulLoadToolsCall(
		block: unknown,
	): block is Extract<ContentToolCall, { state: 'resolved' }> {
		return (
			isRecord(block) &&
			block.type === 'tool-call' &&
			(block.toolName === LOAD_TOOLS_TOOL_NAME || block.toolName === LOAD_TOOL_TOOL_NAME) &&
			block.state === 'resolved'
		);
	}

	private asResolvedSkillLoadCall(
		block: unknown,
	):
		| (Extract<ContentToolCall, { state: 'resolved' }> & { toolName: typeof SKILL_LOAD_TOOL_NAME })
		| undefined {
		if (
			!isRecord(block) ||
			block.type !== 'tool-call' ||
			block.toolName !== SKILL_LOAD_TOOL_NAME ||
			block.state !== 'resolved'
		) {
			return undefined;
		}
		return block as unknown as Extract<ContentToolCall, { state: 'resolved' }> & {
			toolName: typeof SKILL_LOAD_TOOL_NAME;
		};
	}

	private getLoadedToolNamesFromOutput(output: unknown): string[] {
		if (!isRecord(output)) return [];

		if (Array.isArray(output.results)) {
			const names: string[] = [];
			for (const entry of output.results) {
				if (!isRecord(entry)) continue;
				if (entry.status !== 'loaded' && entry.status !== 'already_loaded') continue;
				if (typeof entry.toolName === 'string') names.push(entry.toolName);
			}
			return names;
		}

		if (output.status === 'loaded' || output.status === 'already_loaded') {
			return typeof output.toolName === 'string' ? [output.toolName] : [];
		}

		return [];
	}
}
