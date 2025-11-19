import { QueueWorkerMaxStalledCountRule } from '../queue-worker-max-stalled-count.rule';

describe('QueueWorkerMaxStalledCountRule', () => {
	let rule: QueueWorkerMaxStalledCountRule;

	beforeEach(() => {
		rule = new QueueWorkerMaxStalledCountRule();
	});

	describe('detect()', () => {
		it('should not be affected when QUEUE_WORKER_MAX_STALLED_COUNT is not defined', async () => {
			delete process.env.QUEUE_WORKER_MAX_STALLED_COUNT;

			const result = await rule.detect();

			expect(result.isAffected).toBe(false);
			expect(result.instanceIssues).toHaveLength(0);
		});

		it('should be affected when QUEUE_WORKER_MAX_STALLED_COUNT is set', async () => {
			process.env.QUEUE_WORKER_MAX_STALLED_COUNT = '10';
			const result = await rule.detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].title).toBe('QUEUE_WORKER_MAX_STALLED_COUNT is deprecated');
		});
	});
});
