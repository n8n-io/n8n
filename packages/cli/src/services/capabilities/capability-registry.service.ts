import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import type { Capability, CapabilitySurface } from './capability';
import { CAPABILITY_TOOLS_BY_SCOPE, type CapabilityToolsByScope } from './capability-scopes';

function scopesThatList(toolsByScope: CapabilityToolsByScope, name: string): string[] {
	return Object.entries(toolsByScope).flatMap(([scope, names]) =>
		names?.includes(name) ? [scope] : [],
	);
}

/**
 * An MCP capability must be listed under its own scope and no other, so that OAuth grants
 * filter it like a built-in tool. A capability for the n8n Assistant only must not be listed,
 * because the consent screen would then offer a tool that MCP never registers.
 */
function assertListing(toolsByScope: CapabilityToolsByScope, capability: Capability): void {
	const { name, scope } = capability;
	const offeredOverMcp = capability.surfaces.includes('mcp');
	const listedUnder = scopesThatList(toolsByScope, name);
	const expected = offeredOverMcp ? [scope] : [];
	if (listedUnder.length === expected.length && listedUnder.every((s, i) => s === expected[i])) {
		return;
	}
	const rule = offeredOverMcp
		? `under "${scope}" only`
		: 'under no scope, as MCP does not offer it';
	const actual = listedUnder.length > 0 ? `"${listedUnder.join('", "')}"` : 'no scope';
	throw new UnexpectedError(
		`CAPABILITY_TOOLS_BY_SCOPE must list capability "${name}" ${rule}, but lists it under ${actual}`,
	);
}

/** Holds every capability, so that each surface offers the same definitions. */
@Service()
export class CapabilityRegistry {
	private readonly capabilities = new Map<string, Capability>();

	/** The list to check capabilities against. Only tests pass another list. */
	constructor(private readonly toolsByScope: CapabilityToolsByScope = CAPABILITY_TOOLS_BY_SCOPE) {}

	/** Registering the same capability again does nothing, so a repeated module init is safe. */
	register(capability: Capability): void {
		const existing = this.capabilities.get(capability.name);
		if (existing === capability) return;
		if (existing) {
			throw new UnexpectedError(`A capability named "${capability.name}" is already registered`);
		}
		assertListing(this.toolsByScope, capability);
		this.capabilities.set(capability.name, capability);
	}

	/** The capabilities offered on one surface, in registration order. */
	list(surface: CapabilitySurface): Capability[] {
		return [...this.capabilities.values()].filter((capability) =>
			capability.surfaces.includes(surface),
		);
	}
}
