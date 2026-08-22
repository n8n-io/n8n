import { Service } from '@n8n/di';

import { InstanceRegistryService } from '@/modules/instance-registry/instance-registry.service';

/** Discovers worker pool names registered by workers in the cluster. */
@Service()
export class WorkerPoolsService {
	constructor(private readonly instanceRegistryService: InstanceRegistryService) {}

	async getAvailablePools(): Promise<string[]> {
		const instances = await this.instanceRegistryService.getAllInstances();

		const poolNames = new Set<string>();
		for (const instance of instances) {
			if (instance.instanceType !== 'worker') continue;
			if (instance.poolName) poolNames.add(instance.poolName);
		}

		return Array.from(poolNames).sort();
	}
}
