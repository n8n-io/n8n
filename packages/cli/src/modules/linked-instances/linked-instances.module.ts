import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

/** Lets a user link other n8n instances, such as their n8n Cloud. Off by default. */
@BackendModule({ name: 'linked-instances', instanceTypes: ['main'] })
export class LinkedInstancesModule implements ModuleInterface {
	async init() {
		await import('./linked-instances.controller.js');
	}

	async entities() {
		const { LinkedInstance } = await import('./database/entities/linked-instance.entity.js');
		return [LinkedInstance];
	}
}
