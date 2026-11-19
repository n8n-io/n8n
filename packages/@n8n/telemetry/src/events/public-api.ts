import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

const callCounts = z.record(z.string(), z.number().int().positive());

export const PUBLIC_API_USAGE_JSON_FIELDS = {
	endpoints: callCounts,
	endpoints_by_client: z.object({ editor_ui: callCounts }),
	routes: z.array(
		z.object({
			route: z.string(),
			result: z.enum(['2xx', '4xx', '5xx']),
			caller: z.enum(['editor_ui', 'other']),
			calls: z.number().int().positive(),
		}),
	),
	user_agents: callCounts,
	clients: z.object({
		editor_ui: z.number().int().nonnegative(),
		other: z.number().int().nonnegative(),
	}),
};

export const PUBLIC_API_TELEMETRY = defineTelemetryEvents({
	PUBLIC_API_USAGE: {
		name: 'Public API usage',
		description:
			'Six-hourly pulse of Public API calls, one event per user who called the API in the window, also sent on shutdown. Routes are named by their pattern, for example `GET /workflows/{workflowId}`, never by the URL that was called.',
		properties: z.object({
			user_id: z.string(),
			total_calls: z.number().int().positive(),
			first: z.iso.datetime().describe('Time of the first call in the window'),
			endpoints: z
				.string()
				.describe('JSON text. Calls per route name: {"GET /workflows/{workflowId}": 3}'),
			endpoints_by_client: z
				.string()
				.describe(
					'JSON text. Calls per route name for the editor only: {"editor_ui": {"GET /workflows": 1}}',
				),
			routes: z
				.string()
				.describe(
					'JSON text. One row per route, result and caller: [{"route": "GET /workflows/{workflowId}", "result": "2xx", "caller": "other", "calls": 3}]. result is 2xx, 4xx or 5xx. caller is editor_ui or other',
				),
			user_agents: z.string().describe('JSON text. Calls per User-Agent header'),
			clients: z.string().describe('JSON text. Calls per caller: {"editor_ui": 1, "other": 2}'),
		}),
	},
});
