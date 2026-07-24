import type { AiGatewayAvailability } from '@/services/ai-gateway.service';

import type { N8nConnectCoverage } from './mcp.types';

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
