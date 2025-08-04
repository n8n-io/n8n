'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_workflow_1 = require('n8n-workflow');
const banner_service_1 = require('@/services/banner.service');
describe('BannerService', () => {
	const settingsRepo = (0, jest_mock_extended_1.mock)();
	const errorReporter = (0, jest_mock_extended_1.mock)();
	const bannerService = new banner_service_1.BannerService(settingsRepo, errorReporter);
	beforeEach(() => {
		jest.resetAllMocks();
	});
	describe('dismissBanner', () => {
		const key = 'ui.banners.dismissed';
		const bannerName = 'TRIAL';
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
			const error = new n8n_workflow_1.UnexpectedError('Test error');
			settingsRepo.findOneBy.mockResolvedValue(null);
			settingsRepo.save.mockRejectedValue(error);
			await bannerService.dismissBanner(bannerName);
			expect(errorReporter.error).toHaveBeenCalledWith(error);
		});
	});
});
//# sourceMappingURL=banner.service.test.js.map
