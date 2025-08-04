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
exports.InsightsConfig = void 0;
const config_1 = require('@n8n/config');
let InsightsConfig = class InsightsConfig {
	constructor() {
		this.compactionIntervalMinutes = 60;
		this.compactionBatchSize = 500;
		this.compactionHourlyToDailyThresholdDays = 90;
		this.compactionDailyToWeeklyThresholdDays = 180;
		this.flushBatchSize = 1000;
		this.flushIntervalSeconds = 30;
		this.maxAgeDays = -1;
		this.pruneCheckIntervalHours = 24;
	}
};
exports.InsightsConfig = InsightsConfig;
__decorate(
	[
		(0, config_1.Env)('N8N_INSIGHTS_COMPACTION_INTERVAL_MINUTES'),
		__metadata('design:type', Number),
	],
	InsightsConfig.prototype,
	'compactionIntervalMinutes',
	void 0,
);
__decorate(
	[(0, config_1.Env)('N8N_INSIGHTS_COMPACTION_BATCH_SIZE'), __metadata('design:type', Number)],
	InsightsConfig.prototype,
	'compactionBatchSize',
	void 0,
);
__decorate(
	[
		(0, config_1.Env)('N8N_INSIGHTS_COMPACTION_HOURLY_TO_DAILY_THRESHOLD_DAYS'),
		__metadata('design:type', Number),
	],
	InsightsConfig.prototype,
	'compactionHourlyToDailyThresholdDays',
	void 0,
);
__decorate(
	[
		(0, config_1.Env)('N8N_INSIGHTS_COMPACTION_DAILY_TO_WEEKLY_THRESHOLD_DAYS'),
		__metadata('design:type', Number),
	],
	InsightsConfig.prototype,
	'compactionDailyToWeeklyThresholdDays',
	void 0,
);
__decorate(
	[(0, config_1.Env)('N8N_INSIGHTS_FLUSH_BATCH_SIZE'), __metadata('design:type', Number)],
	InsightsConfig.prototype,
	'flushBatchSize',
	void 0,
);
__decorate(
	[(0, config_1.Env)('N8N_INSIGHTS_FLUSH_INTERVAL_SECONDS'), __metadata('design:type', Number)],
	InsightsConfig.prototype,
	'flushIntervalSeconds',
	void 0,
);
__decorate(
	[(0, config_1.Env)('N8N_INSIGHTS_MAX_AGE_DAYS'), __metadata('design:type', Number)],
	InsightsConfig.prototype,
	'maxAgeDays',
	void 0,
);
__decorate(
	[(0, config_1.Env)('N8N_INSIGHTS_PRUNE_CHECK_INTERVAL_HOURS'), __metadata('design:type', Number)],
	InsightsConfig.prototype,
	'pruneCheckIntervalHours',
	void 0,
);
exports.InsightsConfig = InsightsConfig = __decorate([config_1.Config], InsightsConfig);
//# sourceMappingURL=insights.config.js.map
