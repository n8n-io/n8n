import { Logger } from '@n8n/backend-common';
import {
	type HttpRequestClient,
	isConnectionRefusedError,
	OutboundHttp,
} from '@n8n/backend-network';
import { Container } from '@n8n/di';
import {
	type IDataObject,
	type IHttpRequestMethods,
	type IHttpRequestOptions,
	type IN8nHttpFullResponse,
	type INodeProperties,
} from 'n8n-workflow';

import { DOCS_HELP_NOTICE } from '../constants';
import {
	buildHttpProviderErrorContext,
	logSecretsProviderOperationFailure,
	type SecretsProviderOperationFailureParams,
} from '../errors/secrets-provider-errors';
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
	kvSecretPath?: string;
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

interface KvMount {
	path: string;
	version: string;
	subPath: string;
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
		{
			displayName: 'KV Secret Path (optional)',
			name: 'kvSecretPath',
			type: 'string',
			default: '',
			required: false,
			noDataExpression: true,
			placeholder: 'e.g. my-app/',
			hint: 'Folder inside the KV mount to read secrets from. Leave blank to read the whole mount. Only used when KV Mount Path is specified.',
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
			baseURL: new URL(this.settings.url).toString(), // Normalize here so a malformed URL fails at init time rather than on the first request.
			headers: () => this.buildAuthHeaders(),
			useDefaultSsrfPolicy: 'unsafe', // admin-configured infrastructure
		});

		this.logger.debug('Vault provider initialized');
	}

	protected async doConnect(): Promise<void> {
		try {
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
			const [testSuccess, failureMessage] = await this.test();
			if (!testSuccess) {
				throw new Error(failureMessage ?? 'Connection test failed');
			}

			// Setup token refresh
			[this.#tokenInfo] = await this.getTokenInfo();
			this.setupTokenRefresh();
		} catch (error) {
			if (!this.isVaultAuthFailure(error)) {
				this.logOperationFailure('Failed to connect Vault provider', {
					operation: 'connect',
					error,
					context: {
						...buildHttpProviderErrorContext(error),
						authMethod: this.settings.authMethod,
					},
				});
			}
			throw error;
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
		} catch (error) {
			this.logOperationFailure('Failed to renew Vault token. Attempting to reconnect.', {
				operation: 'tokenRefresh',
				error,
				context: {
					...buildHttpProviderErrorContext(error),
					authMethod: this.settings.authMethod,
				},
			});
			void this.connect();
		}
	};

	private async authUsernameAndPassword(
		username: string,
		password: string,
	): Promise<string | null> {
		try {
			const body = await this.#http.request<VaultUserPassLoginResp>({
				method: 'POST',
				url: `auth/userpass/login/${username}`,
				json: true,
				body: { password },
			});

			return body.auth.client_token;
		} catch (error) {
			this.logOperationFailure('Vault provider username/password authentication failed', {
				operation: 'connect',
				error,
				context: {
					...buildHttpProviderErrorContext(error),
					authMethod: 'usernameAndPassword',
				},
			});
			return null;
		}
	}

	private async authAppRole(roleId: string, secretId: string): Promise<string | null> {
		try {
			const body = await this.#http.request<VaultAppRoleResp>({
				method: 'POST',
				url: 'auth/approle/login',
				json: true,
				body: { role_id: roleId, secret_id: secretId },
			});

			return body.auth.client_token;
		} catch (error) {
			this.logOperationFailure('Vault provider AppRole authentication failed', {
				operation: 'connect',
				error,
				context: {
					...buildHttpProviderErrorContext(error),
					authMethod: 'appRole',
				},
			});
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
	): Promise<IDataObject | null> {
		this.logger.debug(`Getting kv secrets from ${mountPath}${path} (version ${kvVersion})`);
		const listRequest = this.kvListRequest(this.kvApiPath(mountPath, kvVersion, 'metadata', path));
		let listBody: VaultResponse<VaultSecretList>;
		try {
			listBody = await this.#http.request<VaultResponse<VaultSecretList>>(listRequest);
		} catch (error) {
			const errorContext = buildHttpProviderErrorContext(error);
			this.logger.debug('Vault provider failed to list KV secrets', {
				providerName: this.name,
				operation: 'update',
				mountPath,
				kvVersion,
				vaultApiPath: listRequest.url,
				...errorContext,
			});
			return null;
		}
		const data = Object.fromEntries(
			(
				await Promise.allSettled(
					listBody.data.keys.map(async (key): Promise<[string, IDataObject] | null> => {
						if (key.endsWith('/')) {
							const folder = await this.getKVSecrets(mountPath, kvVersion, path + key);
							return folder === null ? null : [key.slice(0, -1), folder];
						}
						const secretPath = this.kvApiPath(mountPath, kvVersion, 'data', path + key);
						try {
							const secretBody = await this.#http.request<VaultResponse<IDataObject>>({
								url: secretPath,
								method: 'GET',
							});
							this.logger.debug(`Vault provider retrieved secrets from ${secretPath}`);
							return [
								key,
								kvVersion === '2' ? (secretBody.data.data as IDataObject) : secretBody.data,
							];
						} catch (error) {
							const errorContext = buildHttpProviderErrorContext(error);
							this.logger.debug('Vault provider failed to read KV secret', {
								providerName: this.name,
								operation: 'update',
								mountPath,
								kvVersion,
								secretPath,
								...errorContext,
							});
							return null;
						}
					}),
				)
			)
				.map((i) => (i.status === 'rejected' ? null : i.value))
				.filter((v): v is [string, IDataObject] => v !== null),
		);
		this.logger.debug(`Vault provider retrieved kv secrets from ${mountPath}${path}`);
		return data;
	}

	private normalizeKvPath(path = ''): string {
		const segments = path
			.split('/')
			.map((segment) => segment.trim())
			.filter(Boolean);
		return segments.length === 0 ? '' : `${segments.join('/')}/`;
	}

	private kvApiPath(
		mountPath: string,
		kvVersion: string,
		segment: 'metadata' | 'data',
		path: string,
	): string {
		return kvVersion === '2' ? `${mountPath}${segment}/${path}` : `${mountPath}${path}`;
	}

	private kvListRequest(listPath: string): { url: string; method: IHttpRequestMethods } {
		const preferGet = Container.get(ExternalSecretsConfig).preferGet;
		return {
			url: `${listPath}${preferGet ? '?list=true' : ''}`,
			// non-standard `LIST` verb works; `preferGet` swaps it for `GET ?list=true`.
			method: (preferGet ? 'GET' : 'LIST') as IHttpRequestMethods,
		};
	}

	private manualKvMount(): KvMount | null {
		const { kvMountPath, kvVersion, kvSecretPath } = this.settings;
		const path = this.normalizeKvPath(kvMountPath);
		if (path === '') {
			return null;
		}
		return { path, version: kvVersion ?? '2', subPath: this.normalizeKvPath(kvSecretPath) };
	}

	private async discoverKvMounts(): Promise<KvMount[]> {
		const manualMount = this.manualKvMount();
		if (manualMount) {
			return [manualMount];
		}

		const mounts = await this.#http.request<VaultResponse<VaultMountsResp>>({
			url: 'sys/mounts',
			method: 'GET',
		});
		const kvMounts = Object.entries(mounts.data).filter(([, mount]) => mount.type === 'kv');

		return kvMounts
			.map(([basePath, mount]) => {
				const version = mount.options?.version;
				if (typeof version !== 'string') {
					this.logger.debug(`Skipping KV mount "${basePath}" — no version in mount options`);
					return null;
				}
				return { path: basePath, version, subPath: '' };
			})
			.filter((entry): entry is KvMount => entry !== null);
	}

	private async testSecretAccess(): Promise<[boolean] | [boolean, string]> {
		const manualMount = this.manualKvMount();

		let listRequest: IHttpRequestOptions;
		let forbiddenMessage: string;
		let failureMessage: (status: number) => string;

		if (manualMount) {
			const listPath = this.kvApiPath(
				manualMount.path,
				manualMount.version,
				'metadata',
				manualMount.subPath,
			);
			listRequest = this.kvListRequest(listPath);
			forbiddenMessage = `Permission denied accessing ${listPath}. Check your token policies.`;
			failureMessage = (status) =>
				status === 404 && manualMount.subPath !== ''
					? `No secrets found at ${listPath}. Check the KV Secret Path.`
					: `Could not access ${listPath} (status ${status}).`;
		} else {
			listRequest = { url: 'sys/mounts', method: 'GET' };
			forbiddenMessage =
				"Couldn't list mounts. Please give these credentials 'read' access to sys/mounts.";
			failureMessage = () =>
				"Couldn't list mounts but it wasn't a permissions issue. Please consult your Vault admin.";
		}

		const resp = await this.requestFull(listRequest);

		if (resp.statusCode === 403) {
			return [false, forbiddenMessage];
		}
		const { body } = resp;
		// Vault answers a LIST on an empty KV mount with 404 and an empty `errors` array; a 404 for an
		// unknown mount or path carries an error message instead (hashicorp/vault#24964).
		const isEmptyMount =
			resp.statusCode === 404 &&
			typeof body === 'object' &&
			body !== null &&
			'errors' in body &&
			Array.isArray(body.errors) &&
			body.errors.length === 0;
		if (resp.statusCode === 200 || (manualMount?.subPath === '' && isEmptyMount)) {
			return [true];
		}
		return [false, failureMessage(resp.statusCode)];
	}

	async update(): Promise<void> {
		try {
			const kvMounts = await this.discoverKvMounts();

			const secrets = Object.fromEntries(
				(
					await Promise.all(
						kvMounts.map(
							async ({ path, version, subPath }): Promise<[string, IDataObject] | null> => {
								const value = await this.getKVSecrets(path, version, subPath);
								if (value === null) {
									return null;
								}
								const nested = subPath
									.split('/')
									.filter(Boolean)
									.reduceRight<IDataObject>((inner, folder) => ({ [folder]: inner }), value);
								return [path.substring(0, path.length - 1), nested];
							},
						),
					)
				).filter((entry): entry is [string, IDataObject] => entry !== null),
			);
			this.cachedSecrets = secrets;

			this.logger.debug('Vault provider secrets updated');
		} catch (error) {
			this.logOperationFailure('Failed to update Vault provider secrets', {
				operation: 'update',
				error,
				context: buildHttpProviderErrorContext(error),
			});
			throw error;
		}
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
			this.logOperationFailure('Vault provider test failed', {
				operation: 'test',
				error,
				context: {
					...buildHttpProviderErrorContext(error),
					vaultApiPath: 'auth/token/lookup-self',
				},
			});

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

	private isVaultAuthFailure(error: unknown): boolean {
		return (
			error instanceof Error &&
			(error.message === 'Failed to authenticate with Username and Password' ||
				error.message === 'Failed to authenticate with AppRole')
		);
	}

	private logOperationFailure(
		message: string,
		params: SecretsProviderOperationFailureParams,
	): void {
		logSecretsProviderOperationFailure({
			logger: this.logger,
			message,
			providerName: this.name,
			providerDisplayName: this.displayName,
			operation: params.operation,
			error: params.error,
			context: params.context ?? {},
		});
	}
}
