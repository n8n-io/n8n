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

			expect(scheduler.materializationWindow).toBe(60);
			expect(scheduler.sweepInterval).toBe(10);
			expect(scheduler.executorInterval).toBe(5);
			expect(scheduler.reaperInterval).toBe(30);
			expect(scheduler.leaseDuration).toBe(60);
			expect(scheduler.retention).toBe(7 * 24 * 60 * 60);
			expect(scheduler.minInterval).toBe(0);
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
			vi.stubEnv('N8N_SCHEDULER_RETENTION', '86400');
			vi.stubEnv('N8N_SCHEDULER_MIN_INTERVAL', '15');

			const { scheduler } = Container.get(GlobalConfig);

			expect(scheduler.materializationWindow).toBe(120);
			expect(scheduler.sweepInterval).toBe(20);
			expect(scheduler.executorInterval).toBe(2);
			expect(scheduler.reaperInterval).toBe(45);
			expect(scheduler.leaseDuration).toBe(90);
			expect(scheduler.retention).toBe(86400);
			expect(scheduler.minInterval).toBe(15);
		});

		it('should allow disabling the min-interval clamp with 0', () => {
			vi.stubEnv('N8N_SCHEDULER_MIN_INTERVAL', '0');

			const { scheduler } = Container.get(GlobalConfig);

			expect(scheduler.minInterval).toBe(0);
		});
	});
});
