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
exports.InsightsRaw = exports.dbType = void 0;
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
const n8n_workflow_1 = require('n8n-workflow');
const insights_shared_1 = require('./insights-shared');
exports.dbType = di_1.Container.get(config_1.GlobalConfig).database.type;
let InsightsRaw = class InsightsRaw extends typeorm_1.BaseEntity {
	constructor() {
		super();
		this.timestamp = new Date();
	}
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
};
exports.InsightsRaw = InsightsRaw;
__decorate(
	[(0, typeorm_1.PrimaryGeneratedColumn)(), __metadata('design:type', Number)],
	InsightsRaw.prototype,
	'id',
	void 0,
);
__decorate(
	[(0, typeorm_1.Column)(), __metadata('design:type', Number)],
	InsightsRaw.prototype,
	'metaId',
	void 0,
);
__decorate(
	[(0, typeorm_1.Column)({ name: 'type', type: 'int' }), __metadata('design:type', Number)],
	InsightsRaw.prototype,
	'type_',
	void 0,
);
__decorate(
	[(0, typeorm_1.Column)(), __metadata('design:type', Number)],
	InsightsRaw.prototype,
	'value',
	void 0,
);
__decorate(
	[(0, db_1.DateTimeColumn)({ name: 'timestamp' }), __metadata('design:type', Date)],
	InsightsRaw.prototype,
	'timestamp',
	void 0,
);
exports.InsightsRaw = InsightsRaw = __decorate(
	[(0, typeorm_1.Entity)(), __metadata('design:paramtypes', [])],
	InsightsRaw,
);
//# sourceMappingURL=insights-raw.js.map
