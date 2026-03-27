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
