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
exports.InsightsByPeriod = void 0;
const db_1 = require('@n8n/db');
const typeorm_1 = require('@n8n/typeorm');
const n8n_workflow_1 = require('n8n-workflow');
const insights_metadata_1 = require('./insights-metadata');
const insights_shared_1 = require('./insights-shared');
let InsightsByPeriod = class InsightsByPeriod extends typeorm_1.BaseEntity {
	get type() {
		if (!(0, insights_shared_1.isValidTypeNumber)(this.type_)) {
			throw new n8n_workflow_1.UnexpectedError(
				`Type '${this.type_}' is not a valid type for 'InsightsByPeriod.type'`,
			);
		}
		return insights_shared_1.NumberToType[this.type_];
	}
	set type(value) {
		this.type_ = insights_shared_1.TypeToNumber[value];
	}
	get periodUnit() {
		if (!(0, insights_shared_1.isValidPeriodNumber)(this.periodUnit_)) {
			throw new n8n_workflow_1.UnexpectedError(
				`Period unit '${this.periodUnit_}' is not a valid unit for 'InsightsByPeriod.periodUnit'`,
			);
		}
		return insights_shared_1.NumberToPeriodUnit[this.periodUnit_];
	}
	set periodUnit(value) {
		this.periodUnit_ = insights_shared_1.PeriodUnitToNumber[value];
	}
};
exports.InsightsByPeriod = InsightsByPeriod;
__decorate(
	[(0, typeorm_1.PrimaryGeneratedColumn)(), __metadata('design:type', Number)],
	InsightsByPeriod.prototype,
	'id',
	void 0,
);
__decorate(
	[(0, typeorm_1.Column)(), __metadata('design:type', Number)],
	InsightsByPeriod.prototype,
	'metaId',
	void 0,
);
__decorate(
	[
		(0, typeorm_1.ManyToOne)(() => insights_metadata_1.InsightsMetadata),
		(0, typeorm_1.JoinColumn)({ name: 'metaId' }),
		__metadata('design:type', insights_metadata_1.InsightsMetadata),
	],
	InsightsByPeriod.prototype,
	'metadata',
	void 0,
);
__decorate(
	[(0, typeorm_1.Column)({ name: 'type', type: 'int' }), __metadata('design:type', Number)],
	InsightsByPeriod.prototype,
	'type_',
	void 0,
);
__decorate(
	[(0, typeorm_1.Column)(), __metadata('design:type', Number)],
	InsightsByPeriod.prototype,
	'value',
	void 0,
);
__decorate(
	[(0, typeorm_1.Column)({ name: 'periodUnit' }), __metadata('design:type', Number)],
	InsightsByPeriod.prototype,
	'periodUnit_',
	void 0,
);
__decorate(
	[(0, db_1.DateTimeColumn)(), __metadata('design:type', Date)],
	InsightsByPeriod.prototype,
	'periodStart',
	void 0,
);
exports.InsightsByPeriod = InsightsByPeriod = __decorate(
	[(0, typeorm_1.Entity)()],
	InsightsByPeriod,
);
//# sourceMappingURL=insights-by-period.js.map
