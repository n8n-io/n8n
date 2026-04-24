import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'jwe', instanceTypes: ['main'] })
export class JweModule implements ModuleInterface {
	async init() {
		const { JweKeyService } = await import('./jwe-key.service');
		await Container.get(JweKeyService).initialize();
	}
}
