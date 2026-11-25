import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const INTERNAL_API_USAGE_JSON_FIELDS = {
	routes: z.array(
		z.object({
			route: z.string(),
			calls: z.number().int().positive(),
		}),
	),
	clients: z.object({
		editor_ui: z.number().int().nonnegative(),
		other: z.number().int().nonnegative(),
	}),
};

export const INTERNAL_API_TELEMETRY = defineTelemetryEvents({
	INTERNAL_API_USAGE: {
		name: 'Internal API usage',
		description:
			'Six-hourly pulse of Internal API calls, one event for each main process that served a call in the window, also sent on shutdown. The event carries no user. A large window can send several events for one process. Only the first event carries total_calls and clients, and the others carry zeros, so summing a window counts each call once. Routes are named by their pattern, for example `GET /rest/workflows/{workflowId}`, never by the URL that was called. Per-route rows exclude the Editor UI to keep the payload bounded.',
		properties: z.object({
			total_calls: z
				.number()
				.int()
				.nonnegative()
				.describe('Calls in the window. Zero on the follow-up events of a window'),
			first: z.iso.datetime().describe('Time of the first call in the window'),
			routes: z
				.string()
				.describe(
					'JSON text. One row per route, for calls from clients other than the Editor UI: [{"route": "GET /rest/workflows/{workflowId}", "calls": 3}]',
				),
			clients: z
				.string()
				.describe(
					'JSON text. Calls per client. editor_ui is the Editor UI. other is every other client: {"editor_ui": 5, "other": 2}',
				),
		}),
	},
});
