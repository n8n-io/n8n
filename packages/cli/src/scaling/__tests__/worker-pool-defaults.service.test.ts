import type { SettingsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { WorkerPoolDefaultsService } from '@/scaling/worker-pool-defaults.service';

describe('WorkerPoolDefaultsService', () => {
	const settingsRepository = mock<SettingsRepository>();
	const service = new WorkerPoolDefaultsService(settingsRepository);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getDefaults', () => {
		it('should return persisted values when all keys are set', async () => {
			settingsRepository.findByKeys.mockResolvedValue([
				{ key: 'workers.defaultPool.production', value: 'prod-pool', loadOnStartup: true },
				{ key: 'workers.defaultPool.manual', value: 'manual-pool', loadOnStartup: true },
				{ key: 'workers.defaultPool.evaluation', value: 'eval-pool', loadOnStartup: true },
			]);

			const defaults = await service.getDefaults();

			expect(defaults).toEqual({
				production: 'prod-pool',
				manual: 'manual-pool',
				evaluation: 'eval-pool',
			});
		});

		it('should fall back to "default" for any missing key', async () => {
			settingsRepository.findByKeys.mockResolvedValue([
				{ key: 'workers.defaultPool.production', value: 'prod-pool', loadOnStartup: true },
			]);

			const defaults = await service.getDefaults();

			expect(defaults).toEqual({
				production: 'prod-pool',
				manual: 'default',
				evaluation: 'default',
			});
		});

		it('should fall back to "default" for all keys when none are set', async () => {
			settingsRepository.findByKeys.mockResolvedValue([]);

			const defaults = await service.getDefaults();

			expect(defaults).toEqual({
				production: 'default',
				manual: 'default',
				evaluation: 'default',
			});
		});
	});

	describe('setDefaults', () => {
		it('should upsert only the provided keys with loadOnStartup', async () => {
			settingsRepository.findByKeys.mockResolvedValue([
				{ key: 'workers.defaultPool.production', value: 'prod-pool', loadOnStartup: true },
			]);

			await service.setDefaults({ production: 'prod-pool' });

			expect(settingsRepository.upsert).toHaveBeenCalledTimes(1);
			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				{ key: 'workers.defaultPool.production', value: 'prod-pool', loadOnStartup: true },
				['key'],
			);
		});

		it('should upsert multiple keys when multiple fields are provided', async () => {
			settingsRepository.findByKeys.mockResolvedValue([]);

			await service.setDefaults({ production: 'prod-pool', evaluation: 'eval-pool' });

			expect(settingsRepository.upsert).toHaveBeenCalledTimes(2);
			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				{ key: 'workers.defaultPool.production', value: 'prod-pool', loadOnStartup: true },
				['key'],
			);
			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				{ key: 'workers.defaultPool.evaluation', value: 'eval-pool', loadOnStartup: true },
				['key'],
			);
		});

		it('should return the merged defaults after writing', async () => {
			settingsRepository.findByKeys.mockResolvedValue([
				{ key: 'workers.defaultPool.production', value: 'prod-pool', loadOnStartup: true },
			]);

			const result = await service.setDefaults({ production: 'prod-pool' });

			expect(result).toEqual({
				production: 'prod-pool',
				manual: 'default',
				evaluation: 'default',
			});
		});
	});
});
