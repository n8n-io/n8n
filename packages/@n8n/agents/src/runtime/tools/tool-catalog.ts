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

/**
 * Fixed rules for the catalog. They go into the system prompt and do not name
 * any tool, so connecting or disconnecting a server never changes the prompt.
 */
export const TOOL_CATALOG_GUIDANCE = [
	'<tool_catalog_rules>',
	'Most of your tools are not in your toolset. The "Tool catalog" section in the conversation lists them by namespace, with their names only, not their arguments. When that section changes, a newer one replaces it.',
	`- To use one, get its input schema with ${FIND_TOOLS_TOOL_NAME}, then run it with ${CALL_TOOL_TOOL_NAME}. Do this even when you know the name, and even when a skill names the tool.`,
	`- Skills and instructions often name a catalog tool directly, such as "call \`some_tool\` with the IDs". Read that as ${CALL_TOOL_TOOL_NAME} with tool "some_tool" and those arguments. Never emit a tool call whose name is a catalog tool.`,
	`- Look up every tool the task will need in one ${FIND_TOOLS_TOOL_NAME} call at the start, not one at a time as each step comes up. You can make this call in the same response as other calls that do not need its result.`,
	"- When you do not know a tool's name, search by query or list a namespace.",
	'</tool_catalog_rules>',
].join('\n');

const findToolsInputSchema = z.object({
	namespace: z.string().optional().describe('A namespace, as the tool catalog lists it'),
	tools: z
		.array(z.string())
		.optional()
		.describe(
			'Tool names to get in full, with their input schemas. Name every tool you will need in one lookup.',
		),
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
		.describe(
			"The tool's input as an object that matches its input schema. Pass arrays and objects as JSON values, not as strings.",
		),
});

export interface ToolCatalogOptions {
	/** Most tools a `query` returns. */
	topK?: number;
	/** Namespace of each deferred tool by name. Tools not listed use `tools`. */
	namespaces?: Readonly<Record<string, string>>;
	/** One line on what each namespace holds, by namespace. */
	namespaceDescriptions?: Readonly<Record<string, string>>;
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
 * Deferred tools as a catalog. The system prompt holds only the fixed rules
 * (`TOOL_CATALOG_GUIDANCE`). The runtime adds the list of tool names by
 * namespace to the conversation as a context message, and adds a new one when
 * the list changes. The model reads descriptions and schemas with `find_tools`
 * and runs a tool with `call_tool`, without a load step.
 *
 * The toolset sent to the provider and the system prompt do not depend on
 * which tools are deferred, so they stay cacheable across users and servers. `call_tool` is a
 * dispatcher: the runtime validates, approves and runs the named tool as if
 * the model had called it directly.
 */
export class ToolCatalog {
	private readonly entries = new Map<string, CatalogEntry>();

	private readonly currentNameByLegacyName = new Map<string, string>();

	private readonly currentNameByLegacyAction = new Map<string, Map<string, string>>();

	private readonly activeToolNames: Set<string>;

	private readonly topK: number;

	private readonly namespaceDescriptions: Readonly<Record<string, string>>;

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
		this.namespaceDescriptions = options.namespaceDescriptions ?? {};
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

	/** One line for each namespace: `- <name> (<summary>): tool1, tool2`. Names only. */
	renderCatalog(): string {
		const byNamespace = new Map<string, string[]>();
		for (const entry of this.entries.values()) {
			const names = byNamespace.get(entry.namespace) ?? [];
			names.push(entry.name);
			byNamespace.set(entry.namespace, names);
		}
		const lines = [...byNamespace.entries()]
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([namespace, names]) => {
				const description = this.namespaceDescriptions[namespace];
				const label = description ? `${namespace} (${description})` : namespace;
				return `- ${label}: ${names.sort().join(', ')}`;
			});
		return lines.join('\n');
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
			description: [
				'Look up tools from the tool catalog: their descriptions and input schemas. Look a tool up before you call it with call_tool. Look up several in one call when you will need several.',
				'- tools: the full description and input schema of each named tool.',
				'- namespace alone: every tool in that namespace, briefly.',
				'- query, optionally with namespace: the tools that best match the keywords, best first.',
				'- pattern, optionally with namespace: tools whose name or description matches the regular expression.',
				`A lookup that returns ${FULL_SCHEMA_LIMIT} tools or fewer includes their full schemas.`,
			].join('\n'),
			inputSchema: findToolsInputSchema,
			systemInstruction: TOOL_CATALOG_GUIDANCE,
			handler: async (input) => await Promise.resolve(this.find(findToolsInputSchema.parse(input))),
		};
	}

	private createCallTool(): BuiltTool {
		return {
			name: CALL_TOOL_TOOL_NAME,
			description:
				'Run a tool from the tool catalog. Get its input schema with find_tools first. Pass its input as arguments, with the argument names and types the schema gives.',
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
