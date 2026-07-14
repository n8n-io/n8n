import { ExecutionsConfig } from '@n8n/config';
import { BreakingChangeRule } from '@n8n/decorators';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@BreakingChangeRule({ version: 'v3' })
export class OffloadManualExecutionsRule implements IBreakingChangeInstanceRule {
	constructor(private readonly executionsConfig: ExecutionsConfig) {}

	id: string = 'offload-manual-executions-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'Manual executions always run on workers in queue mode',
			description:
				'In queue mode, manual executions are always routed to workers. The OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS environment variable is removed and running manual executions on the main instance is no longer possible.',
			category: BreakingChangeCategory.instance,
			severity: 'medium',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		const isAffected =
			this.executionsConfig.mode === 'queue' &&
			process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS !== 'true';

		if (!isAffected) return { isAffected: false, instanceIssues: [], recommendations: [] };

		return {
			isAffected: true,
			instanceIssues: [
				{
					title: 'Manual executions currently run on the main instance',
					description:
						'This instance runs in queue mode without offloading manual executions to workers. After the update, all manual executions run on workers, which changes where their load lands.',
					level: 'warning',
				},
			],
			recommendations: [
				{
					action: 'Enable offloading before updating',
					description:
						'Set OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS=true to adopt the new behavior early. Consider increasing memory available to workers and reducing memory available to main.',
				},
			],
		};
	}
}
