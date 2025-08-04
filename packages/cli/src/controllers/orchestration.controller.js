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
exports.OrchestrationController = void 0;
const decorators_1 = require('@n8n/decorators');
const license_1 = require('@/license');
const worker_status_service_ee_1 = require('@/scaling/worker-status.service.ee');
let OrchestrationController = class OrchestrationController {
	constructor(licenseService, workerStatusService) {
		this.licenseService = licenseService;
		this.workerStatusService = workerStatusService;
	}
	async getWorkersStatusAll() {
		if (!this.licenseService.isWorkerViewLicensed()) return;
		return await this.workerStatusService.requestWorkerStatus();
	}
};
exports.OrchestrationController = OrchestrationController;
__decorate(
	[
		(0, decorators_1.GlobalScope)('orchestration:read'),
		(0, decorators_1.Post)('/worker/status'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	OrchestrationController.prototype,
	'getWorkersStatusAll',
	null,
);
exports.OrchestrationController = OrchestrationController = __decorate(
	[
		(0, decorators_1.RestController)('/orchestration'),
		__metadata('design:paramtypes', [
			license_1.License,
			worker_status_service_ee_1.WorkerStatusService,
		]),
	],
	OrchestrationController,
);
//# sourceMappingURL=orchestration.controller.js.map
