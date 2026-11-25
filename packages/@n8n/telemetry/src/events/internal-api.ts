import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';
import { publicApiClientSchema } from '../schemas';

export const INTERNAL_API_USAGE_JSON_FIELDS = {
	routes: z.array(
		z.object({
			route: z.string(),
			result: z.enum(['2xx', '4xx', '5xx']),
			caller: publicApiClientSchema.exclude(['editor_ui']),
			calls: z.number().int().positive(),
		}),
	),
	clients: z.object({
		editor_ui: z.number().int().nonnegative(),
		n8n_node: z.number().int().nonnegative(),
		n8n_cli: z.number().int().nonnegative(),
		other: z.number().int().nonnegative(),
	}),
};

export const INTERNAL_API_TELEMETRY = defineTelemetryEvents({
	INTERNAL_API_USAGE: {
		name: 'Internal API usage',
		description:
			'Six-hourly pulse of Internal API calls, one event per user who made a call in the window, also sent on shutdown. A large window can send several events for one user. Only the first event carries total_calls and clients, and the others carry zeros, so summing a window counts each call once. Routes are named by their pattern, for example `GET /rest/workflows/{workflowId}`, never by the URL that was called. Per-route rows exclude the Editor UI to keep the payload bounded.',
		properties: z.object({
			user_id: z.string(),
			total_calls: z
				.number()
				.int()
				.nonnegative()
				.describe('Calls in the window. Zero on the follow-up events of a window'),
			first: z.iso.datetime().describe('Time of the first call in the window'),
			routes: z
				.string()
				.describe(
					'JSON text. One row per route, result and caller, for callers other than the Editor UI: [{"route": "GET /rest/workflows/{workflowId}", "result": "2xx", "caller": "other", "calls": 3}]. result is 2xx, 4xx or 5xx. caller is n8n_node, n8n_cli or other',
				),
			clients: z
				.string()
				.describe(
					'JSON text. Calls per caller for all callers: {"editor_ui": 5, "n8n_node": 1, "n8n_cli": 0, "other": 2}',
				),
		}),
	},
});
