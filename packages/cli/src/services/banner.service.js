'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.BannerService = void 0;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const config_1 = __importDefault(require('@/config'));
let BannerService = class BannerService {
	constructor(settingsRepository, errorReporter) {
		this.settingsRepository = settingsRepository;
		this.errorReporter = errorReporter;
	}
	async dismissBanner(bannerName) {
		const key = 'ui.banners.dismissed';
		const dismissedBannersSetting = await this.settingsRepository.findOneBy({ key });
		try {
			let value;
			if (dismissedBannersSetting) {
				const dismissedBanners = JSON.parse(dismissedBannersSetting.value);
				const updatedValue = [...new Set([...dismissedBanners, bannerName].sort())];
				value = JSON.stringify(updatedValue);
				await this.settingsRepository.update({ key }, { value, loadOnStartup: true });
			} else {
				value = JSON.stringify([bannerName]);
				await this.settingsRepository.save(
					{ key, value, loadOnStartup: true },
					{ transaction: false },
				);
			}
			config_1.default.set(key, value);
		} catch (error) {
			this.errorReporter.error(error);
		}
	}
};
exports.BannerService = BannerService;
exports.BannerService = BannerService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [db_1.SettingsRepository, n8n_core_1.ErrorReporter]),
	],
	BannerService,
);
//# sourceMappingURL=banner.service.js.map
