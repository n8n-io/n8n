import { createClaimedToolNames, normalizeMcpToolName } from './mcp-tool-name-validation';
import type { Logger } from '../logger';
import { createToolRegistry } from '../tool-registry';
import type { InstanceAiCapabilityTool, InstanceAiToolRegistry } from '../types';

export type CapabilityToolSet = {
	tools: InstanceAiToolRegistry;
	/** Capability tools that stay in the core tool set instead of deferred tool search. */
	alwaysLoadedNames: ReadonlySet<string>;
};

/**
 * Collects the host capability tools for one run. A capability with the name of an active
 * domain or orchestration tool is skipped, so that the native tool keeps its name. Names
 * compare in normalised form, as for MCP tools, so `build_workflow` cannot hide `build-workflow`.
 */
export function collectCapabilityTools(
	capabilityTools: readonly InstanceAiCapabilityTool[],
	nativeToolNames: Iterable<string>,
	logger: Pick<Logger, 'warn'>,
): CapabilityToolSet {
	const claimedToolNames = createClaimedToolNames(nativeToolNames);
	const tools = createToolRegistry();
	const alwaysLoadedNames = new Set<string>();

	for (const { tool, alwaysLoaded } of capabilityTools) {
		const normalizedName = normalizeMcpToolName(tool.name);
		const claimedBy = claimedToolNames.get(normalizedName);
		if (claimedBy !== undefined) {
			logger.warn('Skipped capability tool with the name of another tool', {
				toolName: tool.name,
				conflictsWith: claimedBy,
			});
			continue;
		}
		claimedToolNames.set(normalizedName, tool.name);
		tools.set(tool.name, tool);
		if (alwaysLoaded) alwaysLoadedNames.add(tool.name);
	}

	return { tools, alwaysLoadedNames };
}
