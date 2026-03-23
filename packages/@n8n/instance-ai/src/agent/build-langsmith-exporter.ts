import { LangSmithExporter } from '@mastra/langsmith';

import type { ServiceProxyConfig } from '../types';

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
	return new LangSmithExporter({ projectName: 'instance-ai' });
}
