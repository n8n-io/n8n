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
exports.TelemetryController = void 0;
const config_1 = require('@n8n/config');
const decorators_1 = require('@n8n/decorators');
const http_proxy_middleware_1 = require('http-proxy-middleware');
let TelemetryController = class TelemetryController {
	constructor(globalConfig) {
		this.globalConfig = globalConfig;
		this.proxy = (0, http_proxy_middleware_1.createProxyMiddleware)({
			target: this.globalConfig.diagnostics.frontendConfig.split(';')[1],
			changeOrigin: true,
			pathRewrite: {
				'^/proxy/': '/',
			},
			on: {
				proxyReq: (proxyReq, req) => {
					proxyReq.removeHeader('cookie');
					(0, http_proxy_middleware_1.fixRequestBody)(proxyReq, req);
					return;
				},
			},
		});
	}
	async track(req, res, next) {
		await this.proxy(req, res, next);
	}
	async identify(req, res, next) {
		await this.proxy(req, res, next);
	}
	async page(req, res, next) {
		await this.proxy(req, res, next);
	}
	async sourceConfig() {
		const response = await fetch('https://api-rs.n8n.io/sourceConfig', {
			headers: {
				authorization:
					'Basic ' + btoa(`${this.globalConfig.diagnostics.frontendConfig.split(';')[0]}:`),
			},
		});
		if (!response.ok) {
			throw new Error(`Failed to fetch source config: ${response.statusText}`);
		}
		const config = await response.json();
		return config;
	}
};
exports.TelemetryController = TelemetryController;
__decorate(
	[
		(0, decorators_1.Post)('/proxy/:version/track', {
			skipAuth: true,
			rateLimit: { limit: 100, windowMs: 60_000 },
		}),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Function]),
		__metadata('design:returntype', Promise),
	],
	TelemetryController.prototype,
	'track',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/proxy/:version/identify', { skipAuth: true, rateLimit: true }),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Function]),
		__metadata('design:returntype', Promise),
	],
	TelemetryController.prototype,
	'identify',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/proxy/:version/page', {
			skipAuth: true,
			rateLimit: { limit: 50, windowMs: 60_000 },
		}),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Function]),
		__metadata('design:returntype', Promise),
	],
	TelemetryController.prototype,
	'page',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/rudderstack/sourceConfig', {
			skipAuth: true,
			rateLimit: { limit: 50, windowMs: 60_000 },
		}),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	TelemetryController.prototype,
	'sourceConfig',
	null,
);
exports.TelemetryController = TelemetryController = __decorate(
	[
		(0, decorators_1.RestController)('/telemetry'),
		__metadata('design:paramtypes', [config_1.GlobalConfig]),
	],
	TelemetryController,
);
//# sourceMappingURL=telemetry.controller.js.map
