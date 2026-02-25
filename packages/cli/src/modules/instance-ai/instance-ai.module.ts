import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'instance-ai', instanceTypes: ['main'] })
export class InstanceAiModule implements ModuleInterface {
	async init() {
		await import('./instance-ai.controller');
	}

	async settings() {
		const { InstanceAiService } = await import('./instance-ai.service');
		const enabled = Container.get(InstanceAiService).isEnabled();
		return { enabled };
	}

	@OnShutdown()
	async shutdown() {
		const { InstanceAiService } = await import('./instance-ai.service');
		await Container.get(InstanceAiService).shutdown();
	}
}
