import type { WorkerPoolsResponse } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { PoolConfigService } from './pool-config.service';

@Service()
export class WorkerPoolsService {
	constructor(private readonly poolConfigService: PoolConfigService) {}

	async getAvailablePools(): Promise<string[]> {
		// TODO: read pool names from cluster state store once workers register their pool
		return ['default'];
	}

	async getPoolsState(): Promise<WorkerPoolsResponse> {
		const [pools, assignment] = await Promise.all([
			this.getAvailablePools(),
			this.poolConfigService.getPoolAssignment(),
		]);

		return { pools, assignment };
	}
}
