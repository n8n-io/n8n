import type { ClusterInfoResponse } from '@n8n/api-types';
import { Get, GlobalScope, RestController } from '@n8n/decorators';

import { InstanceRegistryService } from './instance-registry.service';

@RestController('/instance-registry')
export class InstanceRegistryController {
	constructor(private readonly instanceRegistryService: InstanceRegistryService) {}

	@Get('/')
	@GlobalScope('orchestration:read')
	async getClusterInfo(): Promise<ClusterInfoResponse> {
		const instances = await this.instanceRegistryService.getAllInstances();

		return {
			instances,
			versionMismatch: null,
		};
	}
}
