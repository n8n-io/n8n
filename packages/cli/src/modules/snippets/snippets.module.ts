import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'snippets' })
export class SnippetsModule implements ModuleInterface {
	async init() {
		await import('./snippets.controller.js');

		const { SnippetsService } = await import('./snippets.service.js');
		const { OwnershipTransferHandlerRegistry } = await import(
			'@/services/ownership-transfer/ownership-transfer-handler.registry.js'
		);
		Container.get(OwnershipTransferHandlerRegistry).register({
			resource: 'snippet',
			transferAll: async (fromProjectId, toProjectId, trx) => {
				await Container.get(SnippetsService).transferAllByProjectId(
					fromProjectId,
					toProjectId,
					trx,
				);
			},
			deleteAll: async (projectId) => {
				await Container.get(SnippetsService).deleteAllByProjectId(projectId);
			},
		});
	}

	async entities() {
		const { Snippet } = await import('./snippet.entity.js');

		return [Snippet];
	}

	async context() {
		const { SnippetsService } = await import('./snippets.service.js');

		return { snippetsProvider: Container.get(SnippetsService) };
	}
}
