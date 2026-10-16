import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

const rateLimitSummary = z.object({
	limit: z.number().describe('Requests allowed for one API key in one window'),
	window_seconds: z.number(),
	keys_by_busiest_window: z
		.object({
			range_0_49: z.number(),
			range_50_99: z.number(),
			range_100_199: z.number(),
			range_200_399: z.number(),
			range_400_799: z.number(),
			range_800_1599: z.number(),
			range_1600_plus: z.number(),
		})
		.describe(
			'Number of API keys whose highest count in one window falls in each range. For a per-endpoint limit, the highest count on any one endpoint',
		),
	keys_over_limit: z.number().describe('API keys that went above the limit at least once'),
	requests_over_limit: z
		.number()
		.describe("Requests that got a 429 in 'enforce' mode, or would have got one in 'observe' mode"),
});

const turnedOff = 'Absent when this limit is 0, that is turned off';

export const PUBLIC_API_TELEMETRY = defineTelemetryEvents({
	RATE_LIMIT_SUMMARY: {
		name: 'Public API rate limit summary',
		description:
			'Counts from the Public API rate limiter since the last report, sent with the other buffered events every 6 hours by each instance that has rate limiting on. Not sent when no API key made a request. Contains only counts, no API key or user.',
		properties: z.object({
			mode: z.enum(['enforce', 'observe']),
			active_keys: z.number().describe('API keys that made at least one counted request'),
			read_endpoint: rateLimitSummary.optional().describe(turnedOff),
			read_all_endpoints: rateLimitSummary.optional().describe(turnedOff),
			write_endpoint: rateLimitSummary.optional().describe(turnedOff),
			write_all_endpoints: rateLimitSummary.optional().describe(turnedOff),
		}),
	},
});
