/**
 * ToolSearchProcessor
 *
 * Reduces friction in agent creation by giving agents a runtime tool discovery
 * mechanism, modeled after Mastra's ToolSearchProcessor.
 *
 * ## Design
 *
 * Instead of requiring the user to enumerate every tool upfront, the processor
 * injects two meta-tools into the agent's tool set:
 *
 *   • search_tools  — keyword search over the tool repository; returns a ranked
 *                     list of candidates with their names and descriptions.
 *   • load_tool     — activates a discovered tool by name, making it available
 *                     on the **next** agent turn.
 *
 * The processor is an *input processor*: it runs before each agent turn and
 * mutates the active tool set in place.
 *
 * ## Two-step flow
 *
 *   1. Agent calls search_tools("calendar") → ranked list of matching tools.
 *   2. Agent calls load_tool("google_calendar_create_event") → tool is injected.
 *   3. On the next turn the real tool is available for use.
 *
 * ## Credential filtering
 *
 * The repository only surfaces tools whose backing credentials are configured.
 * Tools without credentials are silently excluded at runtime.
 *
 * ## Duplicate detection
 *
 * load_tool rejects a name that already exists in the active tool set to
 * prevent one tool from silently overwriting another.
 *
 * ## Implementation plan
 *
 * Phase 1 (this file) — stubs & interfaces
 *   [x] ToolRepository interface
 *   [x] ToolSearchResult / ToolSearchProcessorConfig types
 *   [x] ToolSearchProcessor class skeleton with method stubs
 *
 * Phase 2 — search_tools implementation
 *   [x] Score candidate tools by keyword frequency in name + description
 *   [x] Cap results to a configurable maxResults (default: 10)
 *   [x] Return ranked list sorted by score desc
 *
 * Phase 3 — load_tool implementation
 *   [x] Look up tool in repository by exact name
 *   [x] Reject if already present in active set (duplicate guard)
 *   [x] Inject into active tool set; tool is available next turn
 *
 * Phase 4 — credential filtering (skipped for now — all tools treated as available)
 *   [ ] Accept a CredentialChecker callback in config
 *   [ ] Filter repository tools to those with valid credentials before search
 *
 * Phase 5 — integration with Agent builder
 *   [ ] Add .toolSearch(processor) method to Agent builder
 *   [ ] Wire processor into the agent runtime input pipeline
 */

import { z } from 'zod';

import type { BuiltTool } from '../types/sdk/tool';

// ---------------------------------------------------------------------------
// Repository interface
// ---------------------------------------------------------------------------

/**
 * A lightweight descriptor for a tool in the repository.
 * Carries enough information for search ranking and credential filtering
 * without requiring the full BuiltTool to be materialised upfront.
 */
export interface ToolDescriptor {
	/** Unique tool name (matches BuiltTool.name). */
	name: string;
	/** Human-readable description used for keyword ranking. */
	description: string;
	/** Whether the tool's required credentials are currently configured. */
	hasCredentials: boolean;
}

/**
 * Provides the agent with a queryable collection of tools.
 *
 * Implementations are responsible for:
 *   - listing available tool descriptors (with credential status)
 *   - materialising a BuiltTool on demand when load_tool is called
 */
export interface ToolRepository {
	/**
	 * Return all tool descriptors in the repository.
	 * Called once per processor invocation; results may be cached by the caller.
	 */
	listTools(): Promise<ToolDescriptor[]>;

	/**
	 * Materialise and return the full BuiltTool for the given name.
	 * Returns `undefined` if the name is not found.
	 */
	getTool(name: string): Promise<BuiltTool | undefined>;
}

// ---------------------------------------------------------------------------
// Search result type
// ---------------------------------------------------------------------------

/** A single result entry returned by the search_tools meta-tool. */
export interface ToolSearchResult {
	name: string;
	description: string;
	/** Relevance score in the range [0, 1]; higher is more relevant. */
	score: number;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface ToolSearchProcessorConfig {
	/** The tool repository to search and load from. */
	repository: ToolRepository;
	/**
	 * Maximum number of results returned by search_tools.
	 * @default 10
	 */
	maxResults?: number;
	/**
	 * Called immediately after a tool is successfully loaded so the host can
	 * inject it into a live agent instance before the next turn.
	 *
	 * Example — injecting into an Agent:
	 * ```ts
	 * const processor = new ToolSearchProcessor({
	 *   repository: repo,
	 *   onToolLoaded: (tool) => agent.tool(tool),
	 * });
	 * ```
	 */
	onToolLoaded?: (tool: BuiltTool) => void;
}

// ---------------------------------------------------------------------------
// Processor
// ---------------------------------------------------------------------------

/**
 * Injects `search_tools` and `load_tool` meta-tools into the agent's active
 * tool set so the agent can discover and activate tools at runtime.
 *
 * Usage:
 * ```ts
 * const processor = new ToolSearchProcessor({ repository: myRepo });
 * // The two meta-tools are available via processor.metaTools
 * ```
 */
export class ToolSearchProcessor {
	// Stored as a single object so unused-variable lint doesn't fire on stubs.
	private readonly config: Required<Omit<ToolSearchProcessorConfig, 'onToolLoaded'>> &
		Pick<ToolSearchProcessorConfig, 'onToolLoaded'>;

	/**
	 * Tools loaded during the current task, keyed by name.
	 * Cleared when reset() is called between tasks.
	 */
	private readonly loadedTools = new Map<string, BuiltTool>();

	constructor(config: ToolSearchProcessorConfig) {
		this.config = { maxResults: 10, onToolLoaded: undefined, ...config };
	}

	// -------------------------------------------------------------------------
	// Meta-tools
	// -------------------------------------------------------------------------

	/** The two meta-tools to inject into the agent's tool set. */
	get metaTools(): [BuiltTool, BuiltTool] {
		return [this.buildSearchTool(), this.buildLoadTool()];
	}

	/**
	 * Build the `search_tools` meta-tool.
	 *
	 * Accepts a keyword query and returns a ranked list of matching tools
	 * from the repository. Only tools with configured credentials are included.
	 */
	private buildSearchTool(): BuiltTool {
		return {
			name: 'search_tools',
			description:
				'Search the tool repository by keyword. Returns a ranked list of matching tools ' +
				'with their names and descriptions. Only tools with configured credentials are shown.',
			inputSchema: z.object({
				query: z.string().describe('Keyword(s) to search for in tool names and descriptions.'),
			}),
			outputSchema: z.object({
				results: z
					.array(
						z.object({
							name: z.string(),
							description: z.string(),
							score: z.number(),
						}),
					)
					.describe('Tools ranked by relevance, highest score first.'),
			}),
			handler: async (input) => {
				const { query } = input as { query: string };
				return await this.searchTools(query);
			},
		};
	}

	/**
	 * Build the `load_tool` meta-tool.
	 *
	 * Activates a tool by name, making it available on the next agent turn.
	 * Rejects if the tool is not found, lacks credentials, or is already loaded.
	 */
	private buildLoadTool(): BuiltTool {
		return {
			name: 'load_tool',
			description:
				'Activate a tool discovered via search_tools. ' +
				'The tool will be available for use on the next agent turn.',
			inputSchema: z.object({
				name: z.string().describe('Exact tool name returned by search_tools.'),
			}),
			outputSchema: z.object({
				success: z.boolean(),
				message: z.string(),
			}),
			handler: async (input) => {
				const { name } = input as { name: string };
				return await this.loadTool(name);
			},
		};
	}

	// -------------------------------------------------------------------------
	// Core logic
	// -------------------------------------------------------------------------

	/**
	 * Score a tool descriptor against a set of query tokens.
	 *
	 * Builds a searchable corpus from the tool name and description, then counts
	 * how many query tokens appear in it (substring match, case-insensitive).
	 * Name matches are double-weighted to favour tools whose name contains the
	 * query term directly.
	 *
	 * Returns a score in [0, 1] where 1 means every token matched in both fields.
	 */
	private scoreDescriptor(descriptor: ToolDescriptor, tokens: string[]): number {
		if (tokens.length === 0) return 0;

		const nameLower = descriptor.name.toLowerCase();
		const descLower = descriptor.description.toLowerCase();

		let matched = 0;
		for (const token of tokens) {
			const inName = nameLower.includes(token);
			const inDesc = descLower.includes(token);
			// Weight: name match counts double
			if (inName && inDesc) matched += 3;
			else if (inName) matched += 2;
			else if (inDesc) matched += 1;
		}

		// Max possible score per token is 3; normalise to [0, 1]
		return matched / (tokens.length * 3);
	}

	/**
	 * Search the repository for tools matching `query`.
	 *
	 *   1. Tokenise the query (lowercase, split on whitespace).
	 *   2. Filter descriptors to those with hasCredentials === true.
	 *   3. Score each tool and discard zero-score entries.
	 *   4. Sort by score descending, cap at maxResults.
	 */
	private async searchTools(query: string): Promise<{ results: ToolSearchResult[] }> {
		const tokens = query
			.toLowerCase()
			.split(/\s+/)
			.filter((t) => t.length > 0);

		const descriptors = await this.config.repository.listTools();

		const scored = descriptors
			.filter((d) => d.hasCredentials)
			.map((d) => ({ d, score: this.scoreDescriptor(d, tokens) }))
			.filter(({ score }) => score > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, this.config.maxResults);

		return {
			results: scored.map(({ d, score }) => ({
				name: d.name,
				description: d.description,
				score,
			})),
		};
	}

	/**
	 * Load a tool from the repository into the active tool set.
	 *
	 *   1. List descriptors; reject if name is not found.
	 *   2. Reject if hasCredentials === false.
	 *   3. Reject if already present in loadedTools (duplicate guard).
	 *   4. Materialise the BuiltTool and add it to loadedTools.
	 */
	private async loadTool(name: string): Promise<{ success: boolean; message: string }> {
		const descriptors = await this.config.repository.listTools();
		const descriptor = descriptors.find((d) => d.name === name);

		if (!descriptor) {
			return { success: false, message: `Tool "${name}" not found in repository.` };
		}

		if (!descriptor.hasCredentials) {
			return {
				success: false,
				message: `Tool "${name}" cannot be loaded: required credentials are not configured.`,
			};
		}

		if (this.loadedTools.has(name)) {
			return {
				success: false,
				message: `Tool "${name}" is already loaded. Use it directly in your next action.`,
			};
		}

		const tool = await this.config.repository.getTool(name);
		if (!tool) {
			return { success: false, message: `Tool "${name}" could not be materialised.` };
		}

		this.loadedTools.set(name, tool);
		this.config.onToolLoaded?.(tool);
		return { success: true, message: `Tool "${name}" is now available for use.` };
	}

	// -------------------------------------------------------------------------
	// Active tool access
	// -------------------------------------------------------------------------

	/**
	 * Returns the tools loaded so far in the current task context.
	 * The agent runtime merges these into its active tool set before each turn.
	 */
	getLoadedTools(): BuiltTool[] {
		return Array.from(this.loadedTools.values());
	}

	/**
	 * Clear the loaded tool set.
	 * Call this between tasks to prevent tool leakage across independent runs.
	 */
	reset(): void {
		this.loadedTools.clear();
	}
}
