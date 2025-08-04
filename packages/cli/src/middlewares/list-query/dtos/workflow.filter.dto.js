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
exports.WorkflowFilter = void 0;
const class_transformer_1 = require('class-transformer');
const class_validator_1 = require('class-validator');
const base_filter_dto_1 = require('./base.filter.dto');
class WorkflowFilter extends base_filter_dto_1.BaseFilter {
	static async fromString(rawFilter) {
		return await this.toFilter(rawFilter, WorkflowFilter);
	}
}
exports.WorkflowFilter = WorkflowFilter;
__decorate(
	[
		(0, class_validator_1.IsString)(),
		(0, class_validator_1.IsOptional)(),
		(0, class_transformer_1.Expose)(),
		__metadata('design:type', String),
	],
	WorkflowFilter.prototype,
	'name',
	void 0,
);
__decorate(
	[
		(0, class_validator_1.IsBoolean)(),
		(0, class_validator_1.IsOptional)(),
		(0, class_transformer_1.Expose)(),
		__metadata('design:type', Boolean),
	],
	WorkflowFilter.prototype,
	'active',
	void 0,
);
__decorate(
	[
		(0, class_validator_1.IsBoolean)(),
		(0, class_validator_1.IsOptional)(),
		(0, class_transformer_1.Expose)(),
		__metadata('design:type', Boolean),
	],
	WorkflowFilter.prototype,
	'isArchived',
	void 0,
);
__decorate(
	[
		(0, class_validator_1.IsArray)(),
		(0, class_validator_1.IsString)({ each: true }),
		(0, class_validator_1.IsOptional)(),
		(0, class_transformer_1.Expose)(),
		__metadata('design:type', Array),
	],
	WorkflowFilter.prototype,
	'tags',
	void 0,
);
__decorate(
	[
		(0, class_validator_1.IsString)(),
		(0, class_validator_1.IsOptional)(),
		(0, class_transformer_1.Expose)(),
		__metadata('design:type', String),
	],
	WorkflowFilter.prototype,
	'projectId',
	void 0,
);
__decorate(
	[
		(0, class_validator_1.IsString)(),
		(0, class_validator_1.IsOptional)(),
		(0, class_transformer_1.Expose)(),
		__metadata('design:type', String),
	],
	WorkflowFilter.prototype,
	'parentFolderId',
	void 0,
);
//# sourceMappingURL=workflow.filter.dto.js.map
