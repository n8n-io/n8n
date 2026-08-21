import type { AgentCapabilitySummary, AgentJsonToolConfig } from '@n8n/api-types';

/**
 * Shape stored tool configs like a capability summary's `tools` so surfaces
 * (canvas card chips, NDV summaries) reuse the saved-agent rendering. Stored
 * shapes are unvalidated until execution (JsonColumn rows, imported/hand-edited
 * node parameters), so malformed entries are skipped instead of crashing the
 * render. Custom tools carry only an id — pass `resolveCustomToolName` where a
 * source of names (the agent record) is available.
 */
export function toCapabilitySummaryTools(
	tools: AgentJsonToolConfig[] | undefined,
	resolveCustomToolName?: (id: string) => string | undefined,
): AgentCapabilitySummary['tools'] {
	return (tools ?? []).flatMap((tool): AgentCapabilitySummary['tools'] => {
		if (tool.type === 'node') {
			if (!tool.node) return [];
			return [
				{
					type: 'node' as const,
					name: tool.name,
					nodeType: tool.node.nodeType,
					nodeTypeVersion: tool.node.nodeTypeVersion,
				},
			];
		}
		if (tool.type === 'workflow') {
			return [{ type: 'workflow' as const, name: tool.name ?? tool.workflow }];
		}
		if (tool.type === 'custom') {
			return [{ type: 'custom' as const, name: resolveCustomToolName?.(tool.id) ?? tool.id }];
		}
		return [];
	});
}
