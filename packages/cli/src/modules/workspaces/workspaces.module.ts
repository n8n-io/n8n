import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * PROTOTYPE (workspaces): workspaces group projects and hold the credentials,
 * data tables and variables their projects inherit.
 */
@BackendModule({ name: 'workspaces', instanceTypes: ['main'] })
export class WorkspacesModule implements ModuleInterface {
	async init() {
		await import('./workspaces.controller.js');

		const { WorkspacesBootstrapService } = await import('./workspaces-bootstrap.service.js');
		await Container.get(WorkspacesBootstrapService).run();
	}
}
