/**
 * MCP lift: one derived manifest per tool of an MCP server. The tool's JSON Schema is the input,
 * its annotations set the flow, and `run` calls the tool through the host's MCP client. The
 * output is typed only when the tool declares an `outputSchema`.
 */
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
	/** Schema keywords the validator does not check, e.g. `input.$ref`. */
	readonly issues: readonly string[];
}

const UNCHECKED = ['$ref', 'allOf', 'not', 'if', 'then', 'else', 'dependentSchemas'];

/** Keywords outside the checked subset, by path. */
function uncheckedKeywords(schema: unknown, at: string): string[] {
	if (typeof schema !== 'object' || schema === null) return [];
	return Object.entries(schema).flatMap(([keyword, value]) => [
		...(UNCHECKED.includes(keyword) ? [`${at}.${keyword}`] : []),
		...(typeof value === 'object' ? uncheckedKeywords(value, `${at}.${keyword}`) : []),
	]);
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

/** Each top-level property of the tool input as a field. The JSON Schema stays as it is. */
function inputOf({ inputSchema }: McpTool): Shape {
	const required = new Set(inputSchema.required ?? []);
	return Object.fromEntries(
		Object.entries(inputSchema.properties ?? {}).map(([name, schema]) => [
			name,
			new Schema<unknown, boolean>(schema, !required.has(name)),
		]),
	);
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
	const output = tool.outputSchema
		? new Schema<Record<string, unknown>>(tool.outputSchema, false)
		: t.json();
	const lifted = target.action(operationOf(tool.name), {
		action: tool.title ?? tool.name,
		summary: summaryOf(tool),
		flow: flowOf(tool),
		...(options.scopes ? { scopes: options.scopes } : {}),
		input: inputOf(tool),
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
			semver: action.semver,
			outputClaim: tool.outputSchema ? 'inferred' : 'unknown',
		},
		issues: [
			...uncheckedKeywords(tool.inputSchema, 'input'),
			...uncheckedKeywords(tool.outputSchema, 'output'),
		],
	};
}
