import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'source-control' })
export class SourceControlModule implements ModuleInterface {
	async init() {
		await import('./source-control.controller.ee');

		const { SourceControlService } = await import('./source-control.service.ee');
		await Container.get(SourceControlService).start();
	}

	@OnShutdown()
	async shutdown() {
		// TODO: shutdown controllers and services
	}

	async entities() {
		return [];
	}

	async context() {
		return {};
	}
}
