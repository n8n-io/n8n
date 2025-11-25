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
			title: 'QUEUE_WORKER_MAX_STALLED_COUNT now defaults to 0',
			description:
				'The QUEUE_WORKER_MAX_STALLED_COUNT environment variable now defaults to 0 instead of 1',
			category: BreakingChangeCategory.environment,
			severity: 'low',
			documentationUrl:
				'https://docs.n8n.io/2-0-breaking-changes/#queue_worker_max_stalled_count-defaults-to-0',
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
			title: 'QUEUE_WORKER_MAX_STALLED_COUNT default value changed',
			description:
				'The QUEUE_WORKER_MAX_STALLED_COUNT environment variable now defaults to 0 instead of 1. If you have explicitly set this value, verify it still meets your needs.',
			level: 'warning',
		});

		result.recommendations.push({
			action: 'Review environment variable value',
			description:
				'Review your QUEUE_WORKER_MAX_STALLED_COUNT setting to ensure it aligns with the new default behavior of 0 retries for stalled jobs',
		});

		return result;
	}
}
