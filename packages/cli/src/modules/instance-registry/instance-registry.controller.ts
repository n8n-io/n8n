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

		const now = Date.now();

		const checks = results.reduce((acc, cur) => {
			const { checkName, result, failed } = cur;

			if (!acc[checkName]) {
				acc[checkName] = {
					status: 'succeeded',
					check: cur.checkName,
					executedAt: now,
					warnings: [],
				};
			}

			const entry = acc[checkName];

			const newWarnings =
				result?.warnings?.map((w) => ({
					check: checkName,
					...w, // Assuming the warning object structure matches
				})) ?? [];

			if (newWarnings.length > 0) {
				entry.status = 'failed';
				entry.warnings.push(...newWarnings);
			}

			if (failed) {
				entry.status = 'failed';
				entry.warnings.push({
					check: cur.checkName,
					code: 'cluster.check-execution-failed',
					message: 'Failed to execute cluster check, please check error logs for details',
					severity: 'warning',
				});
			}

			return acc;
		}, {} as ClusterCheckSummary);

		return {
			instances,
			checks,
		};
	}
}
