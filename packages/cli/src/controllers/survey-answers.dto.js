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
exports.PersonalizationSurveyAnswersV4 = void 0;
const db_1 = require('@n8n/db');
const class_transformer_1 = require('class-transformer');
const class_validator_1 = require('class-validator');
class PersonalizationSurveyAnswersV4 {}
exports.PersonalizationSurveyAnswersV4 = PersonalizationSurveyAnswersV4;
__decorate(
	[
		(0, db_1.NoXss)(),
		(0, class_transformer_1.Expose)(),
		(0, class_validator_1.IsEnum)(['v4']),
		__metadata('design:type', String),
	],
	PersonalizationSurveyAnswersV4.prototype,
	'version',
	void 0,
);
__decorate(
	[
		(0, db_1.NoXss)(),
		(0, class_transformer_1.Expose)(),
		(0, class_validator_1.IsString)(),
		__metadata('design:type', String),
	],
	PersonalizationSurveyAnswersV4.prototype,
	'personalization_survey_submitted_at',
	void 0,
);
__decorate(
	[
		(0, db_1.NoXss)(),
		(0, class_transformer_1.Expose)(),
		(0, class_validator_1.IsString)(),
		__metadata('design:type', String),
	],
	PersonalizationSurveyAnswersV4.prototype,
	'personalization_survey_n8n_version',
	void 0,
);
__decorate(
	[
		(0, class_transformer_1.Expose)(),
		(0, class_validator_1.IsOptional)(),
		(0, class_validator_1.IsArray)(),
		(0, db_1.NoXss)({ each: true }),
		(0, class_validator_1.IsString)({ each: true }),
		__metadata('design:type', Object),
	],
	PersonalizationSurveyAnswersV4.prototype,
	'automationGoalDevops',
	void 0,
);
__decorate(
	[
		(0, db_1.NoXss)(),
		(0, class_transformer_1.Expose)(),
		(0, class_validator_1.IsOptional)(),
		(0, class_validator_1.IsString)(),
		__metadata('design:type', Object),
	],
	PersonalizationSurveyAnswersV4.prototype,
	'automationGoalDevopsOther',
	void 0,
);
__decorate(
	[
		(0, db_1.NoXss)({ each: true }),
		(0, class_transformer_1.Expose)(),
		(0, class_validator_1.IsOptional)(),
		(0, class_validator_1.IsArray)(),
		(0, class_validator_1.IsString)({ each: true }),
		__metadata('design:type', Object),
	],
	PersonalizationSurveyAnswersV4.prototype,
	'companyIndustryExtended',
	void 0,
);
__decorate(
	[
		(0, db_1.NoXss)({ each: true }),
		(0, class_transformer_1.Expose)(),
		(0, class_validator_1.IsOptional)(),
		(0, class_validator_1.IsString)({ each: true }),
		__metadata('design:type', Object),
	],
	PersonalizationSurveyAnswersV4.prototype,
	'otherCompanyIndustryExtended',
	void 0,
);
__decorate(
	[
		(0, class_validator_1.IsEnum)(['<20', '20-99', '100-499', '500-999', '1000+', 'personalUser']),
		(0, class_transformer_1.Expose)(),
		(0, class_validator_1.IsOptional)(),
		(0, class_validator_1.IsString)(),
		__metadata('design:type', Object),
	],
	PersonalizationSurveyAnswersV4.prototype,
	'companySize',
	void 0,
);
__decorate(
	[
		(0, db_1.NoXss)(),
		(0, class_transformer_1.Expose)(),
		(0, class_validator_1.IsOptional)(),
		(0, class_validator_1.IsString)(),
		__metadata('design:type', Object),
	],
	PersonalizationSurveyAnswersV4.prototype,
	'companyType',
	void 0,
);
__decorate(
	[
		(0, db_1.NoXss)({ each: true }),
		(0, class_transformer_1.Expose)(),
		(0, class_validator_1.IsOptional)(),
		(0, class_validator_1.IsArray)(),
		(0, class_validator_1.IsString)({ each: true }),
		__metadata('design:type', Object),
	],
	PersonalizationSurveyAnswersV4.prototype,
	'automationGoalSm',
	void 0,
);
__decorate(
	[
		(0, db_1.NoXss)(),
		(0, class_transformer_1.Expose)(),
		(0, class_validator_1.IsOptional)(),
		(0, class_validator_1.IsString)(),
		__metadata('design:type', Object),
	],
	PersonalizationSurveyAnswersV4.prototype,
	'automationGoalSmOther',
	void 0,
);
__decorate(
	[
		(0, db_1.NoXss)({ each: true }),
		(0, class_transformer_1.Expose)(),
		(0, class_validator_1.IsOptional)(),
		(0, class_validator_1.IsArray)(),
		(0, class_validator_1.IsString)({ each: true }),
		__metadata('design:type', Object),
	],
	PersonalizationSurveyAnswersV4.prototype,
	'usageModes',
	void 0,
);
__decorate(
	[
		(0, db_1.NoXss)(),
		(0, class_transformer_1.Expose)(),
		(0, class_validator_1.IsOptional)(),
		(0, class_validator_1.IsEmail)(),
		__metadata('design:type', Object),
	],
	PersonalizationSurveyAnswersV4.prototype,
	'email',
	void 0,
);
__decorate(
	[
		(0, db_1.NoXss)(),
		(0, class_transformer_1.Expose)(),
		(0, class_validator_1.IsOptional)(),
		(0, class_validator_1.IsString)(),
		__metadata('design:type', Object),
	],
	PersonalizationSurveyAnswersV4.prototype,
	'role',
	void 0,
);
__decorate(
	[
		(0, db_1.NoXss)(),
		(0, class_transformer_1.Expose)(),
		(0, class_validator_1.IsOptional)(),
		(0, class_validator_1.IsString)(),
		__metadata('design:type', Object),
	],
	PersonalizationSurveyAnswersV4.prototype,
	'roleOther',
	void 0,
);
__decorate(
	[
		(0, db_1.NoXss)(),
		(0, class_transformer_1.Expose)(),
		(0, class_validator_1.IsOptional)(),
		(0, class_validator_1.IsString)(),
		__metadata('design:type', Object),
	],
	PersonalizationSurveyAnswersV4.prototype,
	'reportedSource',
	void 0,
);
__decorate(
	[
		(0, db_1.NoXss)(),
		(0, class_transformer_1.Expose)(),
		(0, class_validator_1.IsOptional)(),
		(0, class_validator_1.IsString)(),
		__metadata('design:type', Object),
	],
	PersonalizationSurveyAnswersV4.prototype,
	'reportedSourceOther',
	void 0,
);
//# sourceMappingURL=survey-answers.dto.js.map
