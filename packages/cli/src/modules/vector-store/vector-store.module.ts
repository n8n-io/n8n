import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'vector-store' })
export class VectorStoreModule implements ModuleInterface {
	async init() {
		await import('./vector-store-data.controller');

		// Initialize repository (e.g., upgrade to pgvector if available)
		const { VectorStoreDataService } = await import('./vector-store-data.service');
		const service = Container.get(VectorStoreDataService);
		await service.init();
	}

	@OnShutdown()
	async shutdown() {
		const { VectorStoreDataService } = await import('./vector-store-data.service');
		await Container.get(VectorStoreDataService).shutdown();
	}

	async entities() {
		// No database entities needed - LanceDB uses file-based storage
		return [];
	}

	async context() {
		const { VectorStoreDataService } = await import('./vector-store-data.service');

		return { vectorStoreService: Container.get(VectorStoreDataService) };
	}
}
