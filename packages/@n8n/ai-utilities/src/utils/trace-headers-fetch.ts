import type { Logger, RequestHelperFunctions } from 'n8n-workflow';

import { boundedAiClientFetch } from './http-proxy-agent';

/**
 * Wraps a fetch so that each request carries the W3C trace context of the node that runs now.
 * One client serves many calls under different spans, so the headers are read for each request.
 */
export function withTraceHeaders(
	baseFetch: typeof fetch,
	getTraceHeaders: () => Record<string, string>,
	logger?: Logger,
): typeof fetch {
	return async (input, init) => {
		let tracedInit: RequestInit | undefined;
		try {
			const traceHeaders = getTraceHeaders();
			if (Object.keys(traceHeaders).length) {
				// Headers in init replace the headers of a Request input, so start from those.
				const headers = new Headers(
					init?.headers ?? (input instanceof Request ? input.headers : undefined),
				);
				for (const [name, value] of Object.entries(traceHeaders)) headers.set(name, value);
				tracedInit = { ...init, headers };
			}
		} catch (error) {
			logger?.warn('Failed to add the trace context to an outbound request', {
				error: error instanceof Error ? error.message : String(error),
			});
		}

		return await baseFetch(input, tracedInit ?? init);
	};
}

/** `boundedAiClientFetch` that also sends the trace context of the node that owns `ctx`. */
export function createAiClientFetch(ctx: {
	helpers: Pick<RequestHelperFunctions, 'getTraceHeaders'>;
	logger?: Logger;
}): typeof fetch {
	return withTraceHeaders(boundedAiClientFetch, () => ctx.helpers.getTraceHeaders(), ctx.logger);
}
