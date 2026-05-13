import type { WorkerPoolsResponse } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { WorkerPoolDefaultsService } from './worker-pool-defaults.service';

@Service()
export class WorkerPoolsService {
	constructor(private readonly poolDefaultsService: WorkerPoolDefaultsService) {}

	async getAvailablePools(): Promise<string[]> {
		// TODO: read pool names from cluster state store once workers register their pool
		return ['default'];
	}

	async getPoolsState(): Promise<WorkerPoolsResponse> {
		const [pools, defaults] = await Promise.all([
			this.getAvailablePools(),
			this.poolDefaultsService.getDefaults(),
		]);

		return { pools, defaults };
	}
}
