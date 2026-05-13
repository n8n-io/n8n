import type { WorkerPoolsResponse } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { InstanceRegistryService } from '@/modules/instance-registry/instance-registry.service';

import { PoolConfigService } from './pool-config.service';

@Service()
export class WorkerPoolsService {
	constructor(
		private readonly poolConfigService: PoolConfigService,
		private readonly instanceRegistryService: InstanceRegistryService,
	) {}

	async getAvailablePools(): Promise<string[]> {
		const instances = await this.instanceRegistryService.getAllInstances();

		const poolNames = new Set<string>();
		for (const instance of instances) {
			if (instance.instanceType !== 'worker') continue;
			if (instance.poolName) poolNames.add(instance.poolName);
		}

		return Array.from(poolNames).sort();
	}

	async getPoolsState(): Promise<WorkerPoolsResponse> {
		const [pools, assignment] = await Promise.all([
			this.getAvailablePools(),
			this.poolConfigService.getPoolAssignment(),
		]);

		return { pools, assignment };
	}
}
