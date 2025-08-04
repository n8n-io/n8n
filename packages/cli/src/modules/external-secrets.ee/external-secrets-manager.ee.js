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
exports.ExternalSecretsManager = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const event_service_1 = require('@/events/event.service');
const license_1 = require('@/license');
const publisher_service_1 = require('@/scaling/pubsub/publisher.service');
const constants_1 = require('./constants');
const external_secrets_providers_ee_1 = require('./external-secrets-providers.ee');
const external_secrets_config_1 = require('./external-secrets.config');
let ExternalSecretsManager = class ExternalSecretsManager {
	constructor(
		logger,
		config,
		settingsRepo,
		license,
		secretsProviders,
		cipher,
		eventService,
		publisher,
	) {
		this.logger = logger;
		this.config = config;
		this.settingsRepo = settingsRepo;
		this.license = license;
		this.secretsProviders = secretsProviders;
		this.cipher = cipher;
		this.eventService = eventService;
		this.publisher = publisher;
		this.providers = {};
		this.cachedSettings = {};
		this.initialized = false;
		this.initRetryTimeouts = {};
		this.logger = this.logger.scoped('external-secrets');
	}
	async init() {
		if (!this.initialized) {
			if (!this.initializingPromise) {
				this.initializingPromise = new Promise(async (resolve) => {
					await this.internalInit();
					this.initialized = true;
					resolve();
					this.initializingPromise = undefined;
					this.updateInterval = setInterval(
						async () => await this.updateSecrets(),
						this.config.updateInterval * 1000,
					);
				});
			}
			await this.initializingPromise;
		}
		this.logger.debug('External secrets manager initialized');
	}
	shutdown() {
		clearInterval(this.updateInterval);
		Object.values(this.providers).forEach((p) => {
			void p.disconnect().catch(() => {});
		});
		Object.values(this.initRetryTimeouts).forEach((v) => clearTimeout(v));
		this.logger.debug('External secrets manager shut down');
	}
	async reloadAllProviders(backoff) {
		this.logger.debug('Reloading all external secrets providers');
		const providers = this.getProviderNames();
		if (!providers) {
			return;
		}
		for (const provider of providers) {
			await this.reloadProvider(provider, backoff);
		}
		this.logger.debug('External secrets managed reloaded all providers');
	}
	broadcastReloadExternalSecretsProviders() {
		void this.publisher.publishCommand({ command: 'reload-external-secrets-providers' });
	}
	async getDecryptedSettings() {
		const encryptedSettings =
			(await this.settingsRepo.findByKey(constants_1.EXTERNAL_SECRETS_DB_KEY))?.value ?? null;
		if (encryptedSettings === null) {
			return null;
		}
		const decryptedData = this.cipher.decrypt(encryptedSettings);
		try {
			return (0, n8n_workflow_1.jsonParse)(decryptedData);
		} catch (e) {
			throw new n8n_workflow_1.UnexpectedError(
				'External Secrets Settings could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.',
			);
		}
	}
	async internalInit() {
		const settings = await this.getDecryptedSettings();
		if (!settings) {
			return;
		}
		const providers = (
			await Promise.allSettled(
				Object.entries(settings).map(
					async ([name, providerSettings]) => await this.initProvider(name, providerSettings),
				),
			)
		).map((i) => (i.status === 'rejected' ? null : i.value));
		this.providers = Object.fromEntries(
			providers.filter((p) => p !== null).map((s) => [s.name, s]),
		);
		this.cachedSettings = settings;
		await this.updateSecrets();
	}
	async initProvider(
		name,
		providerSettings,
		currentBackoff = constants_1.EXTERNAL_SECRETS_INITIAL_BACKOFF,
	) {
		const providerClass = this.secretsProviders.getProvider(name);
		if (!providerClass) {
			return null;
		}
		const provider = new providerClass();
		try {
			await provider.init(providerSettings);
		} catch (e) {
			this.logger.error(
				`Error initializing secrets provider ${provider.displayName} (${provider.name}).`,
			);
			this.retryInitWithBackoff(name, currentBackoff);
			return provider;
		}
		try {
			if (providerSettings.connected) {
				await provider.connect();
			}
		} catch (e) {
			try {
				await provider.disconnect();
			} catch {}
			this.logger.error(
				`Error initializing secrets provider ${provider.displayName} (${provider.name}).`,
			);
			this.retryInitWithBackoff(name, currentBackoff);
			return provider;
		}
		return provider;
	}
	retryInitWithBackoff(name, currentBackoff) {
		if (name in this.initRetryTimeouts) {
			clearTimeout(this.initRetryTimeouts[name]);
			delete this.initRetryTimeouts[name];
		}
		this.initRetryTimeouts[name] = setTimeout(() => {
			delete this.initRetryTimeouts[name];
			if (this.providers[name] && this.providers[name].state !== 'error') {
				return;
			}
			void this.reloadProvider(
				name,
				Math.min(currentBackoff * 2, constants_1.EXTERNAL_SECRETS_MAX_BACKOFF),
			);
		}, currentBackoff);
	}
	async updateSecrets() {
		if (!this.license.isExternalSecretsEnabled()) {
			return;
		}
		await Promise.allSettled(
			Object.entries(this.providers).map(async ([k, p]) => {
				try {
					if (this.cachedSettings[k].connected && p.state === 'connected') {
						await p.update();
					}
				} catch {
					this.logger.error(`Error updating secrets provider ${p.displayName} (${p.name}).`);
				}
			}),
		);
		this.logger.debug('External secrets manager updated secrets');
	}
	getProvider(provider) {
		return this.providers[provider];
	}
	hasProvider(provider) {
		return provider in this.providers;
	}
	getProviderNames() {
		return Object.keys(this.providers);
	}
	getSecret(provider, name) {
		return this.getProvider(provider)?.getSecret(name);
	}
	hasSecret(provider, name) {
		return this.getProvider(provider)?.hasSecret(name) ?? false;
	}
	getSecretNames(provider) {
		return this.getProvider(provider)?.getSecretNames() ?? [];
	}
	getAllSecretNames() {
		return Object.fromEntries(
			Object.keys(this.providers).map((provider) => [
				provider,
				this.getSecretNames(provider) ?? [],
			]),
		);
	}
	getProvidersWithSettings() {
		return Object.entries(this.secretsProviders.getAllProviders()).map(([k, c]) => ({
			provider: this.getProvider(k) ?? new c(),
			settings: this.cachedSettings[k] ?? {},
		}));
	}
	getProviderWithSettings(provider) {
		const providerConstructor = this.secretsProviders.getProvider(provider);
		return {
			provider: this.getProvider(provider) ?? new providerConstructor(),
			settings: this.cachedSettings[provider] ?? {},
		};
	}
	async reloadProvider(provider, backoff = constants_1.EXTERNAL_SECRETS_INITIAL_BACKOFF) {
		if (provider in this.providers) {
			await this.providers[provider].disconnect();
			delete this.providers[provider];
		}
		const newProvider = await this.initProvider(provider, this.cachedSettings[provider], backoff);
		if (newProvider) {
			this.providers[provider] = newProvider;
		}
		this.logger.debug(`External secrets manager reloaded provider ${provider}`);
	}
	async setProviderSettings(provider, data, userId) {
		let isNewProvider = false;
		let settings = await this.getDecryptedSettings();
		if (!settings) {
			settings = {};
		}
		if (!(provider in settings)) {
			isNewProvider = true;
		}
		settings[provider] = {
			connected: settings[provider]?.connected ?? false,
			connectedAt: settings[provider]?.connectedAt ?? new Date(),
			settings: data,
		};
		await this.saveAndSetSettings(settings);
		this.cachedSettings = settings;
		await this.reloadProvider(provider);
		this.broadcastReloadExternalSecretsProviders();
		void this.trackProviderSave(provider, isNewProvider, userId);
	}
	async setProviderConnected(provider, connected) {
		let settings = await this.getDecryptedSettings();
		if (!settings) {
			settings = {};
		}
		settings[provider] = {
			connected,
			connectedAt: connected ? new Date() : (settings[provider]?.connectedAt ?? null),
			settings: settings[provider]?.settings ?? {},
		};
		await this.saveAndSetSettings(settings);
		this.cachedSettings = settings;
		await this.reloadProvider(provider);
		await this.updateSecrets();
		this.broadcastReloadExternalSecretsProviders();
	}
	async trackProviderSave(vaultType, isNew, userId) {
		let testResult;
		try {
			testResult = await this.getProvider(vaultType)?.test();
		} catch {}
		this.eventService.emit('external-secrets-provider-settings-saved', {
			userId,
			vaultType,
			isNew,
			isValid: testResult?.[0] ?? false,
			errorMessage: testResult?.[1],
		});
	}
	encryptSecretsSettings(settings) {
		return this.cipher.encrypt(settings);
	}
	async saveAndSetSettings(settings) {
		const encryptedSettings = this.encryptSecretsSettings(settings);
		await this.settingsRepo.upsert(
			{
				key: constants_1.EXTERNAL_SECRETS_DB_KEY,
				value: encryptedSettings,
				loadOnStartup: false,
			},
			['key'],
		);
	}
	async testProviderSettings(provider, data) {
		let testProvider = null;
		try {
			testProvider = await this.initProvider(provider, {
				connected: true,
				connectedAt: new Date(),
				settings: data,
			});
			if (!testProvider) {
				return {
					success: false,
					testState: 'error',
				};
			}
			const [success, error] = await testProvider.test();
			let testState = 'error';
			if (success && this.cachedSettings[provider]?.connected) {
				testState = 'connected';
			} else if (success) {
				testState = 'tested';
			}
			return {
				success,
				testState,
				error,
			};
		} catch {
			return {
				success: false,
				testState: 'error',
			};
		} finally {
			if (testProvider) {
				await testProvider.disconnect();
			}
		}
	}
	async updateProvider(provider) {
		if (!this.license.isExternalSecretsEnabled()) {
			return false;
		}
		if (!this.providers[provider] || this.providers[provider].state !== 'connected') {
			return false;
		}
		try {
			await this.providers[provider].update();
			this.broadcastReloadExternalSecretsProviders();
			this.logger.debug(`External secrets manager updated provider ${provider}`);
			return true;
		} catch (error) {
			this.logger.debug(`External secrets manager failed to update provider ${provider}`, {
				error: (0, n8n_workflow_1.ensureError)(error),
			});
			return false;
		}
	}
};
exports.ExternalSecretsManager = ExternalSecretsManager;
__decorate(
	[
		(0, decorators_1.OnPubSubEvent)('reload-external-secrets-providers'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Number]),
		__metadata('design:returntype', Promise),
	],
	ExternalSecretsManager.prototype,
	'reloadAllProviders',
	null,
);
exports.ExternalSecretsManager = ExternalSecretsManager = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			external_secrets_config_1.ExternalSecretsConfig,
			db_1.SettingsRepository,
			license_1.License,
			external_secrets_providers_ee_1.ExternalSecretsProviders,
			n8n_core_1.Cipher,
			event_service_1.EventService,
			publisher_service_1.Publisher,
		]),
	],
	ExternalSecretsManager,
);
//# sourceMappingURL=external-secrets-manager.ee.js.map
