import { isRecord } from '@n8n/utils/is-record';

import { findLatestInTurns, type ArtifactTurn } from '../artifactTurns';

/** `DOMAIN_TOOL_IDS.CUSTOM_MCP_SERVERS` in `@n8n/instance-ai`, which the editor does not import. */
const CUSTOM_MCP_SERVERS_TOOL_NAME = 'custom-mcp-servers';

/** The actions of the tool that change a server. The reads and `create` do not. */
const WRITE_ACTIONS: ReadonlySet<unknown> = new Set([
	'update',
	'delete',
	'add-tools',
	'update-tool',
	'generate',
	'remove-tool',
]);

/**
 * The id of the latest tool call that changed the server. A change counts once its result says
 * `success: true`: a running, denied, or failed call changes nothing.
 */
export function getLatestMcpServerMutation(
	turns: readonly ArtifactTurn[],
	serverId: string,
): string | undefined {
	return findLatestInTurns(turns, (toolCall) =>
		toolCall.toolName === CUSTOM_MCP_SERVERS_TOOL_NAME &&
		!toolCall.isLoading &&
		WRITE_ACTIONS.has(toolCall.args.action) &&
		toolCall.args.serverId === serverId &&
		isRecord(toolCall.result) &&
		toolCall.result.success === true
			? toolCall.toolCallId
			: undefined,
	);
}
