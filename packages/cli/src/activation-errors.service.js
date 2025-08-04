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
Object.defineProperty(exports, '__esModule', { value: true });
exports.ActivationErrorsService = void 0;
const di_1 = require('@n8n/di');
const cache_service_1 = require('@/services/cache/cache.service');
let ActivationErrorsService = class ActivationErrorsService {
	constructor(cacheService) {
		this.cacheService = cacheService;
		this.cacheKey = 'workflow-activation-errors';
	}
	async register(workflowId, errorMessage) {
		await this.cacheService.setHash(this.cacheKey, { [workflowId]: errorMessage });
	}
	async deregister(workflowId) {
		await this.cacheService.deleteFromHash(this.cacheKey, workflowId);
	}
	async get(workflowId) {
		const activationError = await this.cacheService.getHashValue(this.cacheKey, workflowId);
		if (!activationError) return null;
		return activationError;
	}
	async getAll() {
		const activationErrors = await this.cacheService.getHash(this.cacheKey);
		if (!activationErrors) return {};
		return activationErrors;
	}
	async clearAll() {
		await this.cacheService.delete(this.cacheKey);
	}
};
exports.ActivationErrorsService = ActivationErrorsService;
exports.ActivationErrorsService = ActivationErrorsService = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [cache_service_1.CacheService])],
	ActivationErrorsService,
);
//# sourceMappingURL=activation-errors.service.js.map
