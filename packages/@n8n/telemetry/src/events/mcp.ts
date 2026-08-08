import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const MCP_TELEMETRY = defineTelemetryEvents({
	AUTO_EXPOSE_NEW_WORKFLOWS_TOGGLED: {
		name: 'User toggled auto-expose new workflows to MCP',
		description:
			'An admin turned the "Auto-expose new workflows" MCP setting on or off. Reports the resulting state so enabling and disabling are distinguishable.',
		properties: z.looseObject({
			enabled: z.boolean().describe('Resulting state of the setting, not the prior one'),
		}),
	},
});
