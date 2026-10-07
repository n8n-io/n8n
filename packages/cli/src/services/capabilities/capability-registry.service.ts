import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import { TOOLS_BY_SCOPE } from '@/modules/mcp/mcp-scopes';

import type { Capability, CapabilitySurface } from './capability';

// The MCP server registers these tools itself. A capability with one of these names makes
// the server fail for every request, so the registry rejects the name at startup.
const BUILT_IN_MCP_TOOL_NAMES: ReadonlySet<string> = new Set(Object.values(TOOLS_BY_SCOPE).flat());

/** Holds every capability, so that each surface offers the same definitions. */
@Service()
export class CapabilityRegistry {
	private readonly capabilities = new Map<string, Capability>();

	/** Registering the same capability again does nothing, so a repeated module init is safe. */
	register(capability: Capability): void {
		const existing = this.capabilities.get(capability.name);
		if (existing === capability) return;
		if (existing) {
			throw new UnexpectedError(`A capability named "${capability.name}" is already registered`);
		}
		if (BUILT_IN_MCP_TOOL_NAMES.has(capability.name)) {
			throw new UnexpectedError(`Capability "${capability.name}" has the name of an MCP tool`);
		}
		this.capabilities.set(capability.name, capability);
	}

	/** The capabilities offered on one surface, in registration order. */
	list(surface: CapabilitySurface): Capability[] {
		return [...this.capabilities.values()].filter((capability) =>
			capability.surfaces.includes(surface),
		);
	}
}
