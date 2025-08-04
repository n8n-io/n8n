'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
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
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.LicenseService = exports.LicenseErrors = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const axios_1 = __importStar(require('axios'));
const n8n_workflow_1 = require('n8n-workflow');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const event_service_1 = require('@/events/event.service');
const license_1 = require('@/license');
const url_service_1 = require('@/services/url.service');
exports.LicenseErrors = {
	SCHEMA_VALIDATION: 'Activation key is in the wrong format',
	RESERVATION_EXHAUSTED: 'Activation key has been used too many times',
	RESERVATION_EXPIRED: 'Activation key has expired',
	NOT_FOUND: 'Activation key not found',
	RESERVATION_CONFLICT: 'Activation key not found',
	RESERVATION_DUPLICATE: 'Activation key has already been used on this instance',
};
let LicenseService = class LicenseService {
	constructor(logger, license, licenseState, workflowRepository, urlService, eventService) {
		this.logger = logger;
		this.license = license;
		this.licenseState = licenseState;
		this.workflowRepository = workflowRepository;
		this.urlService = urlService;
		this.eventService = eventService;
	}
	async getLicenseData() {
		const triggerCount = await this.workflowRepository.getActiveTriggerCount();
		const workflowsWithEvaluationsCount =
			await this.workflowRepository.getWorkflowsWithEvaluationCount();
		const mainPlan = this.license.getMainPlan();
		return {
			usage: {
				activeWorkflowTriggers: {
					value: triggerCount,
					limit: this.license.getTriggerLimit(),
					warningThreshold: 0.8,
				},
				workflowsHavingEvaluations: {
					value: workflowsWithEvaluationsCount,
					limit: this.licenseState.getMaxWorkflowsWithEvaluations(),
				},
			},
			license: {
				planId: mainPlan?.productId ?? '',
				planName: this.license.getPlanName(),
			},
		};
	}
	async requestEnterpriseTrial(user) {
		await axios_1.default.post('https://enterprise.n8n.io/enterprise-trial', {
			licenseType: 'enterprise',
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			instanceUrl: this.urlService.getWebhookBaseUrl(),
		});
	}
	async registerCommunityEdition({ userId, email, instanceId, instanceUrl, licenseType }) {
		try {
			const {
				data: { licenseKey, ...rest },
			} = await axios_1.default.post('https://enterprise.n8n.io/community-registered', {
				email,
				instanceId,
				instanceUrl,
				licenseType,
			});
			this.eventService.emit('license-community-plus-registered', { userId, email, licenseKey });
			return rest;
		} catch (e) {
			if (e instanceof axios_1.AxiosError) {
				const error = e;
				const errorMsg = error.response?.data?.message ?? e.message;
				throw new bad_request_error_1.BadRequestError(
					'Failed to register community edition: ' + errorMsg,
				);
			} else {
				this.logger.error('Failed to register community edition', {
					error: (0, n8n_workflow_1.ensureError)(e),
				});
				throw new bad_request_error_1.BadRequestError('Failed to register community edition');
			}
		}
	}
	getManagementJwt() {
		return this.license.getManagementJwt();
	}
	async activateLicense(activationKey) {
		try {
			await this.license.activate(activationKey);
		} catch (e) {
			const message = this.mapErrorMessage(e, 'activate');
			throw new bad_request_error_1.BadRequestError(message);
		}
	}
	async renewLicense() {
		if (this.license.getPlanName() === 'Community') return;
		try {
			await this.license.renew();
		} catch (e) {
			const message = this.mapErrorMessage(e, 'renew');
			this.eventService.emit('license-renewal-attempted', { success: false });
			throw new bad_request_error_1.BadRequestError(message);
		}
		this.eventService.emit('license-renewal-attempted', { success: true });
	}
	mapErrorMessage(error, action) {
		let message = error.errorId && exports.LicenseErrors[error.errorId];
		if (!message) {
			message = `Failed to ${action} license: ${error.message}`;
			this.logger.error(message, { stack: error.stack ?? 'n/a' });
		}
		return message;
	}
};
exports.LicenseService = LicenseService;
exports.LicenseService = LicenseService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			license_1.License,
			backend_common_1.LicenseState,
			db_1.WorkflowRepository,
			url_service_1.UrlService,
			event_service_1.EventService,
		]),
	],
	LicenseService,
);
//# sourceMappingURL=license.service.js.map
