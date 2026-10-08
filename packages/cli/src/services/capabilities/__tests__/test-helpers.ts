import { MCP_INSTANCE_SCOPES, type McpScope } from '@n8n/api-types';

import { type CapabilitySurface, defineCapability } from '../capability';
import { CAPABILITY_TOOLS_BY_SCOPE } from '../capability-scopes';

/** A capability with a stub tool, for tests of the registry and of the scope lists. */
export const capabilityNamed = (
	name: string,
	surfaces?: readonly CapabilitySurface[],
	scope: McpScope = 'workflow:read',
) =>
	defineCapability({
		name,
		scope,
		surfaces,
		build: () => ({ name, config: { inputSchema: {} }, handler: () => ({ content: [] }) }),
	});

/** No scope lists this name. Each late write below tries to add it or to remove a listed name. */
export const LATE_TOOL_NAME = 'late_tool';

export type LateWrite = { description: string; write: () => void };

function scopeWithoutList(): McpScope {
	const scope = MCP_INSTANCE_SCOPES.find((s) => !Object.hasOwn(CAPABILITY_TOOLS_BY_SCOPE, s));
	if (!scope) throw new Error('Every scope has a capability list, so no scope is free to add');
	return scope;
}

const writesToList = (scope: string, names: readonly string[]): LateWrite[] => [
	{
		description: `adds a name to the "${scope}" list`,
		write: () => {
			// @ts-expect-error -- the list is read-only
			names.push(LATE_TOOL_NAME);
		},
	},
	{
		description: `replaces the first name of the "${scope}" list`,
		write: () => {
			// @ts-expect-error -- the list is read-only
			names[0] = LATE_TOOL_NAME;
		},
	},
	{
		description: `empties the "${scope}" list`,
		write: () => {
			// @ts-expect-error -- the list is read-only
			names.length = 0;
		},
	},
];

/**
 * Writes that code can try after import. Each `@ts-expect-error` makes the typecheck fail if the
 * type ever becomes writable. A call of `write` tries the same change at runtime.
 */
export function lateWritesToCapabilityList(): LateWrite[] {
	const freeScope = scopeWithoutList();
	const toMap: LateWrite[] = [
		{
			description: `adds the scope "${freeScope}"`,
			write: () => {
				// @ts-expect-error -- the map is read-only
				CAPABILITY_TOOLS_BY_SCOPE[freeScope] = [LATE_TOOL_NAME];
			},
		},
		{
			description: 'replaces the "workflow:read" list',
			write: () => {
				// @ts-expect-error -- the map is read-only
				CAPABILITY_TOOLS_BY_SCOPE['workflow:read'] = [LATE_TOOL_NAME];
			},
		},
		{
			description: 'removes the "workflow:read" list',
			write: () => {
				// @ts-expect-error -- the map is read-only
				delete CAPABILITY_TOOLS_BY_SCOPE['workflow:read'];
			},
		},
	];
	const toLists = Object.entries(CAPABILITY_TOOLS_BY_SCOPE).flatMap(([scope, names]) =>
		names ? writesToList(scope, names) : [],
	);
	return [...toMap, ...toLists];
}
