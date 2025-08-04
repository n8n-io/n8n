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
exports.UrlService = void 0;
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
let UrlService = class UrlService {
	constructor(globalConfig) {
		this.globalConfig = globalConfig;
		this.baseUrl = this.generateBaseUrl();
	}
	getWebhookBaseUrl() {
		let urlBaseWebhook = this.trimQuotes(process.env.WEBHOOK_URL) || this.baseUrl;
		if (!urlBaseWebhook.endsWith('/')) {
			urlBaseWebhook += '/';
		}
		return urlBaseWebhook;
	}
	getInstanceBaseUrl() {
		const n8nBaseUrl = this.trimQuotes(this.globalConfig.editorBaseUrl) || this.getWebhookBaseUrl();
		return n8nBaseUrl.endsWith('/') ? n8nBaseUrl.slice(0, n8nBaseUrl.length - 1) : n8nBaseUrl;
	}
	generateBaseUrl() {
		const { path, port, host, protocol } = this.globalConfig;
		if ((protocol === 'http' && port === 80) || (protocol === 'https' && port === 443)) {
			return `${protocol}://${host}${path}`;
		}
		return `${protocol}://${host}:${port}${path}`;
	}
	trimQuotes(url) {
		return url?.replace(/^["]+|["]+$/g, '') ?? '';
	}
};
exports.UrlService = UrlService;
exports.UrlService = UrlService = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [config_1.GlobalConfig])],
	UrlService,
);
//# sourceMappingURL=url.service.js.map
