import { AsyncLocalStorage } from 'node:async_hooks';

import { LangSmithExporter } from '@mastra/langsmith';

import type { ServiceProxyConfig } from '../types';

/**
 * Per-request tracing auth headers, isolated via AsyncLocalStorage.
 * Callers wrap their agent run in `tracingHeaderStore.run(headers, fn)`
 * so the shared exporter's custom fetch reads the correct per-request
 * Authorization header without any shared mutable state.
 */
export const tracingHeaderStore = new AsyncLocalStorage<Record<string, string>>();

// autoBatchTracing must be false because @mastra/langsmith calls patchRun()
// multiple times per span (on update and on finish). With batching enabled,
// these updates are sent via the /runs/multipart endpoint which requires fields
// (start_time, session_id, etc.) that patchRun() doesn't include — resulting
// in 422 errors from LangSmith. Disabling batching uses direct PATCH requests
// instead, which don't require those fields.
export function buildLangSmithExporter(tracingConfig?: ServiceProxyConfig): LangSmithExporter {
	if (tracingConfig) {
		// Custom fetch that injects per-request auth headers from AsyncLocalStorage.
		// The exporter is created once and cached; each request's fetch calls read
		// headers from their own async context — no shared mutable state.
		const proxyFetch: typeof globalThis.fetch = (input, init) => {
			const contextHeaders = tracingHeaderStore.getStore();
			if (contextHeaders) {
				const merged = { ...(init?.headers as Record<string, string>), ...contextHeaders };
				return globalThis.fetch(input, { ...init, headers: merged });
			}
			return globalThis.fetch(input, init);
		};

		return new LangSmithExporter({
			projectName: 'instance-ai',
			apiUrl: tracingConfig.apiUrl,
			apiKey: '-', // proxy manages auth
			autoBatchTracing: false,
			traceBatchConcurrency: 1,
			fetchImplementation: proxyFetch,
		});
	}
	return new LangSmithExporter({
		projectName: 'instance-ai',
		autoBatchTracing: false,
		traceBatchConcurrency: 1,
	});
}
