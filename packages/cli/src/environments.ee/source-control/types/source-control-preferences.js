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
exports.SourceControlPreferences = void 0;
const class_validator_1 = require('class-validator');
class SourceControlPreferences {
	constructor(preferences = undefined) {
		this.branchName = 'main';
		if (preferences) Object.assign(this, preferences);
	}
	static fromJSON(json) {
		return new SourceControlPreferences(json);
	}
	static merge(preferences, defaultPreferences) {
		return new SourceControlPreferences({
			connected: preferences.connected ?? defaultPreferences.connected,
			repositoryUrl: preferences.repositoryUrl ?? defaultPreferences.repositoryUrl,
			branchName: preferences.branchName ?? defaultPreferences.branchName,
			branchReadOnly: preferences.branchReadOnly ?? defaultPreferences.branchReadOnly,
			branchColor: preferences.branchColor ?? defaultPreferences.branchColor,
			keyGeneratorType: preferences.keyGeneratorType ?? defaultPreferences.keyGeneratorType,
		});
	}
}
exports.SourceControlPreferences = SourceControlPreferences;
__decorate(
	[(0, class_validator_1.IsBoolean)(), __metadata('design:type', Boolean)],
	SourceControlPreferences.prototype,
	'connected',
	void 0,
);
__decorate(
	[(0, class_validator_1.IsString)(), __metadata('design:type', String)],
	SourceControlPreferences.prototype,
	'repositoryUrl',
	void 0,
);
__decorate(
	[(0, class_validator_1.IsString)(), __metadata('design:type', Object)],
	SourceControlPreferences.prototype,
	'branchName',
	void 0,
);
__decorate(
	[(0, class_validator_1.IsBoolean)(), __metadata('design:type', Boolean)],
	SourceControlPreferences.prototype,
	'branchReadOnly',
	void 0,
);
__decorate(
	[(0, class_validator_1.IsHexColor)(), __metadata('design:type', String)],
	SourceControlPreferences.prototype,
	'branchColor',
	void 0,
);
__decorate(
	[
		(0, class_validator_1.IsOptional)(),
		(0, class_validator_1.IsString)(),
		__metadata('design:type', String),
	],
	SourceControlPreferences.prototype,
	'publicKey',
	void 0,
);
__decorate(
	[
		(0, class_validator_1.IsOptional)(),
		(0, class_validator_1.IsBoolean)(),
		__metadata('design:type', Boolean),
	],
	SourceControlPreferences.prototype,
	'initRepo',
	void 0,
);
__decorate(
	[
		(0, class_validator_1.IsOptional)(),
		(0, class_validator_1.IsString)(),
		__metadata('design:type', String),
	],
	SourceControlPreferences.prototype,
	'keyGeneratorType',
	void 0,
);
//# sourceMappingURL=source-control-preferences.js.map
