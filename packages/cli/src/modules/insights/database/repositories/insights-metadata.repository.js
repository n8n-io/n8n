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
exports.InsightsMetadataRepository = void 0;
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
const insights_metadata_1 = require('../entities/insights-metadata');
let InsightsMetadataRepository = class InsightsMetadataRepository extends typeorm_1.Repository {
	constructor(dataSource) {
		super(insights_metadata_1.InsightsMetadata, dataSource.manager);
	}
};
exports.InsightsMetadataRepository = InsightsMetadataRepository;
exports.InsightsMetadataRepository = InsightsMetadataRepository = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [typeorm_1.DataSource])],
	InsightsMetadataRepository,
);
//# sourceMappingURL=insights-metadata.repository.js.map
