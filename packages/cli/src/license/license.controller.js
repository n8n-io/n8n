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
var __param =
	(this && this.__param) ||
	function (paramIndex, decorator) {
		return function (target, key) {
			decorator(target, key, paramIndex);
		};
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.LicenseController = void 0;
const api_types_1 = require('@n8n/api-types');
const decorators_1 = require('@n8n/decorators');
const n8n_core_1 = require('n8n-core');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const url_service_1 = require('@/services/url.service');
const license_service_1 = require('./license.service');
let LicenseController = class LicenseController {
	constructor(licenseService, instanceSettings, urlService) {
		this.licenseService = licenseService;
		this.instanceSettings = instanceSettings;
		this.urlService = urlService;
	}
	async getLicenseData() {
		return await this.licenseService.getLicenseData();
	}
	async requestEnterpriseTrial(req) {
		try {
			await this.licenseService.requestEnterpriseTrial(req.user);
		} catch (error) {
			if (error instanceof Error) {
				const errorMsg = error.response?.data?.message ?? error.message;
				throw new bad_request_error_1.BadRequestError(errorMsg);
			} else {
				throw new bad_request_error_1.BadRequestError('Failed to request trial');
			}
		}
	}
	async registerCommunityEdition(req, _res, payload) {
		return await this.licenseService.registerCommunityEdition({
			userId: req.user.id,
			email: payload.email,
			instanceId: this.instanceSettings.instanceId,
			instanceUrl: this.urlService.getInstanceBaseUrl(),
			licenseType: 'community-registered',
		});
	}
	async activateLicense(req) {
		const { activationKey } = req.body;
		await this.licenseService.activateLicense(activationKey);
		return await this.getTokenAndData();
	}
	async renewLicense() {
		await this.licenseService.renewLicense();
		return await this.getTokenAndData();
	}
	async getTokenAndData() {
		const managementToken = this.licenseService.getManagementJwt();
		const data = await this.licenseService.getLicenseData();
		return { ...data, managementToken };
	}
};
exports.LicenseController = LicenseController;
__decorate(
	[
		(0, decorators_1.Get)('/'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	LicenseController.prototype,
	'getLicenseData',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/enterprise/request_trial'),
		(0, decorators_1.GlobalScope)('license:manage'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	LicenseController.prototype,
	'requestEnterpriseTrial',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/enterprise/community-registered'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Response, api_types_1.CommunityRegisteredRequestDto]),
		__metadata('design:returntype', Promise),
	],
	LicenseController.prototype,
	'registerCommunityEdition',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/activate'),
		(0, decorators_1.GlobalScope)('license:manage'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	LicenseController.prototype,
	'activateLicense',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/renew'),
		(0, decorators_1.GlobalScope)('license:manage'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	LicenseController.prototype,
	'renewLicense',
	null,
);
exports.LicenseController = LicenseController = __decorate(
	[
		(0, decorators_1.RestController)('/license'),
		__metadata('design:paramtypes', [
			license_service_1.LicenseService,
			n8n_core_1.InstanceSettings,
			url_service_1.UrlService,
		]),
	],
	LicenseController,
);
//# sourceMappingURL=license.controller.js.map
