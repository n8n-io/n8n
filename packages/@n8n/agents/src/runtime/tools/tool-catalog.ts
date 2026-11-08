import { zodSchemaToJsonSchema } from '@n8n/ai-utilities/json-schema';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

import { isZodSchema } from '../../utils/zod';
import type { BuiltTool } from '../../types/sdk/tool';
import { callAction } from './tool-adapter';
import { filterTools, rankTools } from './tool-search';

export const FIND_TOOLS_TOOL_NAME = 'find_tools';
export const CALL_TOOL_TOOL_NAME = 'call_tool';

/** Namespace for deferred tools added without one. */
export const DEFAULT_TOOL_NAMESPACE = 'tools';

const DEFAULT_TOP_K = 5;
/** A lookup that returns this many tools or fewer includes their full input schemas. */
const FULL_SCHEMA_LIMIT = 5;
const SUGGESTION_LIMIT = 3;

const findToolsInputSchema = z.object({
	namespace: z.string().optional().describe('A namespace, as the tool catalog lists it'),
	tools: z
		.array(z.string())
		.optional()
		.describe('Tool names to get in full. Name several at once when you will need several.'),
	query: z
		.string()
		.optional()
		.describe('Keywords for what you want to do, matched against names and descriptions'),
	pattern: z
		.string()
		.optional()
		.describe('Regular expression matched against tool names and descriptions'),
});

const callToolInputSchema = z.object({
	tool: z.string().min(1).describe("The tool's name, as the tool catalog lists it"),
	arguments: z
		.record(z.unknown())
		.optional()
		.describe("The tool's input, matching its input schema"),
});

export interface ToolCatalogOptions {
	/** Most tools a `query` returns. */
	topK?: number;
	/** Namespace of each deferred tool by name. Tools not listed use `tools`. */
	namespaces?: Readonly<Record<string, string>>;
	/** Always-available tools, so a lookup for one says to call it directly. */
	activeTools?: BuiltTool[];
}

/** Model tool input arrives as an object or, during repair, as a JSON string. */
function toArguments(input: unknown): Record<string, unknown> {
	if (isRecord(input)) return input;
	if (typeof input !== 'string') return {};
	try {
		const parsed: unknown = JSON.parse(input);
		return isRecord(parsed) ? parsed : {};
	} catch {
		return {};
	}
}

interface CatalogEntry {
	readonly name: string;
	readonly description: string;
	readonly namespace: string;
	readonly tool: BuiltTool;
}

/**
 * Deferred tools as a catalog in the prompt. The system prompt lists every
 * deferred tool name by namespace. The model reads descriptions and schemas
 * with `find_tools` and runs a tool with `call_tool`, without a load step.
 *
 * The toolset sent to the provider never changes, so the tool definitions and
 * system prompt stay cacheable for the whole conversation. `call_tool` is a
 * dispatcher: the runtime validates, approves and runs the named tool as if
 * the model had called it directly.
 */
export class ToolCatalog {
	private readonly entries = new Map<string, CatalogEntry>();

	private readonly currentNameByLegacyName = new Map<string, string>();

	private readonly currentNameByLegacyAction = new Map<string, Map<string, string>>();

	private readonly activeToolNames: Set<string>;

	private readonly topK: number;

	private readonly findTool: BuiltTool;

	private readonly callTool: BuiltTool;

	constructor(tools: BuiltTool[], options: ToolCatalogOptions = {}) {
		for (const tool of tools) {
			if (tool.name === FIND_TOOLS_TOOL_NAME || tool.name === CALL_TOOL_TOOL_NAME) {
				throw new Error(`Deferred tool name "${tool.name}" is reserved`);
			}
			if (this.entries.has(tool.name)) {
				throw new Error(`Duplicate deferred tool name "${tool.name}"`);
			}
			this.entries.set(tool.name, {
				name: tool.name,
				description: tool.description,
				namespace: options.namespaces?.[tool.name] ?? DEFAULT_TOOL_NAMESPACE,
				tool,
			});
		}
		for (const { tool } of this.entries.values()) {
			for (const legacyName of tool.legacyNames ?? []) {
				if (!this.entries.has(legacyName) && !this.currentNameByLegacyName.has(legacyName)) {
					this.currentNameByLegacyName.set(legacyName, tool.name);
				}
			}
			for (const [legacyName, actions] of Object.entries(tool.legacyActions ?? {})) {
				const byAction =
					this.currentNameByLegacyAction.get(legacyName) ?? new Map<string, string>();
				for (const action of actions) if (!byAction.has(action)) byAction.set(action, tool.name);
				this.currentNameByLegacyAction.set(legacyName, byAction);
			}
		}
		this.activeToolNames = new Set((options.activeTools ?? []).map((tool) => tool.name));
		this.topK = options.topK ?? DEFAULT_TOP_K;
		this.findTool = this.createFindTool();
		this.callTool = this.createCallTool();
	}

	get hasTools(): boolean {
		return this.entries.size > 0;
	}

	get totalToolCount(): number {
		return this.entries.size;
	}

	/** `find_tools` and `call_tool`. They are the only tools the catalog adds to the toolset. */
	getControllerTools(): BuiltTool[] {
		return this.hasTools ? [this.findTool, this.callTool] : [];
	}

	/** A deferred tool by name. Resolves legacy names and legacy split tools by `input.action`. */
	getTool(name: string, input?: unknown): BuiltTool | undefined {
		return this.lookup(name, input)?.tool;
	}

	/** The prompt section that lists every deferred tool name by namespace. */
	renderCatalog(): string {
		const byNamespace = new Map<string, string[]>();
		for (const entry of this.entries.values()) {
			const names = byNamespace.get(entry.namespace) ?? [];
			names.push(entry.name);
			byNamespace.set(entry.namespace, names);
		}
		const lines = [...byNamespace.entries()]
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([namespace, names]) => `- ${namespace}: ${names.sort().join(', ')}`);
		return [
			'<tool_catalog>',
			`More tools are available than the toolset shows. Look a tool up with ${FIND_TOOLS_TOOL_NAME} to get its description and input schema, then run it with ${CALL_TOOL_TOOL_NAME}. There is no load step. When you do not know a tool's name, search with a query.`,
			...lines,
			'</tool_catalog>',
		].join('\n');
	}

	private lookup(name: string, input?: unknown): CatalogEntry | undefined {
		const direct = this.entries.get(name);
		if (direct) return direct;
		const action = callAction(input);
		const byAction =
			action === undefined ? undefined : this.currentNameByLegacyAction.get(name)?.get(action);
		return this.entries.get(byAction ?? this.currentNameByLegacyName.get(name) ?? name);
	}

	private createFindTool(): BuiltTool {
		return {
			name: FIND_TOOLS_TOOL_NAME,
			description:
				'Look up tools from the tool catalog: their descriptions and input schemas. Pass tools for named tools, namespace alone to list a namespace, query to search by keywords, or pattern for a regular expression. A lookup that returns 5 tools or fewer includes their full schemas.',
			inputSchema: findToolsInputSchema,
			systemInstruction: this.renderCatalog(),
			handler: async (input) => await Promise.resolve(this.find(findToolsInputSchema.parse(input))),
		};
	}

	private createCallTool(): BuiltTool {
		return {
			name: CALL_TOOL_TOOL_NAME,
			description:
				'Run a tool from the tool catalog. Get its input schema with find_tools first, and pass its input as arguments.',
			inputSchema: callToolInputSchema,
			dispatch: {
				resolve: (input) => {
					const parsed = callToolInputSchema.safeParse(input);
					if (!parsed.success) return undefined;
					const args = parsed.data.arguments ?? {};
					const entry = this.lookup(parsed.data.tool, args);
					return entry ? { tool: entry.tool, input: args } : undefined;
				},
				wrap: (toolName, input) => {
					const entry = this.lookup(toolName, input);
					if (!entry) return undefined;
					return { tool: entry.name, arguments: toArguments(input) };
				},
			},
			// Runs only when `dispatch.resolve` finds no tool: report it with suggestions.
			handler: async (input) => {
				const { tool } = callToolInputSchema.parse(input);
				return await Promise.resolve(this.unknownToolResult(tool));
			},
		};
	}

	private find(input: z.infer<typeof findToolsInputSchema>) {
		const inNamespace = [...this.entries.values()].filter(
			(entry) => input.namespace === undefined || entry.namespace === input.namespace,
		);
		if (input.namespace !== undefined && inNamespace.length === 0) {
			return {
				error: `Unknown namespace "${input.namespace}".`,
				namespaces: [...new Set([...this.entries.values()].map((entry) => entry.namespace))],
			};
		}

		if (input.tools && input.tools.length > 0) {
			const found: CatalogEntry[] = [];
			const missing: Array<{ name: string; didYouMean?: string[]; note?: string }> = [];
			for (const name of input.tools) {
				const entry = this.lookup(name);
				if (entry) found.push(entry);
				else if (this.activeToolNames.has(name))
					missing.push({ name, note: 'Already in your toolset. Call it directly.' });
				else missing.push({ name, didYouMean: this.suggest(name) });
			}
			return { tools: found.map((entry) => this.describe(entry, true)), missing };
		}

		let matches: CatalogEntry[];
		try {
			matches =
				input.pattern !== undefined
					? filterTools(inNamespace, input.pattern)
					: input.query !== undefined
						? rankTools(inNamespace, input.query).slice(0, this.topK)
						: inNamespace;
		} catch (error) {
			return { error: error instanceof Error ? error.message : String(error) };
		}
		const full = matches.length <= FULL_SCHEMA_LIMIT;
		return {
			tools: matches.map((entry) => this.describe(entry, full)),
			...(matches.length === 0 ? { note: 'No tools matched. Try other keywords.' } : {}),
		};
	}

	private unknownToolResult(name: string) {
		if (this.activeToolNames.has(name)) {
			return { error: `"${name}" is already in your toolset. Call it directly.` };
		}
		return {
			error: `Tool "${name}" is not in the tool catalog.`,
			didYouMean: this.suggest(name),
		};
	}

	/** Close names for a name that was not found: keyword matches first, then shared prefixes. */
	private suggest(name: string): string[] {
		const all = [...this.entries.values()];
		const ranked = rankTools(all, name).map((entry) => entry.name);
		const prefix = name.toLowerCase().slice(0, 4);
		const byPrefix = all
			.filter((entry) => prefix.length > 0 && entry.name.toLowerCase().startsWith(prefix))
			.map((entry) => entry.name);
		return [...new Set([...ranked, ...byPrefix])].slice(0, SUGGESTION_LIMIT);
	}

	/** Name and input schema of each named tool that is in the catalog, in the given order. */
	schemasFor(names: readonly string[]): Array<{ name: string; inputSchema: unknown }> {
		return names.flatMap((name) => {
			const entry = this.entries.get(name);
			const schema = entry?.tool.inputSchema;
			if (!entry || !schema) return [];
			return [
				{
					name: entry.name,
					inputSchema: isZodSchema(schema) ? zodSchemaToJsonSchema(schema) : schema,
				},
			];
		});
	}

	private describe(entry: CatalogEntry, withSchema: boolean) {
		const schema = entry.tool.inputSchema;
		return {
			name: entry.name,
			namespace: entry.namespace,
			description: entry.description,
			...(withSchema && schema
				? { inputSchema: isZodSchema(schema) ? zodSchemaToJsonSchema(schema) : schema }
				: {}),
			...(entry.tool.approval?.required ? { needsApproval: true } : {}),
		};
	}
}
