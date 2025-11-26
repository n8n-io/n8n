import { Service } from '@n8n/di';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeInstanceRule,
	InstanceDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@Service()
export class QueueWorkerMaxStalledCountRule implements IBreakingChangeInstanceRule {
	id: string = 'queue-worker-max-stalled-count-v2';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v2',
			title: 'Remove QUEUE_WORKER_MAX_STALLED_COUNT',
			description:
				'The QUEUE_WORKER_MAX_STALLED_COUNT environment variable has been removed and will be ignored',
			category: BreakingChangeCategory.environment,
			severity: 'low',
			documentationUrl:
				'https://docs.n8n.io/2-0-breaking-changes/#remove-queue_worker_max_stalled_count',
		};
	}

	async detect(): Promise<InstanceDetectionReport> {
		const result: InstanceDetectionReport = {
			isAffected: false,
			instanceIssues: [],
			recommendations: [],
		};

		// If QUEUE_WORKER_MAX_STALLED_COUNT is not set, the instance is not affected
		// because the default behavior remains unchanged
		if (!process.env.QUEUE_WORKER_MAX_STALLED_COUNT) {
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
