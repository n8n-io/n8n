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
		await import('./source-control.controller.ee.js');
		await import('./multi-repo/source-control-connections.controller.js');

		const { SourceControlService } = await import('./source-control.service.ee.js');
		await Container.get(SourceControlService).start();
	}

	async entities() {
		const { SourceControlConnection } = await import(
			'./multi-repo/source-control-connection.entity.js'
		);
		const { SourceControlScope } = await import('./multi-repo/source-control-scope.entity.js');

		return [SourceControlConnection, SourceControlScope];
	}
}
