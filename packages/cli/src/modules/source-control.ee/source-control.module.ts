import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';

@BackendModule({ name: 'source-control' })
export class SourceControlModule implements ModuleInterface {
	async init() {
		// TODO: import controllers and services
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
