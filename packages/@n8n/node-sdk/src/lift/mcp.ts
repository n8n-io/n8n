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

/** A tool as the MCP `tools/list` result lists it. */
export interface McpTool {
	readonly name: string;
	readonly title?: string;
	readonly description?: string;
	readonly inputSchema: JsonSchema;
	readonly outputSchema?: JsonSchema;
	readonly annotations?: {
		readonly readOnlyHint?: boolean;
		readonly idempotentHint?: boolean;
		readonly destructiveHint?: boolean;
	};
}

/** The `tools/call` result. */
export interface McpCallResult {
	readonly content?: ReadonlyArray<{ readonly type: string; readonly text?: string }>;
	readonly structuredContent?: Readonly<Record<string, unknown>>;
	readonly isError?: boolean;
}

/** What the lift needs of an MCP client, e.g. the `Client` of `@modelcontextprotocol/sdk`. */
export interface McpClient {
	callTool(request: {
		readonly name: string;
		readonly arguments: Record<string, unknown>;
	}): Promise<McpCallResult>;
}

export interface LiftedMcpTool {
	readonly action: Action;
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
	options: { readonly resource?: string; readonly scopes?: readonly string[] } = {},
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
