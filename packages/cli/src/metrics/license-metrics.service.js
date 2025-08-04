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
exports.LicenseMetricsService = void 0;
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
let LicenseMetricsService = class LicenseMetricsService {
	constructor(licenseMetricsRepository, workflowRepository) {
		this.licenseMetricsRepository = licenseMetricsRepository;
		this.workflowRepository = workflowRepository;
	}
	async collectUsageMetrics() {
		const {
			activeWorkflows,
			totalWorkflows,
			enabledUsers,
			totalUsers,
			totalCredentials,
			productionExecutions,
			productionRootExecutions,
			manualExecutions,
		} = await this.licenseMetricsRepository.getLicenseRenewalMetrics();
		const [activeTriggerCount, workflowsWithEvaluationsCount] = await Promise.all([
			this.workflowRepository.getActiveTriggerCount(),
			this.workflowRepository.getWorkflowsWithEvaluationCount(),
		]);
		return [
			{ name: 'activeWorkflows', value: activeWorkflows },
			{ name: 'totalWorkflows', value: totalWorkflows },
			{ name: 'enabledUsers', value: enabledUsers },
			{ name: 'totalUsers', value: totalUsers },
			{ name: 'totalCredentials', value: totalCredentials },
			{ name: 'productionExecutions', value: productionExecutions },
			{ name: 'productionRootExecutions', value: productionRootExecutions },
			{ name: 'manualExecutions', value: manualExecutions },
			{ name: 'activeWorkflowTriggers', value: activeTriggerCount },
			{ name: 'evaluations', value: workflowsWithEvaluationsCount },
		];
	}
	async collectPassthroughData() {
		return {
			activeWorkflowIds: await this.workflowRepository.getActiveIds({ maxResults: 1000 }),
		};
	}
};
exports.LicenseMetricsService = LicenseMetricsService;
exports.LicenseMetricsService = LicenseMetricsService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [db_1.LicenseMetricsRepository, db_1.WorkflowRepository]),
	],
	LicenseMetricsService,
);
//# sourceMappingURL=license-metrics.service.js.map
