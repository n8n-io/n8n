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
exports.UserFilter = void 0;
const class_transformer_1 = require('class-transformer');
const class_validator_1 = require('class-validator');
const base_filter_dto_1 = require('./base.filter.dto');
class UserFilter extends base_filter_dto_1.BaseFilter {
	static async fromString(rawFilter) {
		return await this.toFilter(rawFilter, UserFilter);
	}
}
exports.UserFilter = UserFilter;
__decorate(
	[
		(0, class_validator_1.IsString)(),
		(0, class_validator_1.IsOptional)(),
		(0, class_transformer_1.Expose)(),
		__metadata('design:type', String),
	],
	UserFilter.prototype,
	'email',
	void 0,
);
__decorate(
	[
		(0, class_validator_1.IsString)(),
		(0, class_validator_1.IsOptional)(),
		(0, class_transformer_1.Expose)(),
		__metadata('design:type', String),
	],
	UserFilter.prototype,
	'firstName',
	void 0,
);
__decorate(
	[
		(0, class_validator_1.IsString)(),
		(0, class_validator_1.IsOptional)(),
		(0, class_transformer_1.Expose)(),
		__metadata('design:type', String),
	],
	UserFilter.prototype,
	'lastName',
	void 0,
);
__decorate(
	[
		(0, class_validator_1.IsBoolean)(),
		(0, class_validator_1.IsOptional)(),
		(0, class_transformer_1.Expose)(),
		__metadata('design:type', Boolean),
	],
	UserFilter.prototype,
	'isOwner',
	void 0,
);
//# sourceMappingURL=user.filter.dto.js.map
