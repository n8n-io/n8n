import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({
	name: 'source-control',
	licenseFlag: 'feat:sourceControl',
	instanceTypes: ['main'],
})
export class SourceControlModule implements ModuleInterface {
	async init() {
		await import('./source-control.controller.ee');

		const { SourceControlService } = await import('./source-control.service.ee');
		const service = Container.get(SourceControlService);
		await service.start();
		await service.autoConfigureFromEnv();
	}
}
