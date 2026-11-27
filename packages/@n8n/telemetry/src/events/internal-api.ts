import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const INTERNAL_API_USAGE_JSON_FIELDS = {
	routes: z.array(
		z.object({
			route: z.string(),
			editor_ui: z.number().int().nonnegative(),
			other: z.number().int().nonnegative(),
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
			'Six-hourly pulse of Internal API calls, one event for each main process that served a call in the window, also sent on shutdown. Routes are named by their pattern, for example `GET /rest/workflows/{workflowId}`. Route rows give the calls to each route from the Editor UI and from other clients.',
		properties: z.object({
			total_calls: z.number().int().positive().describe('Calls in the window'),
			first: z.iso.datetime().describe('Start of the window'),
			routes: z
				.string()
				.describe(
					'JSON text. One row for each route, with its calls from each client. editor_ui is the Editor UI. other is every other client: [{"route": "POST /rest/credentials/test", "editor_ui": 39960, "other": 40}]',
				),
			clients: z
				.string()
				.describe(
					'JSON text. Calls per client. editor_ui is the Editor UI. other is every other client: {"editor_ui": 5, "other": 2}',
				),
		}),
	},
});
