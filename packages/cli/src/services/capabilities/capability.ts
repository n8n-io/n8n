import type { CallToolResult } from '@modelcontextprotocol/server';
import { hasMcpMediaContent, mcpContentToModelParts, Tool, type BuiltTool } from '@n8n/agents';
import type { InstanceAiPermissions, McpScope } from '@n8n/api-types';
import type { User } from '@n8n/db';
import type { InstanceAiCapabilityTool } from '@n8n/instance-ai';
import { isRecord } from '@n8n/utils/is-record';
import { jsonParse, UnexpectedError, UserError } from 'n8n-workflow';
import z from 'zod';

import type { RegisterToolFn, ToolDefinition } from '@/modules/mcp/mcp.types';

import {
	type CapabilityAnswer,
	type CapabilityCard,
	capabilityCardPayloadSchema,
	type ConfirmationOptions,
	DEFAULT_CAPABILITY_ANSWER_SCHEMA,
	resolvePermissionMode,
	runWithConfirmation,
} from './capability-confirmation';

export type { CapabilityAnswer, CapabilityCard } from './capability-confirmation';

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

/** What the n8n Assistant knows about the request: the user and the admin permission modes. */
export type AssistantRequest = CapabilityRequest & { permissions?: InstanceAiPermissions };

export type AssistantToolRequest = AssistantRequest & { runCall?: CapabilityCallRunner };

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

/** The arguments of a capability after input validation. */
export type CapabilityArgs<S extends z.ZodRawShape> = z.objectOutputType<S, z.ZodTypeAny>;

/** How the n8n Assistant offers a capability. MCP clients own consent, so MCP ignores this. */
export type CapabilityAssistantOptions<S extends z.ZodRawShape> = {
	/** Keeps the tool in the core tool set of the n8n Assistant, not in tool search. */
	alwaysLoaded?: boolean;
	/** Returns a card to show before the action, or undefined to act at once. Runs as the acting user. */
	confirm?: (
		args: CapabilityArgs<S>,
		context: CapabilityContext,
	) => Promise<CapabilityCard | undefined>;
	/**
	 * Zod schema of the card answer after normalisation. Default: `{ approved, values? }`.
	 * The bridge checks only `values` against the options that the card offered. Validate
	 * every other answer field here or in `applyAnswer`.
	 */
	answerSchema?: z.ZodType<CapabilityAnswer>;
	/** Merges the answer into the arguments before the handler runs. Default: arguments unchanged. */
	applyAnswer?: (args: CapabilityArgs<S>, answer: CapabilityAnswer) => CapabilityArgs<S>;
	/** The admin permission of the Assistant settings that applies to these arguments. */
	permission?: (args: CapabilityArgs<S>) => keyof InstanceAiPermissions;
};

export type CapabilityInput<S extends z.ZodRawShape> = {
	/** The tool name on every surface. It must be unique across capabilities and MCP tools. */
	name: string;
	scope: McpScope;
	/** Defaults to every surface. */
	surfaces?: readonly CapabilitySurface[];
	assistant?: CapabilityAssistantOptions<S>;
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

type AssistantToolSetup<S extends z.ZodRawShape> = {
	definition: CapabilityToolDefinition<S>;
	runCall: CapabilityCallRunner;
	context: CapabilityContext;
	options?: CapabilityAssistantOptions<S>;
	permissions?: InstanceAiPermissions;
};

/** Runs the handler of a tool with validated arguments. */
type RunTool<S extends z.ZodRawShape> = (args: CapabilityArgs<S>) => Promise<unknown>;

function needsConfirmation<S extends z.ZodRawShape>(options?: CapabilityAssistantOptions<S>) {
	return options?.confirm !== undefined || options?.permission !== undefined;
}

/** The card for `require_approval` when the capability shows no card of its own. */
function defaultCard<S extends z.ZodRawShape>(
	definition: CapabilityToolDefinition<S>,
): CapabilityCard {
	const annotations = definition.config.annotations;
	return {
		message: `Allow the n8n Assistant to run "${annotations?.title ?? definition.name}"?`,
		severity: annotations?.destructiveHint === true ? 'destructive' : 'warning',
	};
}

function confirmationOptions<S extends z.ZodRawShape>(
	setup: AssistantToolSetup<S>,
	parse: (input: unknown) => CapabilityArgs<S>,
	run: RunTool<S>,
): ConfirmationOptions<CapabilityArgs<S>> {
	const { definition, context, permissions, options = {} } = setup;
	const { confirm, permission } = options;
	return {
		parse,
		mode: (args) => resolvePermissionMode(permission?.(args), permissions),
		confirm: confirm ? async (args) => await confirm(args, context) : undefined,
		defaultCard: () => defaultCard(definition),
		answerSchema: options.answerSchema ?? DEFAULT_CAPABILITY_ANSWER_SCHEMA,
		applyAnswer: options.applyAnswer,
		run,
	};
}

/** Builds an Assistant tool from the same definition that the MCP server registers. */
function buildAssistantTool<S extends z.ZodRawShape>(setup: AssistantToolSetup<S>): BuiltTool {
	const { definition, runCall } = setup;
	const inputSchema = z.object(definition.config.inputSchema);
	// The runtime also validates. This check keeps direct calls and applied answers to the
	// same rules as MCP.
	const parseArgs = (input: unknown): CapabilityArgs<S> => {
		const parsed = inputSchema.safeParse(input);
		if (!parsed.success) {
			throw new UserError(`Invalid input for ${definition.name}: ${describeIssues(parsed.error)}`);
		}
		return parsed.data;
	};
	const runWith =
		(signal?: AbortSignal): RunTool<S> =>
		async (args) => {
			const extra = { mcpReq: { _meta: {}, signal } };
			const result = await runCall(
				definition.name,
				args,
				async () => await definition.handler(args, extra),
			);
			return toAssistantOutput(result);
		};

	const builder = new Tool(definition.name)
		.description(definition.config.description ?? definition.name)
		.input(inputSchema)
		.toModelOutput(toModelOutput);
	const tool = needsConfirmation(setup.options)
		? builder
				.suspend(capabilityCardPayloadSchema)
				.resume(setup.options?.answerSchema ?? DEFAULT_CAPABILITY_ANSWER_SCHEMA)
				.handler(
					async (input, ctx) =>
						await runWithConfirmation(
							input,
							ctx,
							confirmationOptions(setup, parseArgs, runWith(ctx.abortSignal)),
						),
				)
				.build()
		: builder
				.handler(async (input, ctx) => await runWith(ctx.abortSignal)(parseArgs(input)))
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
		toAssistantTool({ runCall = runDirectly, permissions, ...request }) {
			if (!surfaces.includes('assistant')) {
				throw new UnexpectedError(`Capability "${input.name}" is not offered to the n8n Assistant`);
			}
			const context: CapabilityContext = { ...request, surface: 'assistant' };
			const definition = buildTool(context);
			const options = input.assistant;
			return {
				tool: buildAssistantTool({ definition, runCall, context, options, permissions }),
				alwaysLoaded: options?.alwaysLoaded ?? false,
			};
		},
	};
}
