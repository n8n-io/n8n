import type { ObservabilityExporter, InitExporterOptions, TracingEvent } from '@mastra/core/observability';
import { LangSmithExporter } from '@mastra/langsmith';

import type { ServiceProxyConfig } from '../types';

// autoBatchTracing must be false because @mastra/langsmith calls patchRun()
// multiple times per span (on update and on finish). With batching enabled,
// these updates are sent via the /runs/multipart endpoint which requires fields
// (start_time, session_id, etc.) that patchRun() doesn't include — resulting
// in 422 errors from LangSmith. Disabling batching uses direct PATCH requests
// instead, which don't require those fields.
export function buildLangSmithExporter(tracingConfig?: ServiceProxyConfig): LangSmithExporter {
	if (tracingConfig) {
		return new LangSmithExporter({
			projectName: 'instance-ai',
			apiUrl: tracingConfig.apiUrl,
			apiKey: '-', // proxy manages auth
			autoBatchTracing: false,
			traceBatchConcurrency: 1,
			fetchOptions: { headers: tracingConfig.headers },
		});
	}
	return new LangSmithExporter({
		projectName: 'instance-ai',
		autoBatchTracing: false,
		traceBatchConcurrency: 1,
	});
}

/**
 * Delegating wrapper around LangSmithExporter that allows swapping the inner
 * exporter to pick up fresh proxy auth headers without recreating the entire
 * Mastra + Observability stack (which would leak ~25 MB RunTree objects).
 *
 * The swap happens before each agent run in ensureMastraRegistered /
 * registerWithMastra, so all traces from a given run use that run's auth token.
 */
export class UpdatableLangSmithExporter implements ObservabilityExporter {
	name = 'langsmith-updatable';

	private inner: LangSmithExporter;

	constructor(tracingConfig?: ServiceProxyConfig) {
		this.inner = buildLangSmithExporter(tracingConfig);
	}

	/** Replace the inner exporter with one carrying fresh auth headers. */
	update(tracingConfig?: ServiceProxyConfig) {
		this.inner = buildLangSmithExporter(tracingConfig);
	}

	init(options: InitExporterOptions) {
		this.inner.init?.(options);
	}

	async exportTracingEvent(event: TracingEvent): Promise<void> {
		return this.inner.exportTracingEvent(event);
	}

	async flush(): Promise<void> {
		return this.inner.flush();
	}

	async shutdown(): Promise<void> {
		return this.inner.shutdown();
	}
}
