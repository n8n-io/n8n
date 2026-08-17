import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const MCP_TELEMETRY = defineTelemetryEvents({
	USER_GAVE_MCP_ACCESS_TO_WORKFLOW: {
		name: 'User gave MCP access to workflow',
		description: 'A workflow was exposed over MCP.',
		properties: z.object({
			workflow_id: z.string(),
		}),
	},
	USER_TOGGLED_MCP_ACCESS: {
		name: 'User toggled MCP access',
		description:
			'An admin turned instance-level MCP access on or off. Reports the resulting state.',
		properties: z.object({
			state: z.boolean().describe('Resulting state of MCP access, not the prior one'),
		}),
	},
	USER_CLICKED_CONNECT_CLIENT_FROM_MCP_SETTINGS: {
		name: 'User clicked connect client from mcp settings',
		description:
			'A user opened the connect-client dialog from the MCP settings page. Heads the client setup funnel: sessions carrying this event without a follow-up copy or token fetch are the ones abandoning the one-click setup.',
		properties: z.object({}),
	},
	USER_REVOKED_MCP_CLIENT_ACCESS: {
		name: 'User revoked MCP client access',
		description:
			"A connected client's MCP access was revoked from the connected-clients page. Fires once the revoke succeeds, so opening the confirmation dialog and cancelling emits nothing.",
		properties: z.object({
			client_id: z.string().describe('OAuth client whose consent was revoked'),
			revoked_for_other: z
				.boolean()
				.describe("Whether an admin revoked another user's grant rather than their own"),
		}),
	},
	AUTO_EXPOSE_NEW_WORKFLOWS_TOGGLED: {
		name: 'User toggled auto-expose new workflows to MCP',
		description:
			'An admin turned the "Auto-expose new workflows" MCP setting on or off. Reports the resulting state so enabling and disabling are distinguishable.',
		properties: z.object({
			enabled: z.boolean().describe('Resulting state of the setting, not the prior one'),
			source: z
				.enum(['settings', 'expose_all'])
				.describe(
					'Where the toggle came from: "settings" for the manual MCP settings switch, "expose_all" when enabled automatically as part of exposing all workflows',
				),
		}),
	},
});
