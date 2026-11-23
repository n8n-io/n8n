import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'ai-gym', instanceTypes: ['main'] })
export class AiGymModule implements ModuleInterface {
	async init() {
		await import('./workflow-simulation.controller.js');
	}

	@OnShutdown()
	async shutdown() {
		const { AiGymRuntimeService } = await import('./ai-gym-runtime.service.js');
		if (Container.has(AiGymRuntimeService)) {
			Container.get(AiGymRuntimeService).shutdown();
		}
	}
}
