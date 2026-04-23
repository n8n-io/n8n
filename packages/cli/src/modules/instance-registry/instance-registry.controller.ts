import type { ClusterCheckSummary, ClusterInfoResponse } from '@n8n/api-types';
import { Get, GlobalScope, RestController } from '@n8n/decorators';

import { CheckService } from './checks/check.service';
import { InstanceRegistryService } from './instance-registry.service';

@RestController('/instance-registry')
export class InstanceRegistryController {
	constructor(
		private readonly instanceRegistryService: InstanceRegistryService,
		private readonly checkService: CheckService,
	) {}

	@Get('/')
	@GlobalScope('orchestration:read')
	async getClusterInfo(): Promise<ClusterInfoResponse> {
		const [instances, { results }] = await Promise.all([
			this.instanceRegistryService.getAllInstances(),
			this.checkService.runChecks(),
		]);

		const checks = results.reduce((acc, cur) => {
			if (!acc[cur.checkName]) {
				acc[cur.checkName] = {
					status: 'succeeded',
					check: cur.checkName,
					executedAt: new Date().getTime(),
					warnings: [],
				};
			}

			const curWarnings = cur.result?.warnings ?? [];
			if (curWarnings.length > 0) {
				acc[cur.checkName].status = 'failed';
				acc[cur.checkName].warnings = curWarnings.map((warning) => ({
					check: cur.checkName,
					code: warning.code,
					message: warning.message,
					severity: warning.severity,
					context: warning.context,
				}));
			}

			if (cur.failed === true) {
				acc[cur.checkName].status = 'failed';
				acc[cur.checkName].warnings = [
					{
						check: cur.checkName,
						code: 'cluster.check-execution-failed',
						message: 'Failed to execute cluster check, please check error logs for details',
						severity: 'warning',
					},
				];
			}
			return acc;
		}, {} as ClusterCheckSummary);

		return {
			instances,
			checks,
		};
	}
}
