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
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.S98Service = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const axios_1 = __importDefault(require('axios'));
let S98Service = class S98Service {
	constructor(logger, globalConfig) {
		this.logger = logger;
		this.globalConfig = globalConfig;
	}
	async call(url, data) {
		const baseUrl = this.globalConfig.endpoints.s98BaseUrl;
		console.log('Called S98Service', this.globalConfig.endpoints, baseUrl);
		await axios_1.default.post(baseUrl, data);
	}
};
exports.S98Service = S98Service;
exports.S98Service = S98Service = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [backend_common_1.Logger, config_1.GlobalConfig]),
	],
	S98Service,
);
//# sourceMappingURL=s98.service.js.map
