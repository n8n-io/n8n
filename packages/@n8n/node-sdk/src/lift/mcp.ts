/**
 * MCP lift: one derived manifest per tool of an MCP server. The tool's JSON Schema is the input,
 * its annotations set the flow, and `run` calls the tool through the host's MCP client. The
 * output is typed only when the tool declares an `outputSchema`.
 */
import { isRecord } from '@n8n/utils/is-record';
import { OperationalError } from 'n8n-workflow';

import {
	defineNode,
	toContract,
	type Action,
	type ActionFlow,
	type DerivedManifest,
	type NodeDefinition,
} from '../define';
import { Schema, t, type JsonSchema, type Shape } from '../schema';

/**
 * A tool as the MCP `tools/list` result lists it.
 *
 * @see https://modelcontextprotocol.io/specification/2025-06-18/server/tools
 */
export interface McpTool {
	/** The tool name. The operation of the action comes from it. */
	readonly name: string;
	/** The display name. The action label when set. */
	readonly title?: string;
	/** What the tool does. The summary comes from it. */
	readonly description?: string;
	/** The JSON Schema of the tool arguments. */
	readonly inputSchema: JsonSchema;
	/** The JSON Schema of `structuredContent`. Without it, the output is any JSON object. */
	readonly outputSchema?: JsonSchema;
	/** Hints about the behavior of the tool. `readOnlyHint` and `idempotentHint` set the flow. */
	readonly annotations?: {
		/** The tool does not change its environment. */
		readonly readOnlyHint?: boolean;
		/** A repeated call with the same arguments has no extra effect. */
		readonly idempotentHint?: boolean;
		/** The tool may delete or overwrite data. The lift does not read it. */
		readonly destructiveHint?: boolean;
	};
}

/**
 * The `tools/call` result.
 *
 * @see https://modelcontextprotocol.io/specification/2025-06-18/server/tools
 */
export interface McpCallResult {
	/** The unstructured result, e.g. text blocks. */
	readonly content?: ReadonlyArray<{
		/** The block type, e.g. `text`. */
		readonly type: string;
		/** The text of a `text` block. */
		readonly text?: string;
	}>;
	/** The structured result. It is the output item when set. */
	readonly structuredContent?: Readonly<Record<string, unknown>>;
	/** True when the tool call failed. */
	readonly isError?: boolean;
}

/** What the lift needs of an MCP client, e.g. the `Client` of `@modelcontextprotocol/sdk`. */
export interface McpClient {
	/** Sends `tools/call`. */
	callTool(request: {
		/** The tool name. */
		readonly name: string;
		/** The tool arguments: the input of the item. */
		readonly arguments: Record<string, unknown>;
	}): Promise<McpCallResult>;
}

/** What `liftMcpTool` gives: the action, its derived manifest, and what it could not check. */
export interface LiftedMcpTool {
	/** The action that calls the tool for each item. */
	readonly action: Action;
	/** The derived manifest of the action. */
	readonly contract: DerivedManifest;
	/**
	 * Each `$ref` that the lift could not inline and opened to any value, e.g.
	 * `input.properties.parent.$ref: not inlined (recursive)`.
	 */
	readonly issues: readonly string[];
}

/** The keywords that hold what a local `$ref` points to. */
const DEFINITIONS = new Set(['$defs', 'definitions']);

/** Keywords whose value is data, not a schema. */
const DATA = new Set(['const', 'enum', 'default', 'examples']);

/** A ref into the definitions of the tool schema, e.g. `#/$defs/parent`. */
const DEFINITION_REF = /^#\/(\$defs|definitions)\/([^/]+)$/;

/** The most refs that the lift inlines into one schema: refs can repeat a definition many times. */
const MAX_INLINED = 1_000;

const isSchemaObject = (value: unknown): value is JsonSchema => isRecord(value);

/** The definition that a ref names, e.g. `#/$defs/parent`, if it is an object. */
function definitionOf(root: unknown, ref: string): Record<string, unknown> | undefined {
	const [, keyword = '', pointer = ''] = DEFINITION_REF.exec(ref) ?? [];
	// A JSON Pointer token in a URI fragment (RFC 6901). `decodeURIComponent` throws on a bad escape.
	if (/%(?![0-9a-fA-F]{2})/.test(pointer)) return undefined;
	const name = decodeURIComponent(pointer).replaceAll('~1', '/').replaceAll('~0', '~');
	const definitions = isRecord(root) ? root[keyword] : undefined;
	const definition = isRecord(definitions) ? definitions[name] : undefined;
	return isRecord(definition) ? definition : undefined;
}

interface Inlined {
	readonly schema: unknown;
	readonly issues: readonly string[];
}

/**
 * `schema` with each ref into the definitions of `root` replaced by the definition. The lift
 * cuts the tool schema into fields, so a ref there has no root to point into. A ref that the
 * lift cannot inline (recursive, remote, not found, too many) becomes an open schema and an issue,
 * so a tool with a loose schema still runs.
 */
function inlined(schema: unknown, root: unknown, at: string): Inlined {
	const budget = { left: MAX_INLINED };
	const walk = (node: unknown, path: string, refs: readonly string[]): Inlined => {
		if (Array.isArray(node)) {
			const parts = node.map((item, index) => walk(item, `${path}[${index}]`, refs));
			return {
				schema: parts.map((part) => part.schema),
				issues: parts.flatMap((part) => part.issues),
			};
		}
		if (!isRecord(node)) return { schema: node, issues: [] };
		const ref = typeof node.$ref === 'string' ? node.$ref : undefined;
		const parts = Object.entries(node)
			.filter(([key]) => !DEFINITIONS.has(key) && !(key === '$ref' && ref !== undefined))
			.map(([key, value]): [string, Inlined] => [
				key,
				DATA.has(key) ? { schema: value, issues: [] } : walk(value, `${path}.${key}`, refs),
			]);
		const own = Object.fromEntries(parts.map(([key, part]) => [key, part.schema]));
		const issues = parts.flatMap(([, part]) => part.issues);
		if (ref === undefined) return { schema: own, issues };
		const definition = definitionOf(root, ref);
		const reason = !ref.startsWith('#')
			? 'remote'
			: definition === undefined
				? 'dangling'
				: refs.includes(ref)
					? 'recursive'
					: budget.left <= 0
						? 'too many refs'
						: undefined;
		if (reason !== undefined || definition === undefined) {
			return { schema: own, issues: [`${path}.$ref: not inlined (${reason})`, ...issues] };
		}
		budget.left -= 1;
		const target = walk(definition, path, [...refs, ref]);
		return {
			schema: isRecord(target.schema) ? { ...target.schema, ...own } : own,
			issues: [...target.issues, ...issues],
		};
	};
	return walk(schema, at, []);
}

/** `search-pages` and `search_pages` → `searchPages`. */
const operationOf = (name: string) =>
	name.replace(/[-_ ]+([a-zA-Z0-9])/g, (_, char: string) => char.toUpperCase());

const SUMMARY_MAX = 120;

const summaryOf = (tool: McpTool) => {
	const text = (tool.description ?? tool.title ?? tool.name).split('\n')[0]?.trim() ?? tool.name;
	return text.length <= SUMMARY_MAX ? text : `${text.slice(0, SUMMARY_MAX - 1)}…`;
};

/** Read-only tools read; any other tool may write. A tool is idempotent only when it says so. */
const flowOf = ({ annotations = {} }: McpTool): ActionFlow => ({
	effect: annotations.readOnlyHint === true ? 'read' : 'write',
	cardinality: 'per-item',
	...(annotations.idempotentHint === true || annotations.readOnlyHint === true
		? { idempotent: true }
		: {}),
});

/** Each top-level property of the tool input as a field, with its refs inlined. */
function inputOf({ inputSchema }: McpTool): { shape: Shape; issues: readonly string[] } {
	const required = new Set(inputSchema.required ?? []);
	const fields = Object.entries(inputSchema.properties ?? {}).map(([name, schema]) => ({
		name,
		...inlined(schema, inputSchema, `input.properties.${name}`),
	}));
	return {
		// A boolean field schema (`true`) takes any value.
		shape: Object.fromEntries(
			fields.map(({ name, schema }) => [
				name,
				new Schema<unknown, boolean>(isSchemaObject(schema) ? schema : {}, !required.has(name)),
			]),
		),
		issues: fields.flatMap(({ issues }) => issues),
	};
}

/** The tool output, with its refs inlined, or `undefined` when the tool declares none. */
function outputOf({ outputSchema }: McpTool): Inlined | undefined {
	return outputSchema ? inlined(outputSchema, outputSchema, 'output') : undefined;
}

/** The item of a call: the structured content, else the text parts joined. */
function itemOf(tool: McpTool, result: McpCallResult): Record<string, unknown> {
	const text = (result.content ?? []).flatMap((part) => (part.text ? [part.text] : [])).join('\n');
	if (result.isError) throw new OperationalError(`MCP tool ${tool.name} failed: ${text}`);
	return result.structuredContent ? { ...result.structuredContent } : { text };
}

/**
 * The partial contract and the action of one MCP tool on `node`. The action calls the tool with
 * the item's input; the host owns the client and its transport.
 */
export function liftMcpTool(
	node: NodeDefinition,
	tool: McpTool,
	client: McpClient,
	options: {
		/** The resource of the node that the action goes on. */
		readonly resource?: string;
		/** The scopes of the node credential that the action needs. */
		readonly scopes?: readonly string[];
	} = {},
): LiftedMcpTool {
	const builder = defineNode(node);
	const target = options.resource === undefined ? builder : builder.resource(options.resource);
	const input = inputOf(tool);
	const declared = outputOf(tool);
	const output =
		declared && isSchemaObject(declared.schema)
			? new Schema<Record<string, unknown>>(declared.schema, false)
			: t.json();
	const lifted = target.action(operationOf(tool.name), {
		action: tool.title ?? tool.name,
		summary: summaryOf(tool),
		flow: flowOf(tool),
		...(options.scopes ? { scopes: options.scopes } : {}),
		input: input.shape,
		output,
		async run({ input }) {
			return itemOf(tool, await client.callTool({ name: tool.name, arguments: { ...input } }));
		},
	});
	const action: Action = lifted;
	return {
		action,
		contract: {
			...toContract(action),
			derived: true,
			semver: `${action.version}.0.0`,
			outputClaim: tool.outputSchema ? 'inferred' : 'unknown',
		},
		issues: [...input.issues, ...(declared?.issues ?? [])],
	};
}
