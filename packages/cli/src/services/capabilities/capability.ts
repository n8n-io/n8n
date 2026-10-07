import type { CallToolResult } from '@modelcontextprotocol/server';
import { hasMcpMediaContent, mcpContentToModelParts, Tool, type BuiltTool } from '@n8n/agents';
import type { McpScope } from '@n8n/api-types';
import type { User } from '@n8n/db';
import type { InstanceAiCapabilityTool } from '@n8n/instance-ai';
import { isRecord } from '@n8n/utils/is-record';
import { jsonParse, UnexpectedError, UserError } from 'n8n-workflow';
import z from 'zod';

import type { RegisterToolFn, ToolDefinition } from '@/modules/mcp/mcp.types';

/** Where a capability is offered: to external MCP clients, to the n8n Assistant, or to both. */
export type CapabilitySurface = 'mcp' | 'assistant';

export const DEFAULT_CAPABILITY_SURFACES: readonly CapabilitySurface[] = ['mcp', 'assistant'];

/** What a surface knows about the request. The tool acts as this user. */
export type CapabilityRequest = { user: User };

/**
 * The request that a capability runs in. A capability reads `surface` to apply rules of one
 * surface only, for example the `availableInMCP` check for MCP clients.
 */
export type CapabilityContext = CapabilityRequest & { surface: CapabilitySurface };

/** Runs one tool call for a surface, for example to record it in the audit log. */
export type CapabilityCallRunner = (
	toolName: string,
	args: unknown,
	invoke: () => Promise<CallToolResult>,
) => Promise<CallToolResult>;

export type AssistantToolRequest = CapabilityRequest & { runCall?: CapabilityCallRunner };

/** A tool definition with an input shape, so that every surface validates input the same way. */
export type CapabilityToolDefinition<S extends z.ZodRawShape> = ToolDefinition<S> & {
	config: { inputSchema: S };
};

/** An AI capability that is written once and offered on each of its surfaces. */
export type Capability = {
	readonly name: string;
	/** An OAuth token must hold this scope before the MCP server offers the capability. */
	readonly scope: McpScope;
	readonly surfaces: readonly CapabilitySurface[];
	/** Registers the tool on an MCP server for one user request. */
	registerOn(register: RegisterToolFn, request: CapabilityRequest): void;
	/** Builds the tool of the n8n Assistant for one user request. */
	toAssistantTool(request: AssistantToolRequest): InstanceAiCapabilityTool;
};

export type CapabilityInput<S extends z.ZodRawShape> = {
	/** The tool name on every surface. It must be unique across capabilities and MCP tools. */
	name: string;
	scope: McpScope;
	/** Defaults to every surface. */
	surfaces?: readonly CapabilitySurface[];
	assistant?: {
		/** Keeps the tool in the core tool set of the n8n Assistant, not in tool search. */
		alwaysLoaded?: boolean;
	};
	/** Builds the tool for each request, so that the handler acts as the acting user. */
	build: (context: CapabilityContext) => CapabilityToolDefinition<S>;
};

// n8n MCP tools use snake_case names. Some clients accept tool names of up to 64 characters only.
const CAPABILITY_NAME_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;

function assertValidInput(name: string, surfaces: readonly CapabilitySurface[]): void {
	if (!CAPABILITY_NAME_PATTERN.test(name)) {
		throw new UnexpectedError(`Capability name "${name}" must be snake_case, up to 64 characters`);
	}
	if (surfaces.length === 0) {
		throw new UnexpectedError(`Capability "${name}" must have at least one surface`);
	}
}

const runDirectly: CapabilityCallRunner = async (_toolName, _args, invoke) => await invoke();

function textOf(result: CallToolResult): string {
	return result.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('\n');
}

/** Maps an MCP result to the output of an Assistant tool. A failed call becomes a tool error. */
function toAssistantOutput(result: CallToolResult): unknown {
	if (result.isError === true) {
		throw new UserError(textOf(result) || 'The tool failed without an error message');
	}
	// Images and files keep the MCP shape, so that `toModelOutput` can give them to the model.
	if (hasMcpMediaContent(result.content)) return result;
	if (result.structuredContent !== undefined) return result.structuredContent;
	const text = textOf(result);
	return jsonParse<unknown>(text, { fallbackValue: text });
}

function hasMediaContent(output: unknown): output is Pick<CallToolResult, 'content'> {
	return isRecord(output) && Array.isArray(output.content) && hasMcpMediaContent(output.content);
}

function toModelOutput(output: unknown): unknown {
	if (!hasMediaContent(output)) return output;
	return { type: 'content', value: mcpContentToModelParts(output.content) };
}

function describeIssues(error: z.ZodError): string {
	return error.issues
		.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`)
		.join('; ');
}

/** Builds an Assistant tool from the same definition that the MCP server registers. */
function buildAssistantTool<S extends z.ZodRawShape>(
	definition: CapabilityToolDefinition<S>,
	runCall: CapabilityCallRunner,
): BuiltTool {
	const inputSchema = z.object(definition.config.inputSchema);
	const tool = new Tool(definition.name)
		.description(definition.config.description ?? definition.name)
		.input(inputSchema)
		.handler(async (input, ctx) => {
			// The runtime also validates. This check keeps direct calls to the same rules as MCP.
			const parsed = inputSchema.safeParse(input);
			if (!parsed.success) {
				throw new UserError(
					`Invalid input for ${definition.name}: ${describeIssues(parsed.error)}`,
				);
			}
			const extra = { mcpReq: { _meta: {}, signal: ctx.abortSignal } };
			const result = await runCall(
				definition.name,
				parsed.data,
				async () => await definition.handler(parsed.data, extra),
			);
			return toAssistantOutput(result);
		})
		.toModelOutput(toModelOutput)
		.build();

	const annotations = definition.config.annotations;
	return annotations ? { ...tool, mcpAnnotations: annotations } : tool;
}

/**
 * Defines a capability from an MCP tool definition. The shape type `S` stays inside this
 * closure, so that each surface receives a fully typed tool without a cast.
 */
export function defineCapability<S extends z.ZodRawShape>(input: CapabilityInput<S>): Capability {
	const surfaces: readonly CapabilitySurface[] = [
		...new Set(input.surfaces ?? DEFAULT_CAPABILITY_SURFACES),
	];
	assertValidInput(input.name, surfaces);

	// The capability name wins, so the name the registry checks is the name that clients see.
	const buildTool = (context: CapabilityContext): CapabilityToolDefinition<S> => ({
		...input.build(context),
		name: input.name,
	});

	return {
		name: input.name,
		scope: input.scope,
		surfaces,
		registerOn(register, request) {
			register(buildTool({ ...request, surface: 'mcp' }));
		},
		toAssistantTool({ runCall = runDirectly, ...request }) {
			if (!surfaces.includes('assistant')) {
				throw new UnexpectedError(`Capability "${input.name}" is not offered to the n8n Assistant`);
			}
			const definition = buildTool({ ...request, surface: 'assistant' });
			return {
				tool: buildAssistantTool(definition, runCall),
				alwaysLoaded: input.assistant?.alwaysLoaded ?? false,
			};
		},
	};
}
