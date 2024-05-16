import { UsageMetricsRepository } from '@/databases/repositories/usageMetrics.repository';
import { Service } from 'typedi';

@Service()
export class UsageMetricsService {
	constructor(private readonly usageMetricsRepository: UsageMetricsRepository) {}

	async collectUsageMetrics() {
		const {
			activeWorkflows,
			totalWorkflows,
			enabledUsers,
			totalUsers,
			totalCredentials,
			productionExecutions,
			manualExecutions,
		} = await this.usageMetricsRepository.getLicenseRenewalMetrics();

		return [
			{ name: 'activeWorkflows', value: activeWorkflows },
			{ name: 'totalWorkflows', value: totalWorkflows },
			{ name: 'enabledUsers', value: enabledUsers },
			{ name: 'totalUsers', value: totalUsers },
			{ name: 'totalCredentials', value: totalCredentials },
			{ name: 'productionExecutions', value: productionExecutions },
			{ name: 'manualExecutions', value: manualExecutions },
		];
	}
}
