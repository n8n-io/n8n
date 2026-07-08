import type { AiGatewayAvailability } from '@/services/ai-gateway.service';

import type { N8nConnectCoverage } from './mcp.types';

/**
 * Tool-variant node types carry a "Tool"/"HitlTool" suffix (e.g. `openAiTool`),
 * but the gateway config is keyed by the base node type (`openAi`). Mirrors the
 * editor-ui `stripToolSuffix` so backend and frontend agree on lookup fallback.
 */
export function stripToolSuffix(nodeType: string): string {
	return nodeType.replace(/HitlTool$/, '').replace(/Tool$/, '');
}

/**
 * Maps a gateway availability result to the `{ credentialTypes, nodes }` coverage
 * snapshot surfaced in tool output, or `undefined` when the gateway is unavailable.
 * Single source of truth for the coverage shape across the MCP discovery tools.
 */
export function toN8nConnectCoverage(
	availability: AiGatewayAvailability,
): N8nConnectCoverage | undefined {
	if (!availability.available) return undefined;
	return {
		credentialTypes: availability.config.credentialTypes,
		nodes: availability.config.nodes,
	};
}
