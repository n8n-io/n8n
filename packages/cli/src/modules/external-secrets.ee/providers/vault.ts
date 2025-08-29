import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { AxiosInstance, AxiosResponse } from 'axios';
import axios from 'axios';
import type { IDataObject, INodeProperties } from 'n8n-workflow';

import { DOCS_HELP_NOTICE, EXTERNAL_SECRETS_NAME_REGEX } from '../constants';
import { ExternalSecretsConfig } from '../external-secrets.config';
import type { SecretsProviderSettings, SecretsProviderState } from '../types';
import { SecretsProvider } from '../types';

type VaultAuthMethod = 'token' | 'usernameAndPassword' | 'appRole';

interface VaultSettings {
	url: string;
	namespace?: string;
	authMethod: VaultAuthMethod;

	// Token
	token: string;
	renewToken: boolean;

	// Username and Password
	username: string;
	password: string;

	// AppRole
	roleId: string;
	secretId: string;
}

interface VaultResponse<T> {
	data: T;
}

interface VaultTokenInfo {
	accessor: string;
	creation_time: number;
	creation_ttl: number;
	display_name: string;
	entity_id: string;
	expire_time: string | null;
	explicit_max_ttl: number;
	id: string;
	issue_time: string;
	meta: Record<string, string | number>;
	num_uses: number;
	orphan: boolean;
	path: string;
	policies: string[];
	ttl: number;
	renewable: boolean;
	type: 'kv' | string;
}

interface VaultMount {
	accessor: string;
	config: Record<string, string | number | boolean | null>;
	description: string;
	external_entropy_access: boolean;
	local: boolean;
	options: Record<string, string | number | boolean | null>;
	plugin_version: string;
	running_plugin_version: string;
	running_sha256: string;
	seal_wrap: number;
	type: string;
	uuid: string;
}

interface VaultMountsResp {
	[path: string]: VaultMount;
}

interface VaultUserPassLoginResp {
	auth: {
		client_token: string;
	};
}

type VaultAppRoleResp = VaultUserPassLoginResp;

interface VaultSecretList {
	keys: string[];
}

export class VaultProvider extends SecretsProvider {
	properties: INodeProperties[] = [
		DOCS_HELP_NOTICE,
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

		// Token Auth
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
		// {
		// 	displayName: 'Renew Token',
		// 	name: 'renewToken',
		// 	description:
		// 		'Try to renew Vault token. This will update the settings on this provider when doing so.',
		// 	type: 'boolean',
		// 	noDataExpression: true,
		// 	default: true,
		// 	displayOptions: {
		// 		show: {
		// 			authMethod: ['token'],
		// 		},
		// 	},
		// },

		// Username and Password
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

		// Username and Password
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

	displayName = 'HashiCorp Vault';

	name = 'vault';

	state: SecretsProviderState = 'initializing';

	private cachedSecrets: Record<string, IDataObject> = {};

	private settings: VaultSettings;

	#currentToken: string | null = null;

	#tokenInfo: VaultTokenInfo | null = null;

	#http: AxiosInstance;

	private refreshTimeout: NodeJS.Timeout | null;

	private refreshAbort = new AbortController();

	constructor(readonly logger = Container.get(Logger)) {
		super();
		this.logger = this.logger.scoped('external-secrets');
	}

	async init(settings: SecretsProviderSettings): Promise<void> {
		this.settings = settings.settings as unknown as VaultSettings;

		const baseURL = new URL(this.settings.url);

		this.#http = axios.create({ baseURL: baseURL.toString() });
		if (this.settings.namespace) {
			this.#http.interceptors.request.use((config) => {
				config.headers['X-Vault-Namespace'] = this.settings.namespace;
				return config;
			});
		}
		this.#http.interceptors.request.use((config) => {
			if (this.#currentToken) {
				config.headers['X-Vault-Token'] = this.#currentToken;
			}
			return config;
		});

		this.logger.debug('Vault provider initialized');
	}

	async connect(): Promise<void> {
		if (this.settings.authMethod === 'token') {
			this.#currentToken = this.settings.token;
		} else if (this.settings.authMethod === 'usernameAndPassword') {
			try {
				this.#currentToken = await this.authUsernameAndPassword(
					this.settings.username,
					this.settings.password,
				);
			} catch {
				this.state = 'error';
				this.logger.error('Failed to connect to Vault using Username and Password credentials.');
				return;
			}
		} else if (this.settings.authMethod === 'appRole') {
			try {
				this.#currentToken = await this.authAppRole(this.settings.roleId, this.settings.secretId);
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

				[this.#tokenInfo] = await this.getTokenInfo();
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

	async disconnect(): Promise<void> {
		if (this.refreshTimeout !== null) {
			clearTimeout(this.refreshTimeout);
		}
		this.refreshAbort.abort();
	}

	private setupTokenRefresh() {
		if (!this.#tokenInfo) {
			return;
		}
		// Token never expires
		if (this.#tokenInfo.expire_time === null) {
			return;
		}
		// Token can't be renewed
		if (!this.#tokenInfo.renewable) {
			return;
		}

		const expireDate = new Date(this.#tokenInfo.expire_time);
		setTimeout(this.tokenRefresh, (expireDate.valueOf() - Date.now()) / 2);
	}

	private tokenRefresh = async () => {
		if (this.refreshAbort.signal.aborted) {
			return;
		}
		try {
			// We don't actually care about the result of this since it doesn't
			// return an expire_time
			await this.#http.post('auth/token/renew-self');

			[this.#tokenInfo] = await this.getTokenInfo();

			if (!this.#tokenInfo) {
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

	private async authUsernameAndPassword(
		username: string,
		password: string,
	): Promise<string | null> {
		try {
			const resp = await this.#http.request<VaultUserPassLoginResp>({
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

	private async authAppRole(roleId: string, secretId: string): Promise<string | null> {
		try {
			const resp = await this.#http.request<VaultAppRoleResp>({
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

	private async getTokenInfo(): Promise<[VaultTokenInfo | null, AxiosResponse]> {
		const resp = await this.#http.request<VaultResponse<VaultTokenInfo>>({
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

	private async getKVSecrets(
		mountPath: string,
		kvVersion: string,
		path: string,
	): Promise<[string, IDataObject] | null> {
		this.logger.debug(`Getting kv secrets from ${mountPath}${path} (version ${kvVersion})`);
		let listPath = mountPath;
		if (kvVersion === '2') {
			listPath += 'metadata/';
		}
		listPath += path;
		let listResp: AxiosResponse<VaultResponse<VaultSecretList>>;
		try {
			const shouldPreferGet = Container.get(ExternalSecretsConfig).preferGet;
			const url = `${listPath}${shouldPreferGet ? '?list=true' : ''}`;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const method = shouldPreferGet ? 'GET' : ('LIST' as any);
			listResp = await this.#http.request<VaultResponse<VaultSecretList>>({
				url,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				method,
			});
		} catch {
			return null;
		}
		const data = Object.fromEntries(
			(
				await Promise.allSettled(
					listResp.data.data.keys.map(async (key): Promise<[string, IDataObject] | null> => {
						if (key.endsWith('/')) {
							return await this.getKVSecrets(mountPath, kvVersion, path + key);
						}
						let secretPath = mountPath;
						if (kvVersion === '2') {
							secretPath += 'data/';
						}
						secretPath += path + key;
						try {
							const secretResp = await this.#http.get<VaultResponse<IDataObject>>(secretPath);
							this.logger.debug(`Vault provider retrieved secrets from ${secretPath}`);
							return [
								key,
								kvVersion === '2'
									? (secretResp.data.data.data as IDataObject)
									: secretResp.data.data,
							];
						} catch {
							return null;
						}
					}),
				)
			)
				.map((i) => (i.status === 'rejected' ? null : i.value))
				.filter((v): v is [string, IDataObject] => v !== null),
		);
		const name = path.substring(0, path.length - 1);
		this.logger.debug(`Vault provider retrieved kv secrets from ${name}`);
		return [name, data];
	}

	async update(): Promise<void> {
		const mounts = await this.#http.get<VaultResponse<VaultMountsResp>>('sys/mounts');

		const kvs = Object.entries(mounts.data.data).filter(([, v]) => v.type === 'kv');

		const secrets = Object.fromEntries(
			(
				await Promise.all(
					kvs.map(async ([basePath, data]): Promise<[string, IDataObject] | null> => {
						const value = await this.getKVSecrets(basePath, data.options.version as string, '');
						if (value === null) {
							return null;
						}
						return [basePath.substring(0, basePath.length - 1), value[1]];
					}),
				)
			).filter((v): v is [string, IDataObject] => v !== null),
		);
		this.cachedSecrets = secrets;
		this.logger.debug('Vault provider secrets updated');
	}

	async test(): Promise<[boolean] | [boolean, string]> {
		try {
			const [token, tokenResp] = await this.getTokenInfo();

			if (token === null) {
				if (tokenResp.status === 404) {
					return [false, 'Could not find auth path. Try adding /v1/ to the end of your base URL.'];
				}
				return [false, 'Invalid credentials'];
			}

			const resp = await this.#http.request<VaultResponse<VaultTokenInfo>>({
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
			if (axios.isAxiosError(e)) {
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

	getSecret(name: string): IDataObject {
		return this.cachedSecrets[name];
	}

	hasSecret(name: string): boolean {
		return name in this.cachedSecrets;
	}

	getSecretNames(): string[] {
		const getKeys = ([k, v]: [string, IDataObject]): string[] => {
			if (!EXTERNAL_SECRETS_NAME_REGEX.test(k)) {
				return [];
			}
			if (typeof v === 'object') {
				const keys: string[] = [];
				for (const key of Object.keys(v)) {
					if (!EXTERNAL_SECRETS_NAME_REGEX.test(key)) {
						continue;
					}
					const value = v[key];
					if (typeof value === 'object' && value !== null) {
						keys.push(...getKeys([key, value as IDataObject]).map((ok) => `${k}.${ok}`));
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
