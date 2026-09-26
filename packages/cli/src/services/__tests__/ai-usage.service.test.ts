import { mockInstance } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type { Settings } from '@n8n/db';
import { SettingsRepository } from '@n8n/db';

import config from '@/config';
import { AiUsageService } from '@/services/ai-usage.service';
import { CacheService } from '@/services/cache/cache.service';

vi.mock('@/config', () => ({ default: { set: vi.fn() } }));

describe('AiUsageService', () => {
	const settingsRepository = mockInstance(SettingsRepository);
	const cacheService = mockInstance(CacheService);

	const globalConfig = { ai: { allowSendingParameterValues: true } } as GlobalConfig;

	const aiUsageService = new AiUsageService(settingsRepository, cacheService, globalConfig);

	beforeEach(() => {
		vi.clearAllMocks();
		globalConfig.ai.allowSendingParameterValues = true;
	});

	describe('isParameterValueSharingAllowed()', () => {
		it('should return false without reading the stored value when the env var is false', async () => {
			globalConfig.ai.allowSendingParameterValues = false;

			const result = await aiUsageService.isParameterValueSharingAllowed();

			expect(result).toBe(false);
			expect(cacheService.get).not.toHaveBeenCalled();
			expect(settingsRepository.findByKey).not.toHaveBeenCalled();
		});

		it('should return false when the env var is true and the stored value is false', async () => {
			cacheService.get.mockResolvedValue('false');

			const result = await aiUsageService.isParameterValueSharingAllowed();

			expect(result).toBe(false);
		});

		it('should return true when the env var and the stored value are both true', async () => {
			cacheService.get.mockResolvedValue('true');

			const result = await aiUsageService.isParameterValueSharingAllowed();

			expect(result).toBe(true);
		});
	});

	describe('getAiUsageSettings()', () => {
		it('should return true when cache has value "true"', async () => {
			cacheService.get.mockResolvedValue('true');

			const result = await aiUsageService.getAiUsageSettings();

			expect(result).toBe(true);
			expect(settingsRepository.findByKey).not.toHaveBeenCalled();
		});

		it('should return false when cache has value "false"', async () => {
			cacheService.get.mockResolvedValue('false');

			const result = await aiUsageService.getAiUsageSettings();

			expect(result).toBe(false);
			expect(settingsRepository.findByKey).not.toHaveBeenCalled();
		});

		it('should query database when cache is empty', async () => {
			cacheService.get.mockResolvedValue(undefined);
			settingsRepository.findByKey.mockResolvedValue({ value: 'true' } as Settings);

			const result = await aiUsageService.getAiUsageSettings();

			expect(result).toBe(true);
			expect(settingsRepository.findByKey).toHaveBeenCalledWith('ai.allowSendingParameterValues');
			expect(cacheService.set).toHaveBeenCalledWith('ai.allowSendingParameterValues', 'true');
		});

		it('should return false when database has value "false"', async () => {
			cacheService.get.mockResolvedValue(undefined);
			settingsRepository.findByKey.mockResolvedValue({ value: 'false' } as Settings);

			const result = await aiUsageService.getAiUsageSettings();

			expect(result).toBe(false);
			expect(cacheService.set).toHaveBeenCalledWith('ai.allowSendingParameterValues', 'false');
		});

		it('should default to true when setting is not found in database', async () => {
			cacheService.get.mockResolvedValue(undefined);
			settingsRepository.findByKey.mockResolvedValue(null);

			const result = await aiUsageService.getAiUsageSettings();

			expect(result).toBe(true);
			expect(cacheService.set).toHaveBeenCalledWith('ai.allowSendingParameterValues', 'true');
		});
	});

	describe('updateAiUsageSettings()', () => {
		it('should update setting to true', async () => {
			settingsRepository.upsert.mockResolvedValue(undefined as never);

			await aiUsageService.updateAiUsageSettings(true);

			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				{ key: 'ai.allowSendingParameterValues', value: 'true', loadOnStartup: true },
				['key'],
			);
			expect(cacheService.set).toHaveBeenCalledWith('ai.allowSendingParameterValues', 'true');
			expect(config.set).toHaveBeenCalledWith('ai.allowSendingParameterValues', true);
		});

		it('should update setting to false', async () => {
			settingsRepository.upsert.mockResolvedValue(undefined as never);

			await aiUsageService.updateAiUsageSettings(false);

			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				{ key: 'ai.allowSendingParameterValues', value: 'false', loadOnStartup: true },
				['key'],
			);
			expect(cacheService.set).toHaveBeenCalledWith('ai.allowSendingParameterValues', 'false');
			expect(config.set).toHaveBeenCalledWith('ai.allowSendingParameterValues', false);
		});
	});
});
