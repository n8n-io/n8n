import type { BannerName } from '@n8n/api-types';
import type { SettingsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

import { BannerService } from '@/services/banner.service';

describe('BannerService', () => {
	const settingsRepo = mock<SettingsRepository>();
	const errorReporter = mock<ErrorReporter>();
	const bannerService = new BannerService(settingsRepo, errorReporter);

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('dismissBanner', () => {
		const key = 'ui.banners.dismissed';
		const bannerName: BannerName = 'TRIAL';

		it('should save the banner name to settings if no banners are dismissed yet', async () => {
			settingsRepo.findOneBy.mockResolvedValue(null);

			await bannerService.dismissBanner(bannerName);

			expect(settingsRepo.save).toHaveBeenCalledWith(
				{ key, value: JSON.stringify([bannerName]), loadOnStartup: true },
				{ transaction: false },
			);
		});

		it('should update settings with the new banner name if banners are already dismissed', async () => {
			const dismissedBanners = ['TRIAL_OVER'];
			settingsRepo.findOneBy.mockResolvedValue({
				key,
				value: JSON.stringify(dismissedBanners),
				loadOnStartup: false,
			});

			await bannerService.dismissBanner(bannerName);

			expect(settingsRepo.update).toHaveBeenCalledWith(
				{ key },
				{ value: JSON.stringify([bannerName, 'TRIAL_OVER']), loadOnStartup: true },
			);
		});

		it('should handle errors when saving settings', async () => {
			const error = new UnexpectedError('Test error');
			settingsRepo.findOneBy.mockResolvedValue(null);
			settingsRepo.save.mockRejectedValue(error);

			await bannerService.dismissBanner(bannerName);

			expect(errorReporter.error).toHaveBeenCalledWith(error);
		});
	});
});
