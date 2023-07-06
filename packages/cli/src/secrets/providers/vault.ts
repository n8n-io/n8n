import type { SecretsProviderSettings, SecretsProviderState } from '@/Interfaces';
import { SecretsProvider } from '@/Interfaces';
import type { IDataObject, INodeProperties } from 'n8n-workflow';
import type { AxiosInstance, AxiosResponse } from 'axios';
import axios from 'axios';
import { getLogger } from '@/Logger';

const logger = getLogger();

type VaultAuthMethod = 'token' | 'usernameAndPassword';

interface VaultSettings {
	url: string;
	authMethod: VaultAuthMethod;

	// Token
	token: string;
	renewToken: boolean;

	// Username and Password
	username: string;
	password: string;
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

interface VaultSecretList {
	keys: string[];
}

export class VaultProvider extends SecretsProvider {
	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'url',
			type: 'string',
			hint: 'Base URL of the Vault instance',
			required: true,
			placeholder: 'https://example.com/v1/',
			default: '',
		},
		{
			displayName: 'Authentication Method',
			name: 'authMethod',
			type: 'options',
			noDataExpression: true,
			options: [
				{ name: 'Token', value: 'token' },
				{ name: 'Username and Password', value: 'usernameAndPassword' },
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
			placeholder: '***************',
			typeOptions: { password: true },
			displayOptions: {
				show: {
					authMethod: ['token'],
				},
			},
		},
		{
			displayName: 'Renew Token',
			name: 'renewToken',
			description:
				'Try to renew Vault token. This will update the settings on this provider when doing so.',
			type: 'boolean',
			default: true,
			displayOptions: {
				show: {
					authMethod: ['token'],
				},
			},
		},

		// Username and Password
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
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
			placeholder: '***************',
			typeOptions: { password: true },
			displayOptions: {
				show: {
					authMethod: ['usernameAndPassword'],
				},
			},
		},
	];

	displayName = 'Hashicorp Vault';

	name = 'vault';

	state: SecretsProviderState = 'initializing';

	private cachedSecrets: Record<string, IDataObject> = {};

	private settings: VaultSettings;

	#currentToken: string | null = null;

	#tokenInfo: VaultTokenInfo | null = null;

	#http: AxiosInstance;

	private refreshTimeout: NodeJS.Timer | null;

	private refreshAbort = new AbortController();

	async init(settings: SecretsProviderSettings): Promise<void> {
		this.settings = settings.settings as unknown as VaultSettings;

		const baseURL = new URL(this.settings.url);
		if (!baseURL.pathname.endsWith('v1') && !baseURL.pathname.endsWith('v1/')) {
			baseURL.pathname += '/v1/';
		}

		this.#http = axios.create({ baseURL: baseURL.toString() });
		this.#http.interceptors.request.use((config) => {
			if (!this.#currentToken) {
				return config;
			}
			// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unsafe-assignment
			return { ...config, headers: { ...config.headers, 'X-Vault-Token': this.#currentToken } };
		});
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
				return;
			}
		}
		if (!(await this.test())) {
			this.state = 'error';
		} else {
			this.state = 'connected';
		}
		this.#tokenInfo = await this.getTokenInfo();
		this.setupTokenRefresh();
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

			this.#tokenInfo = await this.getTokenInfo();

			if (!this.#tokenInfo) {
				logger.error('Failed to fetch token info during renewal. Cancelling all future renewals.');
				return;
			}

			if (this.refreshAbort.signal.aborted) {
				return;
			}

			this.setupTokenRefresh();
		} catch {
			logger.error('Failed to renew Vault token. Attempting to reconnect.');
			void this.connect();
		}
	};

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

	private async getTokenInfo(): Promise<VaultTokenInfo | null> {
		const resp = await this.#http.request<VaultResponse<VaultTokenInfo>>({
			method: 'GET',
			url: 'auth/token/lookup-self',
			responseType: 'json',
			validateStatus: (status) => status === 403 || status === 200,
		});

		if (resp.status === 403) {
			return null;
		}
		return resp.data.data;
	}

	private async getKVSecrets(
		mountPath: string,
		kvVersion: string,
		path: string,
	): Promise<[string, IDataObject] | null> {
		let listPath = mountPath;
		if (kvVersion === '2') {
			listPath += 'metadata/';
		}
		listPath += path;
		let listResp: AxiosResponse<VaultResponse<VaultSecretList>>;
		try {
			listResp = await this.#http.request<VaultResponse<VaultSecretList>>({
				url: listPath,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
				method: 'LIST' as any,
			});
		} catch {
			return null;
		}
		const data = Object.fromEntries(
			(
				await Promise.all(
					listResp.data.data.keys.map(async (key): Promise<[string, IDataObject] | null> => {
						if (key.endsWith('/')) {
							return this.getKVSecrets(mountPath, kvVersion, path + key);
						}
						let secretPath = mountPath;
						if (kvVersion === '2') {
							secretPath += 'data/';
						}
						secretPath += path + key;
						try {
							const secretResp = await this.#http.get<VaultResponse<IDataObject>>(secretPath);
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
			).filter((v) => v !== null) as Array<[string, IDataObject]>,
		);
		const name = path.substring(0, path.length - 1);
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
			).filter((v) => v !== null) as Array<[string, IDataObject]>,
		);
		this.cachedSecrets = secrets;
	}

	async test(): Promise<[boolean] | [boolean, string]> {
		const token = await this.getTokenInfo();

		if (token === null) {
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
	}

	getSecret(name: string): string {
		return this.cachedSecrets[name] as unknown as string;
	}

	getSecretNames(): string[] {
		return Object.keys(this.cachedSecrets);
	}
}
