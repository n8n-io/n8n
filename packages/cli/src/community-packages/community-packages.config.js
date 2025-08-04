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
exports.CommunityPackagesConfig = void 0;
const config_1 = require('@n8n/config');
let CommunityPackagesConfig = class CommunityPackagesConfig {
	constructor() {
		this.enabled = true;
		this.registry = 'https://registry.npmjs.org';
		this.reinstallMissing = false;
		this.unverifiedEnabled = true;
		this.verifiedEnabled = true;
		this.preventLoading = false;
	}
};
exports.CommunityPackagesConfig = CommunityPackagesConfig;
__decorate(
	[(0, config_1.Env)('N8N_COMMUNITY_PACKAGES_ENABLED'), __metadata('design:type', Boolean)],
	CommunityPackagesConfig.prototype,
	'enabled',
	void 0,
);
__decorate(
	[(0, config_1.Env)('N8N_COMMUNITY_PACKAGES_REGISTRY'), __metadata('design:type', String)],
	CommunityPackagesConfig.prototype,
	'registry',
	void 0,
);
__decorate(
	[(0, config_1.Env)('N8N_REINSTALL_MISSING_PACKAGES'), __metadata('design:type', Boolean)],
	CommunityPackagesConfig.prototype,
	'reinstallMissing',
	void 0,
);
__decorate(
	[(0, config_1.Env)('N8N_UNVERIFIED_PACKAGES_ENABLED'), __metadata('design:type', Boolean)],
	CommunityPackagesConfig.prototype,
	'unverifiedEnabled',
	void 0,
);
__decorate(
	[(0, config_1.Env)('N8N_VERIFIED_PACKAGES_ENABLED'), __metadata('design:type', Boolean)],
	CommunityPackagesConfig.prototype,
	'verifiedEnabled',
	void 0,
);
__decorate(
	[(0, config_1.Env)('N8N_COMMUNITY_PACKAGES_PREVENT_LOADING'), __metadata('design:type', Boolean)],
	CommunityPackagesConfig.prototype,
	'preventLoading',
	void 0,
);
exports.CommunityPackagesConfig = CommunityPackagesConfig = __decorate(
	[config_1.Config],
	CommunityPackagesConfig,
);
//# sourceMappingURL=community-packages.config.js.map
