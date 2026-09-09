import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

/**
 * Brand and category resolved from the client's self-registered name by the
 * shared matchers, so a revoke can be segmented the same way the connect
 * dialog's client slug is. Null when the name matches no known brand.
 */
const clientBrand = z
	.enum(['claude', 'cursor', 'vscode', 'openai'])
	.nullable()
	.describe('Client brand, mirroring MCP_CLIENT_BRAND_MATCHERS in @n8n/api-types');

const clientType = z.enum(['cli', 'ide', 'editor', 'assistant']).nullable();

/** Which JSON action opened the MCP nudge modal. */
const nudgeSurface = z
	.enum(['export', 'import_file', 'import_url', 'copy', 'paste'])
	.describe(
		'The action that opened the nudge: the Export JSON menu item, Import from file, Import from URL, copying nodes, or pasting workflow JSON onto the canvas',
	);

export const MCP_TELEMETRY = defineTelemetryEvents({
	MCP_NUDGE_VIEWED: {
		name: 'User viewed MCP nudge',
		description:
			'The MCP nudge modal opened after the user exported a workflow as JSON, imported one from a file or URL, copied nodes, or pasted workflow JSON onto the canvas. Fires only when the modal opens, so a trigger that the flag, the two-impression cap, an opt-out, or instance-level MCP access suppresses emits nothing. Each fire consumes one impression.',
		properties: z.object({
			surface: nudgeSurface,
		}),
	},
	MCP_NUDGE_CONNECT_CLICKED: {
		name: 'User clicked connect in MCP nudge',
		description:
			'The user clicked "Connect n8n" in the MCP nudge. The app navigates to the MCP settings page and abandons the export or import that opened the nudge. Kept separate from the skip and dismiss events so the connect-to-export click ratio stays computable.',
		properties: z.object({
			surface: nudgeSurface,
		}),
	},
	MCP_NUDGE_SKIPPED: {
		name: 'User skipped MCP nudge',
		description:
			'The user clicked "Skip" in the MCP nudge. The export or import that opened the nudge completes unchanged. Closing with × or Escape is "User dismissed MCP nudge" instead.',
		properties: z.object({
			surface: nudgeSurface,
		}),
	},
	MCP_NUDGE_DISMISSED: {
		name: 'User dismissed MCP nudge',
		description:
			'The user closed the MCP nudge with × or Escape without choosing an action. The export or import that opened the nudge completes unchanged.',
		properties: z.object({
			surface: nudgeSurface,
		}),
	},
	MCP_NUDGE_OPTED_OUT: {
		name: 'User opted out of MCP nudge',
		description:
			'The user checked "Don\'t show this again" in the MCP nudge. Fires when the checkbox is checked, independent of which button later closes the modal. The nudge never shows again for this user.',
		properties: z.object({
			surface: nudgeSurface,
		}),
	},
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
	USER_CLICKED_CONNECT_CLIENT: {
		name: 'User clicked connect MCP client',
		description:
			'A user opened the connect-client dialog. Heads the client setup funnel: sessions carrying this event without a follow-up copy or token fetch are the ones abandoning the one-click setup.',
		properties: z.object({
			source: z
				.enum(['settings'])
				.describe(
					'Where the dialog was opened from; the MCP settings page is the only entry point today',
				),
		}),
	},
	USER_VIEWED_ALL_MCP_CLIENTS: {
		name: 'User viewed all MCP clients',
		description:
			"An admin switched the connected-clients page from their own consents to the whole instance's. Only the switch is reported, so landing on the page emits nothing.",
		properties: z.object({}),
	},
	USER_REVOKED_MCP_CLIENT_ACCESS: {
		name: 'User revoked MCP client access',
		description:
			"A connected client's MCP access was revoked from the connected-clients page. Fires once the revoke succeeds, so opening the confirmation dialog and cancelling emits nothing.",
		properties: z.object({
			client_id: z
				.string()
				.describe(
					'OAuth client whose consent was revoked. Dynamically registered, so it is unique per user and client pair rather than a segmentable dimension: use client_brand for that',
				),
			client_brand: clientBrand,
			client_type: clientType,
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
