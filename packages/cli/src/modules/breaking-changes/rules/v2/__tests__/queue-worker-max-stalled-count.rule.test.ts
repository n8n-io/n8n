import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import { QueueWorkerMaxStalledCountRule } from '../queue-worker-max-stalled-count.rule';

describe('QueueWorkerMaxStalledCountRule', () => {
	let rule: QueueWorkerMaxStalledCountRule;
	const globalConfig = mock<GlobalConfig>({
		queue: { bull: { settings: { maxStalledCount: 1 } } },
	});

	beforeEach(() => {
		rule = new QueueWorkerMaxStalledCountRule(globalConfig);
	});

	describe('detect()', () => {
		it('should not be affected when maxStalledCount is the default one', async () => {
			globalConfig.queue.bull.settings.maxStalledCount = 1;

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
		});

		it('should be affected when maxStalledCount is set', async () => {
			globalConfig.queue.bull.settings.maxStalledCount = 10;

			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].title).toBe('QUEUE_WORKER_MAX_STALLED_COUNT is deprecated');
		});
	});
});
