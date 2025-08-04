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
exports.InsightsPruningService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const constants_1 = require('@n8n/constants');
const di_1 = require('@n8n/di');
const assert_1 = require('assert');
const insights_by_period_repository_1 = require('./database/repositories/insights-by-period.repository');
const insights_config_1 = require('./insights.config');
let InsightsPruningService = class InsightsPruningService {
	constructor(insightsByPeriodRepository, config, licenseState, logger) {
		this.insightsByPeriodRepository = insightsByPeriodRepository;
		this.config = config;
		this.licenseState = licenseState;
		this.logger = logger;
		this.isStopped = true;
		this.delayOnError = constants_1.Time.seconds.toMilliseconds;
		this.logger = this.logger.scoped('insights');
	}
	get isPruningEnabled() {
		return this.licenseState.getInsightsRetentionMaxAge() > -1 || this.config.maxAgeDays > -1;
	}
	get pruningMaxAgeInDays() {
		const toMaxSafeIfUnlimited = (days) => (days === -1 ? Number.MAX_SAFE_INTEGER : days);
		const licenseMaxAge = toMaxSafeIfUnlimited(this.licenseState.getInsightsRetentionMaxAge());
		const configMaxAge = toMaxSafeIfUnlimited(this.config.maxAgeDays);
		return Math.min(licenseMaxAge, configMaxAge);
	}
	startPruningTimer() {
		(0, assert_1.strict)(this.isStopped);
		this.clearPruningTimer();
		this.isStopped = false;
		this.scheduleNextPrune();
		this.logger.debug('Started pruning timer');
	}
	clearPruningTimer() {
		if (this.pruneInsightsTimeout !== undefined) {
			clearTimeout(this.pruneInsightsTimeout);
			this.pruneInsightsTimeout = undefined;
		}
	}
	stopPruningTimer() {
		this.isStopped = true;
		this.clearPruningTimer();
		this.logger.debug('Stopped pruning timer');
	}
	scheduleNextPrune(
		delayMs = this.config.pruneCheckIntervalHours * constants_1.Time.hours.toMilliseconds,
	) {
		if (this.isStopped) return;
		this.pruneInsightsTimeout = setTimeout(async () => {
			await this.pruneInsights();
		}, delayMs);
	}
	async pruneInsights() {
		this.logger.info('Pruning old insights data');
		try {
			const result = await this.insightsByPeriodRepository.pruneOldData(this.pruningMaxAgeInDays);
			this.logger.debug(
				'Deleted insights by period',
				result.affected ? { count: result.affected } : {},
			);
			this.scheduleNextPrune();
		} catch (error) {
			this.logger.warn('Pruning failed', { error });
			this.scheduleNextPrune(this.delayOnError);
		}
	}
};
exports.InsightsPruningService = InsightsPruningService;
exports.InsightsPruningService = InsightsPruningService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			insights_by_period_repository_1.InsightsByPeriodRepository,
			insights_config_1.InsightsConfig,
			backend_common_1.LicenseState,
			backend_common_1.Logger,
		]),
	],
	InsightsPruningService,
);
//# sourceMappingURL=insights-pruning.service.js.map
