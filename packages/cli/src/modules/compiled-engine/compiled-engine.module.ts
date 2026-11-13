import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Runs workflows whose engine setting is `compiled` in the `wfrt` runtime
 * (proof of concept). n8n converts and compiles each workflow with
 * `@n8n/workflow-lang`, starts `wfrt` and the fallback host as child
 * processes, and turns the events of `wfrt` into n8n executions.
 *
 * Not a default module: enable it with `N8N_ENABLED_MODULES=compiled-engine`.
 * Main only, regular mode only: the module keeps its state in this process.
 */
@BackendModule({ name: 'compiled-engine', instanceTypes: ['main'] })
export class CompiledEngineModule implements ModuleInterface {
	async init() {
		await import('./compiled-engine.controller.js');
		const { CompiledEngineService } = await import('./compiled-engine.service.js');
		await Container.get(CompiledEngineService).start();
	}

	@OnShutdown()
	async shutdown() {
		const { CompiledEngineService } = await import('./compiled-engine.service.js');
		await Container.get(CompiledEngineService).shutdown();
	}
}
