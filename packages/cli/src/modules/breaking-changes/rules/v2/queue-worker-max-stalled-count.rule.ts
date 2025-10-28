import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import type {
	BreakingChangeMetadata,
	InstanceDetectionResult,
	IBreakingChangeInstanceRule,
} from '../../types';
import { BreakingChangeSeverity, BreakingChangeCategory, IssueLevel } from '../../types';

@Service()
export class QueueWorkerMaxStalledCountRule implements IBreakingChangeInstanceRule {
	constructor(private readonly globalConfig: GlobalConfig) {}

	id: string = 'queue-worker-max-stalled-count-v2';

	getMetadata(): BreakingChangeMetadata {
		return {
			version: 'v2',
			title: 'Remove QUEUE_WORKER_MAX_STALLED_COUNT',
			description:
				'The QUEUE_WORKER_MAX_STALLED_COUNT environment variable has been removed and will be ignored',
			category: BreakingChangeCategory.environment,
			severity: BreakingChangeSeverity.low,
		};
	}

	async detect(): Promise<InstanceDetectionResult> {
		const result: InstanceDetectionResult = {
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
			level: IssueLevel.warning,
		});

		result.recommendations.push({
			action: 'Remove environment variable',
			description:
				'Remove QUEUE_WORKER_MAX_STALLED_COUNT from your environment configuration as it no longer has any effect',
		});

		return result;
	}
}
