import type { EventService } from '@n8n/backend-services';
import type { InstanceAiCapabilityTool } from '@n8n/instance-ai';

import { runAuditedToolCall } from '@/modules/mcp/mcp-tool-call-audit';
import type { Capability, CapabilityRequest } from '@/services/capabilities/capability';

/** The client name in `mcp-tool-called` events for calls from the n8n Assistant. */
export const ASSISTANT_CLIENT_NAME = 'n8n-assistant';

/**
 * Builds the n8n Assistant tool of a capability from the same definition that the MCP server
 * uses. The tool acts as the request user. Each call emits the same `mcp-tool-called` event as
 * a call from an MCP client, so that the audit log shows calls from both surfaces.
 */
export function toAssistantTool(
	capability: Capability,
	request: CapabilityRequest,
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
