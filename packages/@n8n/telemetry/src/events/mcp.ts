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
