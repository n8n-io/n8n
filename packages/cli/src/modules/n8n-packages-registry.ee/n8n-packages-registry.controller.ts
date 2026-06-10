import type { AuthenticatedRequest } from '@n8n/db';
import { Get, RestController } from '@n8n/decorators';

import { N8nPackagesRegistryService } from './n8n-packages-registry.service';

@RestController('/n8n-packages-registry')
export class N8nPackagesRegistryController {
	constructor(private readonly registryService: N8nPackagesRegistryService) {}

	@Get('/')
	hello(_req: AuthenticatedRequest) {
		return { connected: this.registryService.isConnected() };
	}
}
