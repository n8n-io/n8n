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
exports.ExternalSecretsModule = void 0;
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
let ExternalSecretsModule = class ExternalSecretsModule {
	async init() {
		await Promise.resolve().then(() => __importStar(require('./external-secrets.controller.ee')));
		const { ExternalSecretsManager } = await Promise.resolve().then(() =>
			__importStar(require('./external-secrets-manager.ee')),
		);
		const { ExternalSecretsProxy } = await Promise.resolve().then(() =>
			__importStar(require('n8n-core')),
		);
		const externalSecretsManager = di_1.Container.get(ExternalSecretsManager);
		const externalSecretsProxy = di_1.Container.get(ExternalSecretsProxy);
		await externalSecretsManager.init();
		externalSecretsProxy.setManager(externalSecretsManager);
	}
	async shutdown() {
		const { ExternalSecretsManager } = await Promise.resolve().then(() =>
			__importStar(require('./external-secrets-manager.ee')),
		);
		di_1.Container.get(ExternalSecretsManager).shutdown();
	}
};
exports.ExternalSecretsModule = ExternalSecretsModule;
__decorate(
	[
		(0, decorators_1.OnShutdown)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	ExternalSecretsModule.prototype,
	'shutdown',
	null,
);
exports.ExternalSecretsModule = ExternalSecretsModule = __decorate(
	[
		(0, decorators_1.BackendModule)({
			name: 'external-secrets',
			licenseFlag: 'feat:externalSecrets',
		}),
	],
	ExternalSecretsModule,
);
//# sourceMappingURL=external-secrets.module.js.map
