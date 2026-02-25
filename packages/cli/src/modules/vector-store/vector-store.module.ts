import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'vector-store' })
export class VectorStoreModule implements ModuleInterface {
	async entities() {
		const { VectorStoreData } = await import('@n8n/db');

		return [VectorStoreData];
	}

	async context() {
		const { VectorStoreDataService } = await import('./vector-store-data.service');

		return { vectorStoreService: Container.get(VectorStoreDataService) };
	}
}
