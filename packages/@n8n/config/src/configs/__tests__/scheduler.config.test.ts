import { Container } from '@n8n/di';

import { GlobalConfig } from '../../index';

describe('SchedulerConfig', () => {
	beforeEach(() => {
		Container.reset();
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('flag off (defaults)', () => {
		it('should be disabled by default', () => {
			const { scheduler } = Container.get(GlobalConfig);

			expect(scheduler.enabled).toBe(false);
		});

		it('should use default tunables', () => {
			const { scheduler } = Container.get(GlobalConfig);

			expect(scheduler.materializationWindowSeconds).toBe(60);
			expect(scheduler.sweepIntervalSeconds).toBe(10);
			expect(scheduler.executorIntervalSeconds).toBe(5);
			expect(scheduler.claimBatchSize).toBe(100);
			expect(scheduler.reaperIntervalSeconds).toBe(30);
			expect(scheduler.reaperBatchSize).toBe(100);
			expect(scheduler.leaseDurationSeconds).toBe(60);
			expect(scheduler.retentionSeconds).toBe(24 * 60 * 60);
			expect(scheduler.failedRetentionSeconds).toBe(7 * 24 * 60 * 60);
			expect(scheduler.retentionIntervalSeconds).toBe(60 * 60);
			expect(scheduler.minIntervalSeconds).toBe(0);
			expect(scheduler.jitterRatio).toBe(0.1);
			expect(scheduler.sweepTimeoutSeconds).toBe(60);
			expect(scheduler.executorTimeoutSeconds).toBe(60);
			expect(scheduler.reaperTimeoutSeconds).toBe(60);
			expect(scheduler.retentionTimeoutSeconds).toBe(5 * 60);
			expect(scheduler.maxConcurrentPasses).toBe(10);
		});
	});

	describe('flag on (env overrides)', () => {
		it('should enable via env', () => {
			vi.stubEnv('N8N_SCHEDULER_ENABLED', 'true');

			const { scheduler } = Container.get(GlobalConfig);

			expect(scheduler.enabled).toBe(true);
		});

		it('should override each tunable from env', () => {
			vi.stubEnv('N8N_SCHEDULER_MATERIALIZATION_WINDOW', '120');
			vi.stubEnv('N8N_SCHEDULER_SWEEP_INTERVAL', '20');
			vi.stubEnv('N8N_SCHEDULER_EXECUTOR_INTERVAL', '2');
			vi.stubEnv('N8N_SCHEDULER_REAPER_INTERVAL', '45');
			vi.stubEnv('N8N_SCHEDULER_LEASE_DURATION', '90');
			vi.stubEnv('N8N_SCHEDULER_RETENTION', '43200');
			vi.stubEnv('N8N_SCHEDULER_FAILED_RETENTION', '86400');
			vi.stubEnv('N8N_SCHEDULER_RETENTION_INTERVAL', '600');
			vi.stubEnv('N8N_SCHEDULER_MIN_INTERVAL', '15');
			vi.stubEnv('N8N_SCHEDULER_JITTER_RATIO', '0.25');
			vi.stubEnv('N8N_SCHEDULER_SWEEP_TIMEOUT', '30');
			vi.stubEnv('N8N_SCHEDULER_EXECUTOR_TIMEOUT', '15');
			vi.stubEnv('N8N_SCHEDULER_REAPER_TIMEOUT', '45');
			vi.stubEnv('N8N_SCHEDULER_RETENTION_TIMEOUT', '120');
			vi.stubEnv('N8N_SCHEDULER_MAX_CONCURRENT_PASSES', '4');

			const { scheduler } = Container.get(GlobalConfig);

			expect(scheduler.materializationWindowSeconds).toBe(120);
			expect(scheduler.sweepIntervalSeconds).toBe(20);
			expect(scheduler.executorIntervalSeconds).toBe(2);
			expect(scheduler.reaperIntervalSeconds).toBe(45);
			expect(scheduler.leaseDurationSeconds).toBe(90);
			expect(scheduler.retentionSeconds).toBe(43200);
			expect(scheduler.failedRetentionSeconds).toBe(86400);
			expect(scheduler.retentionIntervalSeconds).toBe(600);
			expect(scheduler.minIntervalSeconds).toBe(15);
			expect(scheduler.jitterRatio).toBe(0.25);
			expect(scheduler.sweepTimeoutSeconds).toBe(30);
			expect(scheduler.executorTimeoutSeconds).toBe(15);
			expect(scheduler.reaperTimeoutSeconds).toBe(45);
			expect(scheduler.retentionTimeoutSeconds).toBe(120);
			expect(scheduler.maxConcurrentPasses).toBe(4);
		});

		it('should allow disabling the min-interval clamp with 0', () => {
			vi.stubEnv('N8N_SCHEDULER_MIN_INTERVAL', '0');

			const { scheduler } = Container.get(GlobalConfig);

			expect(scheduler.minIntervalSeconds).toBe(0);
		});
	});
});
