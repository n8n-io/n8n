import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'instance-version-history', instanceTypes: ['main'] })
export class InstanceVersionHistoryModule implements ModuleInterface {
	async init() {
		await import('./instance-version-history.controller');

		const { InstanceVersionHistoryService } = await import('./instance-version-history.service');
		await Container.get(InstanceVersionHistoryService).init();
	}

	async entities() {
		const { InstanceVersionHistory } = await import(
			'./database/entities/instance-version-history.entity'
		);
		return [InstanceVersionHistory];
	}
}
