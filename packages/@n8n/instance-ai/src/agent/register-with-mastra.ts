/**
 * Register a sub-agent with Mastra for HITL suspend/resume snapshot storage.
 * Without this, tools that use suspend() will fail on resumeStream() because
 * Mastra has no storage to persist/retrieve the execution snapshot.
 *
 * Centralizes the Mastra + Observability ceremony that was duplicated 6 times.
 */

import type { Agent } from '@mastra/core/agent';
import { Mastra } from '@mastra/core/mastra';
import type { MastraCompositeStore } from '@mastra/core/storage';
import { LangSmithExporter } from '@mastra/langsmith';
import { Observability } from '@mastra/observability';

import type { TracingProxyConfig } from '../types';

function buildLangSmithExporter(tracingConfig?: TracingProxyConfig): LangSmithExporter {
	if (tracingConfig) {
		return new LangSmithExporter({
			projectName: 'instance-ai',
			apiUrl: tracingConfig.apiUrl,
			apiKey: '-',
			autoBatchTracing: false,
			traceBatchConcurrency: 1,
			fetchOptions: { headers: tracingConfig.headers },
		});
	}
	return new LangSmithExporter({ projectName: 'instance-ai' });
}

export function registerWithMastra(
	agentId: string,
	agent: Agent,
	storage: MastraCompositeStore,
	tracingConfig?: TracingProxyConfig,
) {
	new Mastra({
		agents: { [agentId]: agent },
		storage,
		observability: new Observability({
			configs: {
				langsmith: {
					serviceName: 'instance-ai',
					exporters: [buildLangSmithExporter(tracingConfig)],
				},
			},
		}),
	});
}
