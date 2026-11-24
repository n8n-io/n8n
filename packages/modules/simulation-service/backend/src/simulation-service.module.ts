import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'simulation-service', instanceTypes: ['main'] })
export class SimulationServiceModule implements ModuleInterface {
	async init() {
		await import('./workflow-simulation.controller.js');
	}

	@OnShutdown()
	async shutdown() {
		const { SimulationServiceRuntimeService } = await import(
			'./simulation-service-runtime.service.js'
		);
		if (Container.has(SimulationServiceRuntimeService)) {
			Container.get(SimulationServiceRuntimeService).shutdown();
		}
	}
}
