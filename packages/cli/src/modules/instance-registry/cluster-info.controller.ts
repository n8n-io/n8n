import type { ClusterInfo } from '@n8n/api-types';
// ponytail: GlobalScope import dropped while the auth gate is commented out for the PoC; restore both together.
import { Get, RestController } from '@n8n/decorators';

import { SupervisorInfoClient } from '@/scaling/hypervisor-supervisor-info';

/**
 * Reports the process that answered this request (`self`) plus, under the
 * hypervisor, live details of every forked child (`processes`, aggregated by the
 * primary). Because HTTP round-robins across the mains, consecutive polls may
 * answer from different PIDs — that is expected. Follows the instance-registry
 * controller's conventions.
 */
@RestController('/cluster-info')
export class ClusterInfoController {
	constructor(private readonly supervisorInfo: SupervisorInfoClient) {}

	@Get('/')
	// @GlobalScope('orchestration:read')
	async getClusterInfo(): Promise<ClusterInfo> {
		const local = this.supervisorInfo.buildLocalInfo();
		const respawnCount = await this.supervisorInfo.getRespawnCount(local.role);
		const self = { ...local, ...(respawnCount !== undefined && { respawnCount }) };
		const processes = (await this.supervisorInfo.getAllProcesses()) ?? [];

		return { self, processes };
	}
}
