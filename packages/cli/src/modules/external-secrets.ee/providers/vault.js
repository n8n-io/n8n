'use strict';
var __classPrivateFieldGet =
	(this && this.__classPrivateFieldGet) ||
	function (receiver, state, kind, f) {
		if (kind === 'a' && !f) throw new TypeError('Private accessor was defined without a getter');
		if (typeof state === 'function' ? receiver !== state || !f : !state.has(receiver))
			throw new TypeError(
				'Cannot read private member from an object whose class did not declare it',
			);
		return kind === 'm' ? f : kind === 'a' ? f.call(receiver) : f ? f.value : state.get(receiver);
	};
var __classPrivateFieldSet =
	(this && this.__classPrivateFieldSet) ||
	function (receiver, state, value, kind, f) {
		if (kind === 'm') throw new TypeError('Private method is not writable');
		if (kind === 'a' && !f) throw new TypeError('Private accessor was defined without a setter');
		if (typeof state === 'function' ? receiver !== state || !f : !state.has(receiver))
			throw new TypeError(
				'Cannot write private member to an object whose class did not declare it',
			);
		return (
			kind === 'a' ? f.call(receiver, value) : f ? (f.value = value) : state.set(receiver, value),
			value
		);
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
var _VaultProvider_currentToken, _VaultProvider_tokenInfo, _VaultProvider_http;
Object.defineProperty(exports, '__esModule', { value: true });
exports.VaultProvider = void 0;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const axios_1 = __importDefault(require('axios'));
const constants_1 = require('../constants');
const external_secrets_config_1 = require('../external-secrets.config');
const types_1 = require('../types');
class VaultProvider extends types_1.SecretsProvider {
	constructor(logger = di_1.Container.get(backend_common_1.Logger)) {
		super();
		this.logger = logger;
		this.properties = [
			constants_1.DOCS_HELP_NOTICE,
			{
				displayName: 'Vault URL',
				name: 'url',
				type: 'string',
				required: true,
				noDataExpression: true,
				placeholder: 'e.g. https://example.com/v1/',
				default: '',
			},
			{
				displayName: 'Vault Namespace (optional)',
				name: 'namespace',
				type: 'string',
				hint: 'Leave blank if not using namespaces',
				required: false,
				noDataExpression: true,
				placeholder: 'e.g. admin',
				default: '',
			},
			{
				displayName: 'Authentication Method',
				name: 'authMethod',
				type: 'options',
				required: true,
				noDataExpression: true,
				options: [
					{ name: 'Token', value: 'token' },
					{ name: 'Username and Password', value: 'usernameAndPassword' },
					{ name: 'AppRole', value: 'appRole' },
				],
				default: 'token',
			},
			{
				displayName: 'Token',
				name: 'token',
				type: 'string',
				default: '',
				required: true,
				noDataExpression: true,
				placeholder: 'e.g. hvs.2OCsZxZA6Z9lChbt0janOOZI',
				typeOptions: { password: true },
				displayOptions: {
					show: {
						authMethod: ['token'],
					},
				},
			},
			{
				displayName: 'Username',
				name: 'username',
				type: 'string',
				default: '',
				required: true,
				noDataExpression: true,
				placeholder: 'Username',
				displayOptions: {
					show: {
						authMethod: ['usernameAndPassword'],
					},
				},
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				default: '',
				required: true,
				noDataExpression: true,
				placeholder: '***************',
				typeOptions: { password: true },
				displayOptions: {
					show: {
						authMethod: ['usernameAndPassword'],
					},
				},
			},
			{
				displayName: 'Role ID',
				name: 'roleId',
				type: 'string',
				default: '',
				required: true,
				noDataExpression: true,
				placeholder: '59d6d1ca-47bb-4e7e-a40b-8be3bc5a0ba8',
				displayOptions: {
					show: {
						authMethod: ['appRole'],
					},
				},
			},
			{
				displayName: 'Secret ID',
				name: 'secretId',
				type: 'string',
				default: '',
				required: true,
				noDataExpression: true,
				placeholder: '84896a0c-1347-aa90-a4f6-aca8b7558780',
				typeOptions: { password: true },
				displayOptions: {
					show: {
						authMethod: ['appRole'],
					},
				},
			},
		];
		this.displayName = 'HashiCorp Vault';
		this.name = 'vault';
		this.state = 'initializing';
		this.cachedSecrets = {};
		_VaultProvider_currentToken.set(this, null);
		_VaultProvider_tokenInfo.set(this, null);
		_VaultProvider_http.set(this, void 0);
		this.refreshAbort = new AbortController();
		this.tokenRefresh = async () => {
			var _a;
			if (this.refreshAbort.signal.aborted) {
				return;
			}
			try {
				await __classPrivateFieldGet(this, _VaultProvider_http, 'f').post('auth/token/renew-self');
				(_a = this),
					([
						{
							set value(_b) {
								__classPrivateFieldSet(_a, _VaultProvider_tokenInfo, _b, 'f');
							},
						}.value,
					] = await this.getTokenInfo());
				if (!__classPrivateFieldGet(this, _VaultProvider_tokenInfo, 'f')) {
					this.logger.error(
						'Failed to fetch token info during renewal. Cancelling all future renewals.',
					);
					return;
				}
				if (this.refreshAbort.signal.aborted) {
					return;
				}
				this.setupTokenRefresh();
			} catch {
				this.logger.error('Failed to renew Vault token. Attempting to reconnect.');
				void this.connect();
			}
		};
		this.logger = this.logger.scoped('external-secrets');
	}
	async init(settings) {
		this.settings = settings.settings;
		const baseURL = new URL(this.settings.url);
		__classPrivateFieldSet(
			this,
			_VaultProvider_http,
			axios_1.default.create({ baseURL: baseURL.toString() }),
			'f',
		);
		if (this.settings.namespace) {
			__classPrivateFieldGet(this, _VaultProvider_http, 'f').interceptors.request.use((config) => {
				config.headers['X-Vault-Namespace'] = this.settings.namespace;
				return config;
			});
		}
		__classPrivateFieldGet(this, _VaultProvider_http, 'f').interceptors.request.use((config) => {
			if (__classPrivateFieldGet(this, _VaultProvider_currentToken, 'f')) {
				config.headers['X-Vault-Token'] = __classPrivateFieldGet(
					this,
					_VaultProvider_currentToken,
					'f',
				);
			}
			return config;
		});
		this.logger.debug('Vault provider initialized');
	}
	async connect() {
		var _a;
		if (this.settings.authMethod === 'token') {
			__classPrivateFieldSet(this, _VaultProvider_currentToken, this.settings.token, 'f');
		} else if (this.settings.authMethod === 'usernameAndPassword') {
			try {
				__classPrivateFieldSet(
					this,
					_VaultProvider_currentToken,
					await this.authUsernameAndPassword(this.settings.username, this.settings.password),
					'f',
				);
			} catch {
				this.state = 'error';
				this.logger.error('Failed to connect to Vault using Username and Password credentials.');
				return;
			}
		} else if (this.settings.authMethod === 'appRole') {
			try {
				__classPrivateFieldSet(
					this,
					_VaultProvider_currentToken,
					await this.authAppRole(this.settings.roleId, this.settings.secretId),
					'f',
				);
			} catch {
				this.state = 'error';
				this.logger.error('Failed to connect to Vault using AppRole credentials.');
				return;
			}
		}
		try {
			if (!(await this.test())[0]) {
				this.state = 'error';
			} else {
				this.state = 'connected';
				(_a = this),
					([
						{
							set value(_b) {
								__classPrivateFieldSet(_a, _VaultProvider_tokenInfo, _b, 'f');
							},
						}.value,
					] = await this.getTokenInfo());
				this.setupTokenRefresh();
			}
		} catch (e) {
			this.state = 'error';
			this.logger.error('Failed credentials test on Vault connect.');
		}
		try {
			await this.update();
		} catch {
			this.logger.warn('Failed to update Vault secrets');
		}
	}
	async disconnect() {
		if (this.refreshTimeout !== null) {
			clearTimeout(this.refreshTimeout);
		}
		this.refreshAbort.abort();
	}
	setupTokenRefresh() {
		if (!__classPrivateFieldGet(this, _VaultProvider_tokenInfo, 'f')) {
			return;
		}
		if (__classPrivateFieldGet(this, _VaultProvider_tokenInfo, 'f').expire_time === null) {
			return;
		}
		if (!__classPrivateFieldGet(this, _VaultProvider_tokenInfo, 'f').renewable) {
			return;
		}
		const expireDate = new Date(
			__classPrivateFieldGet(this, _VaultProvider_tokenInfo, 'f').expire_time,
		);
		setTimeout(this.tokenRefresh, (expireDate.valueOf() - Date.now()) / 2);
	}
	async authUsernameAndPassword(username, password) {
		try {
			const resp = await __classPrivateFieldGet(this, _VaultProvider_http, 'f').request({
				method: 'POST',
				url: `auth/userpass/login/${username}`,
				responseType: 'json',
				data: { password },
			});
			return resp.data.auth.client_token;
		} catch {
			return null;
		}
	}
	async authAppRole(roleId, secretId) {
		try {
			const resp = await __classPrivateFieldGet(this, _VaultProvider_http, 'f').request({
				method: 'POST',
				url: 'auth/approle/login',
				responseType: 'json',
				data: { role_id: roleId, secret_id: secretId },
			});
			return resp.data.auth.client_token;
		} catch (e) {
			return null;
		}
	}
	async getTokenInfo() {
		const resp = await __classPrivateFieldGet(this, _VaultProvider_http, 'f').request({
			method: 'GET',
			url: 'auth/token/lookup-self',
			responseType: 'json',
			validateStatus: () => true,
		});
		if (resp.status !== 200 || !resp.data.data) {
			return [null, resp];
		}
		return [resp.data.data, resp];
	}
	async getKVSecrets(mountPath, kvVersion, path) {
		this.logger.debug(`Getting kv secrets from ${mountPath}${path} (version ${kvVersion})`);
		let listPath = mountPath;
		if (kvVersion === '2') {
			listPath += 'metadata/';
		}
		listPath += path;
		let listResp;
		try {
			const shouldPreferGet = di_1.Container.get(
				external_secrets_config_1.ExternalSecretsConfig,
			).preferGet;
			const url = `${listPath}${shouldPreferGet ? '?list=true' : ''}`;
			const method = shouldPreferGet ? 'GET' : 'LIST';
			listResp = await __classPrivateFieldGet(this, _VaultProvider_http, 'f').request({
				url,
				method,
			});
		} catch {
			return null;
		}
		const data = Object.fromEntries(
			(
				await Promise.allSettled(
					listResp.data.data.keys.map(async (key) => {
						if (key.endsWith('/')) {
							return await this.getKVSecrets(mountPath, kvVersion, path + key);
						}
						let secretPath = mountPath;
						if (kvVersion === '2') {
							secretPath += 'data/';
						}
						secretPath += path + key;
						try {
							const secretResp = await __classPrivateFieldGet(this, _VaultProvider_http, 'f').get(
								secretPath,
							);
							this.logger.debug(`Vault provider retrieved secrets from ${secretPath}`);
							return [key, kvVersion === '2' ? secretResp.data.data.data : secretResp.data.data];
						} catch {
							return null;
						}
					}),
				)
			)
				.map((i) => (i.status === 'rejected' ? null : i.value))
				.filter((v) => v !== null),
		);
		const name = path.substring(0, path.length - 1);
		this.logger.debug(`Vault provider retrieved kv secrets from ${name}`);
		return [name, data];
	}
	async update() {
		const mounts = await __classPrivateFieldGet(this, _VaultProvider_http, 'f').get('sys/mounts');
		const kvs = Object.entries(mounts.data.data).filter(([, v]) => v.type === 'kv');
		const secrets = Object.fromEntries(
			(
				await Promise.all(
					kvs.map(async ([basePath, data]) => {
						const value = await this.getKVSecrets(basePath, data.options.version, '');
						if (value === null) {
							return null;
						}
						return [basePath.substring(0, basePath.length - 1), value[1]];
					}),
				)
			).filter((v) => v !== null),
		);
		this.cachedSecrets = secrets;
		this.logger.debug('Vault provider secrets updated');
	}
	async test() {
		try {
			const [token, tokenResp] = await this.getTokenInfo();
			if (token === null) {
				if (tokenResp.status === 404) {
					return [false, 'Could not find auth path. Try adding /v1/ to the end of your base URL.'];
				}
				return [false, 'Invalid credentials'];
			}
			const resp = await __classPrivateFieldGet(this, _VaultProvider_http, 'f').request({
				method: 'GET',
				url: 'sys/mounts',
				responseType: 'json',
				validateStatus: () => true,
			});
			if (resp.status === 403) {
				return [
					false,
					"Couldn't list mounts. Please give these credentials 'read' access to sys/mounts.",
				];
			} else if (resp.status !== 200) {
				return [
					false,
					"Couldn't list mounts but wasn't a permissions issue. Please consult your Vault admin.",
				];
			}
			return [true];
		} catch (e) {
			if (axios_1.default.isAxiosError(e)) {
				if (e.code === 'ECONNREFUSED') {
					return [
						false,
						'Connection refused. Please check the host and port of the server are correct.',
					];
				}
			}
			return [false];
		}
	}
	getSecret(name) {
		return this.cachedSecrets[name];
	}
	hasSecret(name) {
		return name in this.cachedSecrets;
	}
	getSecretNames() {
		const getKeys = ([k, v]) => {
			if (!constants_1.EXTERNAL_SECRETS_NAME_REGEX.test(k)) {
				return [];
			}
			if (typeof v === 'object') {
				const keys = [];
				for (const key of Object.keys(v)) {
					if (!constants_1.EXTERNAL_SECRETS_NAME_REGEX.test(key)) {
						continue;
					}
					const value = v[key];
					if (typeof value === 'object' && value !== null) {
						keys.push(...getKeys([key, value]).map((ok) => `${k}.${ok}`));
					} else {
						keys.push(`${k}.${key}`);
					}
				}
				return keys;
			}
			return [k];
		};
		return Object.entries(this.cachedSecrets).flatMap(getKeys);
	}
}
exports.VaultProvider = VaultProvider;
(_VaultProvider_currentToken = new WeakMap()),
	(_VaultProvider_tokenInfo = new WeakMap()),
	(_VaultProvider_http = new WeakMap());
//# sourceMappingURL=vault.js.map
