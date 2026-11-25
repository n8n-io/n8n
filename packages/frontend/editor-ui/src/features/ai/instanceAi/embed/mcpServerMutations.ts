import { isRecord } from '@n8n/utils/is-record';

import { findLatestInTurns, type ArtifactTurn } from '@/features/ai/instanceAi/artifactTurns';
import { unwrapUntrustedToolResult } from '@/features/ai/instanceAi/canvasPreview.utils';

/** `DOMAIN_TOOL_IDS.CUSTOM_MCP_SERVERS` in `@n8n/instance-ai`, which the editor does not import. */
const CUSTOM_MCP_SERVERS_TOOL_NAME = 'custom-mcp-servers';

/**
 * The id of the latest tool call that changed the server. The tool stamps `serverMutated: true`
 * on each successful change, so a running, denied, or failed call does not count.
 */
export function getLatestMcpServerMutation(
	turns: readonly ArtifactTurn[],
	serverId: string,
): string | undefined {
	return findLatestInTurns(turns, (toolCall) => {
		if (
			toolCall.toolName !== CUSTOM_MCP_SERVERS_TOOL_NAME ||
			toolCall.isLoading ||
			toolCall.args.serverId !== serverId
		) {
			return undefined;
		}
		// The tool declares `untrustedOutput()`, so its result reaches the editor wrapped.
		const result = unwrapUntrustedToolResult(toolCall.result);
		return isRecord(result) && result.serverMutated === true ? toolCall.toolCallId : undefined;
	});
}
