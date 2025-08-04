'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
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
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.PostHogClient = void 0;
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
let PostHogClient = class PostHogClient {
	constructor(instanceSettings, globalConfig) {
		this.instanceSettings = instanceSettings;
		this.globalConfig = globalConfig;
	}
	async init() {
		const { enabled, posthogConfig } = this.globalConfig.diagnostics;
		if (!enabled) {
			return;
		}
		const { PostHog } = await Promise.resolve().then(() => __importStar(require('posthog-node')));
		this.postHog = new PostHog(posthogConfig.apiKey, {
			host: posthogConfig.apiHost,
		});
		const logLevel = this.globalConfig.logging.level;
		if (logLevel === 'debug') {
			this.postHog.debug(true);
		}
	}
	async stop() {
		if (this.postHog) {
			return this.postHog.shutdown();
		}
	}
	track(payload) {
		this.postHog?.capture({
			distinctId: payload.userId,
			sendFeatureFlags: true,
			...payload,
		});
	}
	async getFeatureFlags(user) {
		if (!this.postHog) return {};
		const fullId = [this.instanceSettings.instanceId, user.id].join('#');
		return await this.postHog.getAllFlags(fullId, {
			personProperties: {
				created_at_timestamp: user.createdAt.getTime().toString(),
			},
		});
	}
};
exports.PostHogClient = PostHogClient;
exports.PostHogClient = PostHogClient = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [n8n_core_1.InstanceSettings, config_1.GlobalConfig]),
	],
	PostHogClient,
);
//# sourceMappingURL=index.js.map
