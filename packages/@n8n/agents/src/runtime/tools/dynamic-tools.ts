import { zodSchemaToJsonSchema } from '@n8n/ai-utilities/json-schema';
import type { JSONSchema7 } from 'json-schema';
import { z } from 'zod';

import { wrapToolForApproval } from '../../sdk/tool';
import type {
	DynamicToolNamespace,
	DynamicToolNamespaceStatus,
	DynamicToolPermission,
	DynamicToolsConfig,
} from '../../types/sdk/dynamic-tools';
import type { BuiltTool } from '../../types/sdk/tool';
import type { JSONObject } from '../../types/utils/json';
import { isZodSchema } from '../../utils/zod';

export const GET_TOOLS_TOOL_NAME = 'get_tools';
export const CALL_TOOL_TOOL_NAME = 'call_tool';
export const DYNAMIC_TOOL_CONTROLLER_NAMES = [GET_TOOLS_TOOL_NAME, CALL_TOOL_TOOL_NAME] as const;

const DEFAULT_DESCRIPTION_TOKEN_BUDGET = 8000;
const DEFAULT_SEARCH_LIMIT = 10;
/** Rough chars-per-token ratio. Precise counts are not needed for a budget. */
const CHARS_PER_TOKEN = 4;

const getToolsInputSchema = z.object({
	namespace: z.string().min(1).describe('Namespace name from the dynamic tool catalog'),
	tools: z
		.array(z.string().min(1))
		.optional()
		.describe('Tool names to get. Omit to get every tool in the namespace'),
	query: z
		.string()
		.optional()
		.describe('Keywords to find tools in the namespace when you do not know the exact name'),
});

const callToolInputSchema = z.object({
	namespace: z.string().min(1).describe('Namespace name from the dynamic tool catalog'),
	tool: z.string().min(1).describe('Exact tool name in that namespace'),
	arguments: z
		.record(z.unknown())
		.default({})
		.describe('Arguments that match the input schema returned by get_tools'),
	summary: z
		.string()
		.optional()
		.describe('One plain-language sentence that says what this call does, shown to the user'),
});

export type CallToolInput = z.infer<typeof callToolInputSchema>;

interface RegisteredTool {
	namespace: string;
	tool: BuiltTool;
}

interface RegisteredNamespace {
	name: string;
	description?: string;
	instructions?: string;
	status: DynamicToolNamespaceStatus;
	tools: Map<string, BuiltTool>;
}

/** The result of resolving a `call_tool` call to the real tool. */
export type DynamicCallResolution =
	| { ok: true; toolName: string; input: JSONObject }
	| { ok: false; error: string };

function toInputJsonSchema(tool: BuiltTool): JSONSchema7 {
	if (!tool.inputSchema) return { type: 'object', properties: {} };
	return isZodSchema(tool.inputSchema) ? zodSchemaToJsonSchema(tool.inputSchema) : tool.inputSchema;
}

function firstLine(text: string | undefined): string {
	return (text ?? '').split('\n')[0].trim();
}

function scoreTool(tool: BuiltTool, query: string): number {
	const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
	const name = tool.name.toLowerCase();
	const description = tool.description.toLowerCase();
	let score = 0;
	for (const token of tokens) {
		if (name.includes(token)) score += 10;
		if (description.includes(token)) score += 3;
	}
	return score;
}

function applyPermission(tool: BuiltTool, permission: DynamicToolPermission): BuiltTool {
	// Tools that already suspend or ask for approval keep their own gate.
	if (permission !== 'ask' || tool.approval || tool.suspendSchema) return tool;
	return wrapToolForApproval(tool, { requireApproval: true });
}

/**
 * Holds the tools that the model reaches through `get_tools` and `call_tool`.
 * The model-facing tool array stays fixed, so the prompt cache stays valid on
 * every provider. Denied tools are not registered, so they are neither listed
 * nor callable.
 */
export class DynamicToolRegistry {
	private readonly namespaces = new Map<string, RegisteredNamespace>();

	private readonly toolsByName = new Map<string, RegisteredTool>();

	private readonly descriptionTokenBudget: number;

	private catalog?: string;

	readonly getToolsTool: BuiltTool;

	readonly callToolTool: BuiltTool;

	constructor(config: DynamicToolsConfig) {
		this.descriptionTokenBudget =
			config.catalogDescriptionTokenBudget ?? DEFAULT_DESCRIPTION_TOKEN_BUDGET;
		for (const namespace of config.namespaces) this.register(namespace);
		this.getToolsTool = this.createGetToolsTool();
		this.callToolTool = this.createCallToolTool();
	}

	get hasNamespaces(): boolean {
		return this.namespaces.size > 0;
	}

	/** The fixed model-facing tools. */
	getControllerTools(): BuiltTool[] {
		return [this.getToolsTool, this.callToolTool];
	}

	/** Every callable dynamic tool, for the runtime tool map. Not sent to the model. */
	getCallableTools(): BuiltTool[] {
		const tools: BuiltTool[] = [];
		for (const namespace of this.namespaces.values()) {
			if (namespace.status !== 'ready') continue;
			tools.push(...namespace.tools.values());
		}
		return tools;
	}

	/** A registered dynamic tool by its real name, or `undefined`. */
	getTool(name: string): BuiltTool | undefined {
		return this.toolsByName.get(name)?.tool;
	}

	/** Resolve a `call_tool` input to the real tool name and its arguments. */
	resolveCall(input: unknown): DynamicCallResolution {
		const parsed = callToolInputSchema.safeParse(input);
		if (!parsed.success) {
			return { ok: false, error: `Invalid call_tool input: ${parsed.error.message}` };
		}
		const { namespace: namespaceName, tool: toolName, arguments: args } = parsed.data;
		const namespace = this.namespaces.get(namespaceName);
		if (!namespace) {
			return {
				ok: false,
				error: `Namespace "${namespaceName}" does not exist. Use a namespace from the dynamic tool catalog.`,
			};
		}
		if (namespace.status !== 'ready') {
			return { ok: false, error: this.unavailableMessage(namespace) };
		}
		const tool = namespace.tools.get(toolName);
		if (!tool) {
			return {
				ok: false,
				error: `Tool "${toolName}" does not exist in namespace "${namespaceName}". Available tools: ${[...namespace.tools.keys()].join(', ')}.`,
			};
		}
		return { ok: true, toolName: tool.name, input: args as JSONObject };
	}

	/** The input schema text appended to argument errors, so the model can retry. */
	describeInputSchema(name: string): string | undefined {
		const registered = this.toolsByName.get(name);
		if (!registered) return undefined;
		return JSON.stringify(toInputJsonSchema(registered.tool));
	}

	/** The catalog text for the cached prompt prefix. Stable for the registry's life. */
	renderCatalog(): string {
		this.catalog ??= this.buildCatalog();
		return this.catalog;
	}

	private buildCatalog(): string {
		if (!this.hasNamespaces) return '';
		let remainingChars = this.descriptionTokenBudget * CHARS_PER_TOKEN;
		const lines = [
			'<dynamic_tool_catalog>',
			`More tools are available in the namespaces below. They are not in your tool list. Call \`${GET_TOOLS_TOOL_NAME}\` to read a tool's input schema, then call \`${CALL_TOOL_TOOL_NAME}\` with the namespace, the tool name and arguments that match the schema. Read the schema before the first call to a tool.`,
		];
		for (const namespace of this.namespaces.values()) {
			lines.push('', `<namespace name="${namespace.name}" status="${namespace.status}">`);
			if (namespace.description) lines.push(firstLine(namespace.description));
			if (namespace.instructions) lines.push(namespace.instructions.trim());
			if (namespace.status !== 'ready') {
				lines.push(this.unavailableMessage(namespace));
			} else {
				// A compact index first, so the model sees every name even when the list below is long.
				lines.push(`Tools: ${[...namespace.tools.keys()].join(', ')}`);
				for (const tool of namespace.tools.values()) {
					const description = firstLine(tool.description);
					const line = `- ${tool.name}: ${description}`;
					if (description && line.length <= remainingChars) {
						remainingChars -= line.length;
						lines.push(line);
					} else {
						lines.push(`- ${tool.name}`);
					}
				}
			}
			lines.push('</namespace>');
		}
		lines.push('</dynamic_tool_catalog>');
		return lines.join('\n');
	}

	private register(config: DynamicToolNamespace): void {
		if (this.namespaces.has(config.name)) {
			throw new Error(`Duplicate dynamic tool namespace "${config.name}"`);
		}
		const namespace: RegisteredNamespace = {
			name: config.name,
			description: config.description,
			instructions: config.instructions,
			status: config.status ?? 'ready',
			tools: new Map(),
		};
		for (const tool of config.tools) {
			if ((DYNAMIC_TOOL_CONTROLLER_NAMES as readonly string[]).includes(tool.name)) {
				throw new Error(`Dynamic tool name "${tool.name}" is reserved`);
			}
			const existing = this.toolsByName.get(tool.name);
			if (existing) {
				throw new Error(
					`Dynamic tool "${tool.name}" is in namespaces "${existing.namespace}" and "${config.name}". Tool names must be unique.`,
				);
			}
			const permission = config.toolPermissions?.[tool.name] ?? config.permission ?? 'allow';
			if (permission === 'deny') continue;
			const registeredTool = applyPermission(tool, permission);
			namespace.tools.set(registeredTool.name, registeredTool);
			this.toolsByName.set(registeredTool.name, { namespace: config.name, tool: registeredTool });
		}
		this.namespaces.set(config.name, namespace);
	}

	private unavailableMessage(namespace: RegisteredNamespace): string {
		return namespace.status === 'needsAuth'
			? `Namespace "${namespace.name}" needs the user to sign in before its tools can be used. Ask the user to connect it.`
			: `Namespace "${namespace.name}" is still loading. Try again later.`;
	}

	private getTools(input: z.infer<typeof getToolsInputSchema>): JSONObject {
		const namespace = this.namespaces.get(input.namespace);
		if (!namespace) {
			return {
				error: `Namespace "${input.namespace}" does not exist.`,
				namespaces: [...this.namespaces.keys()],
			};
		}
		if (namespace.status !== 'ready') {
			return { error: this.unavailableMessage(namespace), status: namespace.status };
		}
		let tools = [...namespace.tools.values()];
		const missing: string[] = [];
		if (input.tools?.length) {
			missing.push(...input.tools.filter((name) => !namespace.tools.has(name)));
			tools = tools.filter((tool) => input.tools?.includes(tool.name));
		} else if (input.query) {
			const query = input.query;
			tools = tools
				.map((tool) => ({ tool, score: scoreTool(tool, query) }))
				.filter(({ score }) => score > 0)
				.sort((a, b) => b.score - a.score)
				.slice(0, DEFAULT_SEARCH_LIMIT)
				.map(({ tool }) => tool);
		}
		const result: JSONObject = {
			namespace: namespace.name,
			tools: tools.map((tool) => ({
				name: tool.name,
				description: tool.description,
				inputSchema: toInputJsonSchema(tool) as JSONObject,
				...(tool.approval ? { requiresApproval: true } : {}),
			})),
		};
		if (missing.length > 0) {
			result.missing = missing;
			result.available = [...namespace.tools.keys()];
		}
		return result;
	}

	private createGetToolsTool(): BuiltTool {
		return {
			name: GET_TOOLS_TOOL_NAME,
			description:
				'Get the description and input schema of tools in a namespace from the dynamic tool catalog. Call this before the first call_tool for a tool.',
			inputSchema: getToolsInputSchema,
			handler: async (input) =>
				await Promise.resolve(this.getTools(getToolsInputSchema.parse(input))),
		};
	}

	private createCallToolTool(): BuiltTool {
		return {
			name: CALL_TOOL_TOOL_NAME,
			description:
				'Call a tool from the dynamic tool catalog. Pass arguments that match the schema from get_tools.',
			inputSchema: callToolInputSchema,
			// The tool executor resolves call_tool to the real tool before
			// execution. This handler runs only when that resolution is skipped.
			handler: async (input) => {
				const resolution = this.resolveCall(input);
				const error = resolution.ok
					? `call_tool could not run "${resolution.toolName}".`
					: resolution.error;
				return await Promise.reject(new Error(error));
			},
		};
	}
}
