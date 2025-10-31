import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@Service()
export class QueueWorkerMaxStalledCountRule implements IBreakingChangeInstanceRule {
	constructor(private readonly globalConfig: GlobalConfig) {}

	id: string = 'queue-worker-max-stalled-count-v2';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v2',
			title: 'Remove QUEUE_WORKER_MAX_STALLED_COUNT',
			description:
				'The QUEUE_WORKER_MAX_STALLED_COUNT environment variable has been removed and will be ignored',
			category: BreakingChangeCategory.environment,
			severity: 'low',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		const result: InstanceDetectionReport = {
			isAffected: false,
			instanceIssues: [],
			recommendations: [],
		};

		// Check if QUEUE_WORKER_MAX_STALLED_COUNT is set to a value other than the default (1)
		if (this.globalConfig.queue.bull.settings.maxStalledCount === 1) {
			return result;
		}

		result.isAffected = true;
		result.instanceIssues.push({
			title: 'QUEUE_WORKER_MAX_STALLED_COUNT is deprecated',
			description:
				'The QUEUE_WORKER_MAX_STALLED_COUNT environment variable has been removed. Any customization will be ignored in v2.',
			level: 'warning',
		});

		result.recommendations.push({
			action: 'Remove environment variable',
			description:
				'Remove QUEUE_WORKER_MAX_STALLED_COUNT from your environment configuration as it no longer has any effect',
		});

		return result;
	}
}
