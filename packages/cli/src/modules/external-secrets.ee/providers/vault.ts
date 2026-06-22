import { Logger } from '@n8n/backend-common';
import {
	type HttpRequestClient,
	isConnectionRefusedError,
	OutboundHttp,
} from '@n8n/backend-network';
import { Container } from '@n8n/di';
import type {
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeProperties,
} from 'n8n-workflow';

import { DOCS_HELP_NOTICE } from '../constants';
import { ExternalSecretsConfig } from '../external-secrets.config';
import type { SecretsProviderSettings } from '../types';
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

	// Manual KV configuration (bypasses sys/mounts auto-discovery)
	kvMountPath?: string;
	kvVersion?: string;
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
	options: Record<string, string | number | boolean | null> | null;
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

		// Manual KV configuration
		{
			displayName: 'KV Mount Path (optional)',
			name: 'kvMountPath',
			type: 'string',
			default: '',
			required: false,
			noDataExpression: true,
			placeholder: 'e.g. secret/',
			hint: 'Specify the KV engine mount path to skip sys/mounts auto-discovery. Leave blank to auto-detect.',
		},
		{
			displayName: 'KV Version',
			name: 'kvVersion',
			type: 'options',
			default: '2',
			required: false,
			noDataExpression: true,
			options: [
				{ name: 'v1', value: '1' },
				{ name: 'v2', value: '2' },
			],
			hint: 'Only used when KV Mount Path is specified.',
		},
	];

	displayName = 'HashiCorp Vault';

	name = 'vault';

	private cachedSecrets: Record<string, IDataObject> = {};

	private settings: VaultSettings;

	#currentToken: string | null = null;

	#tokenInfo: VaultTokenInfo | null = null;

	#http: HttpRequestClient;

	private refreshTimeout: NodeJS.Timeout | null;

	private refreshAbort = new AbortController();

	constructor(
		readonly logger = Container.get(Logger),
		private readonly outboundHttp = Container.get(OutboundHttp),
	) {
		super();
		this.logger = this.logger.scoped('external-secrets');
	}

	async init(settings: SecretsProviderSettings): Promise<void> {
		this.settings = settings.settings as unknown as VaultSettings;

		this.#http = this.outboundHttp.requests({
			baseURL: this.settings.url,
			headers: () => this.buildAuthHeaders(),
			ssrf: 'disabled',
		});

		this.logger.debug('Vault provider initialized');
	}

	protected async doConnect(): Promise<void> {
		// Authenticate based on method
		if (this.settings.authMethod === 'token') {
			this.#currentToken = this.settings.token;
		} else if (this.settings.authMethod === 'usernameAndPassword') {
			this.#currentToken = await this.authUsernameAndPassword(
				this.settings.username,
				this.settings.password,
			);
			if (!this.#currentToken) {
				throw new Error('Failed to authenticate with Username and Password');
			}
		} else if (this.settings.authMethod === 'appRole') {
			this.#currentToken = await this.authAppRole(this.settings.roleId, this.settings.secretId);
			if (!this.#currentToken) {
				throw new Error('Failed to authenticate with AppRole');
			}
		}

		// Test connection
		const [testSuccess] = await this.test();
		if (!testSuccess) {
			throw new Error('Connection test failed');
		}

		// Setup token refresh
		[this.#tokenInfo] = await this.getTokenInfo();
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
			await this.#http.request({ url: 'auth/token/renew-self', method: 'POST' });

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
			const body = (await this.#http.request({
				method: 'POST',
				url: `auth/userpass/login/${username}`,
				json: true,
				body: { password },
			})) as VaultUserPassLoginResp;

			return body.auth.client_token;
		} catch {
			return null;
		}
	}

	private async authAppRole(roleId: string, secretId: string): Promise<string | null> {
		try {
			const body = (await this.#http.request({
				method: 'POST',
				url: 'auth/approle/login',
				json: true,
				body: { role_id: roleId, secret_id: secretId },
			})) as VaultAppRoleResp;

			return body.auth.client_token;
		} catch {
			return null;
		}
	}

	private async getTokenInfo(): Promise<[VaultTokenInfo | null, IN8nHttpFullResponse]> {
		const resp = await this.requestFull({
			method: 'GET',
			url: 'auth/token/lookup-self',
			json: true,
		});

		const body = resp.body as VaultResponse<VaultTokenInfo> | undefined;
		if (resp.statusCode !== 200 || !body?.data) {
			return [null, resp];
		}
		return [body.data, resp];
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
		let listBody: VaultResponse<VaultSecretList>;
		try {
			const shouldPreferGet = Container.get(ExternalSecretsConfig).preferGet;
			const url = `${listPath}${shouldPreferGet ? '?list=true' : ''}`;
			// non-standard `LIST` verb works; `preferGet` swaps it for `GET ?list=true`.
			const method = (shouldPreferGet ? 'GET' : 'LIST') as IHttpRequestMethods;
			listBody = (await this.#http.request({ url, method })) as VaultResponse<VaultSecretList>;
		} catch {
			return null;
		}
		const data = Object.fromEntries(
			(
				await Promise.allSettled(
					listBody.data.keys.map(async (key): Promise<[string, IDataObject] | null> => {
						if (key.endsWith('/')) {
							return await this.getKVSecrets(mountPath, kvVersion, path + key);
						}
						let secretPath = mountPath;
						if (kvVersion === '2') {
							secretPath += 'data/';
						}
						secretPath += path + key;
						try {
							const secretBody = (await this.#http.request({
								url: secretPath,
								method: 'GET',
							})) as VaultResponse<IDataObject>;
							this.logger.debug(`Vault provider retrieved secrets from ${secretPath}`);
							return [
								key,
								kvVersion === '2' ? (secretBody.data.data as IDataObject) : secretBody.data,
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

	private normalizeKvPath(mountPath: string): string {
		return mountPath.endsWith('/') ? mountPath : `${mountPath}/`;
	}

	private async discoverKvMounts(): Promise<Array<{ path: string; version: string }>> {
		const { kvMountPath, kvVersion } = this.settings;

		if (kvMountPath) {
			return [{ path: this.normalizeKvPath(kvMountPath), version: kvVersion ?? '2' }];
		}

		const mounts = (await this.#http.request({
			url: 'sys/mounts',
			method: 'GET',
		})) as VaultResponse<VaultMountsResp>;
		const kvMounts = Object.entries(mounts.data).filter(([, mount]) => mount.type === 'kv');

		return kvMounts
			.map(([basePath, mount]) => {
				const version = mount.options?.version;
				if (typeof version !== 'string') {
					this.logger.debug(`Skipping KV mount "${basePath}" — no version in mount options`);
					return null;
				}
				return { path: basePath, version };
			})
			.filter((entry): entry is { path: string; version: string } => entry !== null);
	}

	private async testSecretAccess(): Promise<[boolean] | [boolean, string]> {
		const { kvMountPath, kvVersion } = this.settings;

		let listUrl: string;
		let forbiddenMessage: string;
		let failureMessage: (status: number) => string;

		if (kvMountPath) {
			const normalizedPath = this.normalizeKvPath(kvMountPath);
			const version = kvVersion ?? '2';
			listUrl =
				version === '2' ? `${normalizedPath}metadata/?list=true` : `${normalizedPath}?list=true`;
			forbiddenMessage = `Permission denied accessing ${kvMountPath}. Check your token policies.`;
			failureMessage = (status) =>
				`Could not access KV mount at ${kvMountPath} (status ${status}).`;
		} else {
			listUrl = 'sys/mounts';
			forbiddenMessage =
				"Couldn't list mounts. Please give these credentials 'read' access to sys/mounts.";
			failureMessage = () =>
				"Couldn't list mounts but it wasn't a permissions issue. Please consult your Vault admin.";
		}

		const resp = await this.requestFull({ url: listUrl, method: 'GET' });

		if (resp.statusCode === 403) {
			return [false, forbiddenMessage];
		}
		// Vault returns 404 when listing an empty KV mount — this is valid, not an error
		if (resp.statusCode === 200 || (kvMountPath && resp.statusCode === 404)) {
			return [true];
		}
		return [false, failureMessage(resp.statusCode)];
	}

	async update(): Promise<void> {
		const kvMounts = await this.discoverKvMounts();

		const secrets = Object.fromEntries(
			(
				await Promise.all(
					kvMounts.map(async ({ path, version }): Promise<[string, IDataObject] | null> => {
						const value = await this.getKVSecrets(path, version, '');
						if (value === null) {
							return null;
						}
						return [path.substring(0, path.length - 1), value[1]];
					}),
				)
			).filter((entry): entry is [string, IDataObject] => entry !== null),
		);
		this.cachedSecrets = secrets;
		this.logger.debug('Vault provider secrets updated');
	}

	async test(): Promise<[boolean] | [boolean, string]> {
		try {
			const [token, tokenResp] = await this.getTokenInfo();

			if (token === null) {
				if (tokenResp.statusCode === 404) {
					return [false, 'Could not find auth path. Try adding /v1/ to the end of your base URL.'];
				}
				return [false, 'Invalid credentials'];
			}

			return await this.testSecretAccess();
		} catch (error) {
			if (isConnectionRefusedError(error)) {
				return [
					false,
					'Connection refused. Please check the host and port of the server are correct.',
				];
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
			if (typeof v === 'object') {
				const keys: string[] = [];
				for (const key of Object.keys(v)) {
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

	private buildAuthHeaders(): Record<string, string> {
		const headers: Record<string, string> = {};
		if (this.settings.namespace) {
			headers['X-Vault-Namespace'] = this.settings.namespace;
		}
		if (this.#currentToken) {
			headers['X-Vault-Token'] = this.#currentToken;
		}
		return headers;
	}

	private async requestFull(options: IHttpRequestOptions): Promise<IN8nHttpFullResponse> {
		return await this.#http.request({
			...options,
			returnFullResponse: true,
			ignoreHttpStatusErrors: true, // Resolve non-2xx responses instead of throwing so the status checks below can return tailored messages.
		});
	}
}
