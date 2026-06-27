import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'instance-pull', instanceTypes: ['main'] })
export class InstancePullModule implements ModuleInterface {
	async init() {
		const { InstancePullConfig } = await import('./instance-pull.config');
		const config = Container.get(InstancePullConfig);

		// Inert unless the demo flag is set.
		if (!config.enabled) return;

		await import('./instance-pull.controller');

		// Only the prd instance runs the validation/publish poll loop.
		if (config.role === 'prd') {
			const { InstancePullPoll } = await import('./instance-pull.poll');
			Container.get(InstancePullPoll).start();
		}
	}

	@OnShutdown()
	async shutdown() {
		const { InstancePullConfig } = await import('./instance-pull.config');
		const config = Container.get(InstancePullConfig);
		if (!config.enabled || config.role !== 'prd') return;

		const { InstancePullPoll } = await import('./instance-pull.poll');
		Container.get(InstancePullPoll).stop();
	}
}
