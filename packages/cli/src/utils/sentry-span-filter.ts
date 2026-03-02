import type { GlobalConfig } from '@n8n/config';

import { resolveHealthEndpointPath } from './health-endpoint.util';

/**
 * Builds the list of span descriptions to ignore in Sentry tracing.
 * Sentry's `ignoreSpans` uses substring matching on `span.description`.
 */
export function buildIgnoredSpans(globalConfig: GlobalConfig): string[] {
	const healthEndpoint = resolveHealthEndpointPath(globalConfig);
	const spans = [
		`GET ${healthEndpoint}`,
		'GET /metrics',
		// Ignore Postgres session setup query to reduce tracing noise.
		'SET search_path TO',
	];

	return spans;
}
