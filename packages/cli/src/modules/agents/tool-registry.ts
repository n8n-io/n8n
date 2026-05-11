import type { BuiltTool } from '@n8n/agents';

export interface ToolRegistryEntry {
	kind: 'tool' | 'workflow' | 'node';
	workflowId?: string;
	workflowName?: string;
	triggerType?: string;
	nodeType?: string;
	nodeTypeVersion?: number;
	nodeDisplayName?: string;
	/**
	 * Configured node parameters from the agent's JSON config (only set for
	 * `kind: 'node'`). Surfaced to the session timeline so the IO viewer can
	 * render the node's actual config — channel, operation, `$fromAI(...)`
	 * templates, etc. — instead of an empty parameters block.
	 */
	nodeParameters?: Record<string, unknown>;
}

export type ToolRegistry = Map<string, ToolRegistryEntry>;

/**
 * Build a registry mapping tool name -> { kind, workflowId?, workflowName?, triggerType? }.
 * Reads metadata attached to each BuiltTool (populated by workflow-tool-factory for workflow tools).
 */
export function buildToolRegistry(tools: BuiltTool[]): ToolRegistry {
	const registry: ToolRegistry = new Map();
	for (const tool of tools) {
		const m = tool.metadata;
		if (
			m !== undefined &&
			m.kind === 'workflow' &&
			typeof m.workflowId === 'string' &&
			typeof m.workflowName === 'string'
		) {
			const entry: ToolRegistryEntry = {
				kind: 'workflow',
				workflowId: m.workflowId,
				workflowName: m.workflowName,
			};
			if (typeof m.triggerType === 'string') {
				entry.triggerType = m.triggerType;
			}
			registry.set(tool.name, entry);
		} else if (m !== undefined && m.kind === 'node' && typeof m.nodeType === 'string') {
			const entry: ToolRegistryEntry = {
				kind: 'node',
				nodeType: m.nodeType,
			};
			if (typeof m.nodeTypeVersion === 'number') entry.nodeTypeVersion = m.nodeTypeVersion;
			if (typeof m.displayName === 'string') entry.nodeDisplayName = m.displayName;
			if (m.nodeParameters && typeof m.nodeParameters === 'object') {
				entry.nodeParameters = m.nodeParameters as Record<string, unknown>;
			}
			registry.set(tool.name, entry);
		} else {
			registry.set(tool.name, { kind: 'tool' });
		}
	}
	return registry;
}
