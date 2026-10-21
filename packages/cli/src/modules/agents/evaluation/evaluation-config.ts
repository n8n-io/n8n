import {
	hasNativeWebSearchProvider,
	isNativeWebSearchRequested,
} from '@n8n/ai-utilities/agent-config';
import type { AgentJsonConfig } from '@n8n/api-types';
import { nodeNameToToolName } from 'n8n-workflow';

import type { Agent } from '../entities/agent.entity';
import type {
	AgentEvaluationSkippedFeature,
	AgentEvaluationToolSummary,
} from './agent-evaluation.contracts';

export function pruneConfigForEval(original: AgentJsonConfig): {
	config: AgentJsonConfig;
	skippedFeatures: AgentEvaluationSkippedFeature[];
} {
	const skippedFeatures: AgentEvaluationSkippedFeature[] = [];
	const config: AgentJsonConfig = { ...original };

	if (config.memory?.enabled) {
		skippedFeatures.push({
			feature: 'memory',
			reason:
				'Observational/episodic memory worker models and embeddings are not mockable yet — memory is disabled for the run.',
		});
		config.memory = undefined;
	}

	if ((config.vectorStores?.length ?? 0) > 0) {
		skippedFeatures.push({
			feature: 'vectorStores',
			reason: 'Vector stores use native DB clients the mock layer cannot intercept.',
		});
		config.vectorStores = undefined;
	}

	// Streamable-HTTP MCP servers are served by the mock MCP fetch; only the
	// non-default SSE transport (stateful long-lived stream) stays unmockable.
	const sseServers = (config.mcpServers ?? []).filter((server) => server.transport === 'sse');
	if (sseServers.length > 0) {
		skippedFeatures.push({
			feature: 'mcpServers (sse transport)',
			reason: `SSE-transport MCP servers are not mockable yet (streamable-HTTP ones are): ${sseServers.map((server) => server.name).join(', ')}.`,
		});
		const remaining = (config.mcpServers ?? []).filter((server) => server.transport !== 'sse');
		config.mcpServers = remaining.length > 0 ? remaining : undefined;
	}

	// Configured sub-agents stay: the delegated child inherits the run's
	// instrumentation and its config is pruned by the same rules via
	// `transformDelegatedAgentConfig`. Web search stays too: the native
	// variant runs inside the real model call and the fallback tool is served
	// by the web-search mock.

	return { config, skippedFeatures };
}

export function summarizeTools(
	config: AgentJsonConfig,
	customTools: NonNullable<Agent['tools']>,
	sanitizeWorkflowToolName: (name: string) => string,
): AgentEvaluationToolSummary[] {
	const summaries: AgentEvaluationToolSummary[] = [];
	for (const ref of config.tools ?? []) {
		if (ref.type === 'node') {
			summaries.push({
				name: nodeNameToToolName(ref.name),
				kind: 'node',
				description: ref.description,
				nodeType: ref.node.nodeType,
			});
		} else if (ref.type === 'workflow') {
			summaries.push({
				name: sanitizeWorkflowToolName(ref.name ?? ref.workflow),
				kind: 'workflow',
				description: ref.description,
			});
		} else {
			const descriptor = customTools[ref.id]?.descriptor;
			if (descriptor) {
				summaries.push({
					name: descriptor.name,
					kind: 'custom',
					description: descriptor.description,
				});
			}
		}
	}
	// MCP servers are summarized by SERVER name — the seed's hint for that name
	// steers both the generated tool catalog and every tool result it serves.
	for (const server of config.mcpServers ?? []) {
		summaries.push({
			name: server.name,
			kind: 'mcp',
			description: server.description ?? `MCP tool server at ${server.url}`,
		});
	}
	// The fallback web_search tool is served by the web-search mock; a hint
	// keyed by its name steers the generated result sets. Native web search
	// runs inside the real model call and needs no hint.
	if (
		config.config?.webSearch?.enabled &&
		!(isNativeWebSearchRequested(config) && hasNativeWebSearchProvider(config.model))
	) {
		summaries.push({
			name: 'web_search',
			kind: 'other',
			description: 'Web search returning {title, url, snippet} result lists',
		});
	}
	return summaries;
}
