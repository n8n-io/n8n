import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'agent-determinism', instanceTypes: ['main'] })
export class AgentDeterminismModule implements ModuleInterface {
	async init() {
		const { DeterminismSourceRepository } = await import(
			'./database/determinism-source.repository.js'
		);
		await Container.get(DeterminismSourceRepository).resetInterrupted();

		const { AgentDeterminismListener } = await import('./agent-determinism.listener.js');
		Container.get(AgentDeterminismListener).init();
	}

	async entities() {
		const { DeterminismSourceEntity } = await import('./database/determinism-source.entity.js');
		return [DeterminismSourceEntity];
	}
}
