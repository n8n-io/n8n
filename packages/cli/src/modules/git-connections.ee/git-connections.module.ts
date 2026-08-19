import { LICENSE_FEATURES } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({
	name: 'git-connections',
	licenseFlag: LICENSE_FEATURES.GIT_CONNECTIONS,
	instanceTypes: ['main'],
})
export class GitConnectionsModule implements ModuleInterface {
	async init() {
		const { GitConnectionsService } = await import('./git-connections.service.js');
		Container.get(GitConnectionsService);
	}

	async entities() {
		const { GitConnection } = await import('./database/entities/git-connection.entity.js');
		return [GitConnection];
	}
}
