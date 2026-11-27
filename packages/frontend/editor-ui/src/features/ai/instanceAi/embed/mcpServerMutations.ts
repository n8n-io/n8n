import { isRecord } from '@n8n/utils/is-record';

import { artifactToolCalls, type ArtifactTurn } from '@/features/ai/instanceAi/artifactTurns';
import { unwrapUntrustedToolResult } from '@/features/ai/instanceAi/canvasPreview.utils';

/** `DOMAIN_TOOL_IDS.CUSTOM_MCP_SERVERS` in `@n8n/instance-ai`, which the editor does not import. */
const CUSTOM_MCP_SERVERS_TOOL_NAME = 'custom-mcp-servers';

/**
 * The ids of the tool calls that changed the server, oldest first. The tool stamps
 * `serverMutated: true` on each successful change, so a running, denied, or failed call does not
 * count. Approvals can finish in any order, so a caller compares the whole list, not the last id.
 */
export function getMcpServerMutations(turns: readonly ArtifactTurn[], serverId: string): string[] {
	const toolCallIds: string[] = [];
	for (const toolCall of artifactToolCalls(turns)) {
		if (
			toolCall.toolName !== CUSTOM_MCP_SERVERS_TOOL_NAME ||
			toolCall.isLoading ||
			toolCall.args.serverId !== serverId
		) {
			continue;
		}
		// The tool declares `untrustedOutput()`, so its result reaches the editor wrapped.
		const result = unwrapUntrustedToolResult(toolCall.result);
		if (isRecord(result) && result.serverMutated === true) toolCallIds.push(toolCall.toolCallId);
	}
	return toolCallIds;
}
