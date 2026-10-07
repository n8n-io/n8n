import type { EventService } from '@n8n/backend-services';
import type { InstanceAiCapabilityTool } from '@n8n/instance-ai';

import { runAuditedToolCall } from '@/modules/mcp/mcp-tool-call-audit';
import type { AssistantRequest, Capability } from '@/services/capabilities/capability';

/** The client name in `mcp-tool-called` events for calls from the n8n Assistant. */
export const ASSISTANT_CLIENT_NAME = 'n8n-assistant';

/**
 * Builds the n8n Assistant tool of a capability from the same definition that the MCP server
 * uses. The tool acts as the request user. Each call emits the same `mcp-tool-called` event as
 * a call from an MCP client, so that the audit log shows calls from both surfaces.
 *
 * `request.permissions` are the admin permission modes of the run, with the branch read-only
 * overrides applied. A capability that declares `assistant.confirm` or `assistant.permission`
 * can show the Assistant confirmation card before it acts. It then acts only after approval.
 */
export function toAssistantTool(
	capability: Capability,
	request: AssistantRequest,
	eventService: EventService,
): InstanceAiCapabilityTool {
	return capability.toAssistantTool({
		...request,
		runCall: async (toolName, args, invoke) =>
			await runAuditedToolCall(
				eventService,
				{ user: request.user, toolName, clientName: ASSISTANT_CLIENT_NAME },
				args,
				invoke,
			),
	});
}
