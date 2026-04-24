import type { BuiltTool } from '@n8n/agents';

export interface ToolRegistryEntry {
	kind: 'tool' | 'workflow';
	workflowId?: string;
	workflowName?: string;
	triggerType?: string;
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
		} else {
			registry.set(tool.name, { kind: 'tool' });
		}
	}
	return registry;
}
