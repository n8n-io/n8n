import type { McpScope } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { UnexpectedError } from 'n8n-workflow';
import type z from 'zod';

import type { RegisterToolFn, ToolDefinition } from '@/modules/mcp/mcp.types';

/** Where a capability is offered: to external MCP clients, to the n8n Assistant, or to both. */
export type CapabilitySurface = 'mcp' | 'assistant';

export const DEFAULT_CAPABILITY_SURFACES: readonly CapabilitySurface[] = ['mcp', 'assistant'];

/** The request that a capability runs in. The tool acts as this user. */
export type CapabilityContext = { user: User };

/** An AI capability that is written once and offered on each of its surfaces. */
export type Capability = {
	readonly name: string;
	/** An OAuth token must hold this scope before the MCP server offers the capability. */
	readonly scope: McpScope;
	readonly surfaces: readonly CapabilitySurface[];
	/** Registers the tool on an MCP server for one user request. */
	registerOn(register: RegisterToolFn, context: CapabilityContext): void;
};

export type CapabilityInput<S extends z.ZodRawShape> = {
	/** The tool name on every surface. It must be unique across capabilities and MCP tools. */
	name: string;
	scope: McpScope;
	/** Defaults to every surface. */
	surfaces?: readonly CapabilitySurface[];
	/** Builds the tool for each request, so that the handler acts as the acting user. */
	build: (context: CapabilityContext) => ToolDefinition<S>;
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
	const buildTool = (context: CapabilityContext): ToolDefinition<S> => ({
		...input.build(context),
		name: input.name,
	});

	return {
		name: input.name,
		scope: input.scope,
		surfaces,
		registerOn(register, context) {
			register(buildTool(context));
		},
	};
}
