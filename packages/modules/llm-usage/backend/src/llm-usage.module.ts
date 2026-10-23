import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

// Webhook processes only queue executions, so they make no LLM calls to capture.
@BackendModule({ name: 'llm-usage', instanceTypes: ['main', 'worker'] })
export class LlmUsageModule implements ModuleInterface {
	async init() {
		const { setLlmUsageSink } = await import('@n8n/ai-utilities/llm-usage');
		const { PriceCatalogService } = await import('./price-catalog.service.js');
		const { LlmUsageCollector } = await import('./llm-usage-collector.service.js');

		// The collector starts first, so it hears the first catalog load and prices earlier calls.
		const collector = Container.get(LlmUsageCollector);
		collector.start();
		setLlmUsageSink(collector);
		void Container.get(PriceCatalogService).start();
	}

	async entities() {
		const { LlmUsage } = await import('./llm-usage.entity.js');
		return [LlmUsage];
	}

	/** Core finds this object on `additionalData['llm-usage']` and inspects node HTTP requests with it. */
	async context() {
		const { inspectRequest } = await import('./request-inspector.js');
		return { inspectRequest };
	}

	/**
	 * The sink stays set: executions still finish after the shutdown handlers run, and their
	 * calls are written at once.
	 */
	@OnShutdown()
	async shutdown() {
		const { PriceCatalogService } = await import('./price-catalog.service.js');
		const { LlmUsageCollector } = await import('./llm-usage-collector.service.js');

		Container.get(PriceCatalogService).stop();
		await Container.get(LlmUsageCollector).shutdown();
	}
}
