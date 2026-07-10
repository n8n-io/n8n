import { Logger } from '@n8n/backend-common';
import {
	type HttpRequestClient,
	httpStatusFromError,
	isConnectionRefusedError,
	OutboundHttp,
} from '@n8n/backend-network';
import { Container } from '@n8n/di';
import { type INodeProperties, UnexpectedError } from 'n8n-workflow';

import { DOCS_HELP_NOTICE } from '../constants';
import {
	buildHttpProviderErrorContext,
	logSecretsProviderOperationFailure,
	type LogContext,
	type SecretsProviderOperationFailureParams,
} from '../errors/secrets-provider-errors';
import type { SecretsProviderSettings } from '../types';
import { SecretsProvider } from '../types';

export type InfisicalAuthMethod = 'universalAuth';

export interface InfisicalSettings {
	siteURL: string;
	projectId: string;
	environment: string;
	secretPath: string;
	authMethod: InfisicalAuthMethod;

	// Universal Auth
	clientId: string;
	clientSecret: string;
}

export interface InfisicalUniversalAuthLoginResponse {
	accessToken: string;
	expiresIn: number;
	accessTokenMaxTTL: number;
	tokenType: string;
}

export interface InfisicalSecret {
	secretKey: string;
	secretValue: string;
}

export interface InfisicalImport {
	secrets: InfisicalSecret[];
	secretPath: string;
	environment: string;
}

export interface InfisicalListSecretsResponse {
	secrets: InfisicalSecret[];
	imports: InfisicalImport[];
}

const TOKEN_REFRESH_LEEWAY_SECONDS = 60;
const MIN_REFRESH_DELAY_MS = 60 * 1000;

export class InfisicalProvider extends SecretsProvider {
	properties: INodeProperties[] = [
		DOCS_HELP_NOTICE,
		{
			displayName: 'Site URL',
			name: 'siteURL',
			type: 'string',
			hint: "The absolute URL of the Infisical instance. Change it only if you're self-hosting Infisical.",
			required: true,
			noDataExpression: true,
			placeholder: 'https://app.infisical.com',
			default: 'https://app.infisical.com',
		},
		{
			displayName: 'Project ID',
			name: 'projectId',
			type: 'string',
			hint: 'The Infisical project to read secrets from',
			required: true,
			noDataExpression: true,
			placeholder: 'e.g. 7c1cbe9c-3f1b-4a92-b3a2-9d5e2f1c8a4b',
			default: '',
		},
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'string',
			hint: 'Environment slug (e.g. dev, staging, prod)',
			required: true,
			noDataExpression: true,
			placeholder: 'dev',
			default: 'dev',
		},
		{
			displayName: 'Secret Path',
			name: 'secretPath',
			type: 'string',
			hint: 'The path within the project to read secrets from',
			required: true,
			noDataExpression: true,
			placeholder: '/',
			default: '/',
		},
		{
			displayName: 'Authentication Method',
			name: 'authMethod',
			type: 'options',
			required: true,
			noDataExpression: true,
			options: [{ name: 'Universal Auth', value: 'universalAuth' }],
			default: 'universalAuth',
		},

		// Universal Auth
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
			noDataExpression: true,
			placeholder: 'e.g. 8a7b1f1c-9f2a-4d6c-bf1a-2c4e6f8b1d3a',
			displayOptions: {
				show: {
					authMethod: ['universalAuth'],
				},
			},
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			default: '',
			required: true,
			noDataExpression: true,
			placeholder: '***************',
			typeOptions: { password: true },
			displayOptions: {
				show: {
					authMethod: ['universalAuth'],
				},
			},
		},
	];

	displayName = 'Infisical';

	name = 'infisical';

	private cachedSecrets: Record<string, string> = {};

	private settings: InfisicalSettings;

	private http: HttpRequestClient;

	private currentToken: string | null = null;

	private tokenExpiresAt: number | null = null;

	private refreshTimeout: NodeJS.Timeout | null = null;

	private refreshAbort = new AbortController();

	constructor(
		readonly logger = Container.get(Logger),
		private readonly outboundHttp = Container.get(OutboundHttp),
	) {
		super();
		this.logger = this.logger.scoped('external-secrets');
	}

	async init(settings: SecretsProviderSettings): Promise<void> {
		this.settings = settings.settings as unknown as InfisicalSettings;

		this.http = this.outboundHttp.requests({
			baseURL: this.settings.siteURL,
			headers: () => this.buildAuthHeaders(),
			ssrf: 'disabled', // admin-configured infrastructure
		});

		this.logger.debug('Infisical provider initialized');
	}

	protected async doConnect(): Promise<void> {
		this.refreshAbort = new AbortController();

		try {
			if (this.settings.authMethod === 'universalAuth') {
				if (!this.settings.clientId || !this.settings.clientSecret) {
					throw new UnexpectedError('Client ID and Client Secret are required for Universal Auth');
				}
				await this.loginUniversalAuth();
			}

			await this.verifyWorkspaceAccess();

			this.setupTokenRefresh();
		} catch (error) {
			const context =
				error instanceof UnexpectedError ? undefined : buildHttpProviderErrorContext(error);
			this.logOperationFailure('Failed to connect Infisical provider', {
				operation: 'connect',
				error,
				context,
			});
			throw error;
		}
	}

	async disconnect(): Promise<void> {
		if (this.refreshTimeout !== null) {
			clearTimeout(this.refreshTimeout);
			this.refreshTimeout = null;
		}
		this.refreshAbort.abort();
		this.currentToken = null;
		this.tokenExpiresAt = null;
		this.cachedSecrets = {};
	}

	async test(): Promise<[boolean] | [boolean, string]> {
		try {
			await this.verifyWorkspaceAccess();
			return [true];
		} catch (error) {
			this.logOperationFailure('Infisical provider test failed', {
				operation: 'test',
				error,
				context: {
					...buildHttpProviderErrorContext(error),
					endpoint: 'workspace',
				},
			});

			if (isConnectionRefusedError(error)) {
				return [false, 'Connection refused. Check the Site URL.'];
			}
			return [false, error instanceof Error ? error.message : 'Connection test failed'];
		}
	}

	async update(): Promise<void> {
		if (!this.currentToken) {
			throw new UnexpectedError('Update attempted on Infisical before authentication');
		}

		try {
			await this.ensureTokenFresh();

			try {
				this.cacheSecrets(await this.fetchSecrets());
			} catch (error) {
				if (httpStatusFromError(error) === 401) {
					this.logger.debug(
						'Infisical token rejected during update; re-authenticating and retrying',
					);
					await this.loginUniversalAuth();
					this.cacheSecrets(await this.fetchSecrets());
					return;
				}
				throw error;
			}
		} catch (error) {
			this.logOperationFailure('Failed to update Infisical provider secrets', {
				operation: 'update',
				error,
				context: {
					...buildHttpProviderErrorContext(error),
					endpoint: 'secrets',
				},
			});
			throw error;
		}
	}

	private async fetchSecrets(): Promise<InfisicalListSecretsResponse> {
		return await this.http.request({
			url: '/api/v4/secrets',
			method: 'GET',
			qs: {
				projectId: this.settings.projectId,
				environment: this.settings.environment,
				secretPath: this.settings.secretPath,
			},
			json: true,
		});
	}

	private dedupeSecrets(secrets: InfisicalSecret[], imports: InfisicalImport[]): InfisicalSecret[] {
		const dedupedSecrets = new Map<string, InfisicalSecret>();
		secrets.forEach((s) => {
			dedupedSecrets.set(s.secretKey, s);
		});
		imports.forEach((i) => {
			i.secrets.forEach((s) => {
				if (!dedupedSecrets.has(s.secretKey)) {
					dedupedSecrets.set(s.secretKey, s);
				}
			});
		});
		return Array.from(dedupedSecrets.values());
	}

	private cacheSecrets(data: InfisicalListSecretsResponse): void {
		const dedupedSecrets = this.dedupeSecrets(data.secrets, data.imports);
		this.cachedSecrets = Object.fromEntries(
			dedupedSecrets.map((s) => [s.secretKey, s.secretValue]),
		);
		this.logger.debug(
			`Infisical provider cached ${Object.keys(this.cachedSecrets).length} secrets`,
		);
	}

	private async ensureTokenFresh(): Promise<void> {
		if (this.tokenExpiresAt === null) return;
		if (Date.now() < this.tokenExpiresAt) return;
		await this.loginUniversalAuth();
	}

	private async loginUniversalAuth(): Promise<void> {
		const body = await this.http.request<InfisicalUniversalAuthLoginResponse>({
			url: '/api/v1/auth/universal-auth/login',
			method: 'POST',
			body: {
				clientId: this.settings.clientId,
				clientSecret: this.settings.clientSecret,
			},
			json: true,
		});

		this.currentToken = body.accessToken;
		this.tokenExpiresAt =
			Date.now() + Math.max(body.expiresIn - TOKEN_REFRESH_LEEWAY_SECONDS, 60) * 1000;
	}

	private setupTokenRefresh(): void {
		if (this.refreshTimeout !== null) {
			clearTimeout(this.refreshTimeout);
			this.refreshTimeout = null;
		}
		if (this.tokenExpiresAt === null) return;

		const remaining = this.tokenExpiresAt - Date.now();
		const refreshIn = Math.max(remaining / 2, MIN_REFRESH_DELAY_MS);
		this.refreshTimeout = setTimeout(this.tokenRefresh, refreshIn);
	}

	private tokenRefresh = async (): Promise<void> => {
		if (this.refreshAbort.signal.aborted) return;
		try {
			await this.loginUniversalAuth();
			if (this.refreshAbort.signal.aborted) return;
			this.setupTokenRefresh();
		} catch (error) {
			this.logOperationFailure('Failed to refresh Infisical token. Attempting reconnect.', {
				operation: 'tokenRefresh',
				error,
				context: buildHttpProviderErrorContext(error),
			});
			void this.connect();
		}
	};

	getSecret(name: string): string | undefined {
		return this.cachedSecrets[name];
	}

	getSecretNames(): string[] {
		return Object.keys(this.cachedSecrets);
	}

	hasSecret(name: string): boolean {
		return name in this.cachedSecrets;
	}

	private buildAuthHeaders(): Record<string, string> {
		if (this.currentToken) {
			return {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				Authorization: `Bearer ${this.currentToken}`,
			};
		}
		return {};
	}

	private async verifyWorkspaceAccess(): Promise<void> {
		const resp = await this.http.request({
			url: `/api/v1/workspace/${encodeURIComponent(this.settings.projectId)}`,
			method: 'GET',
			returnFullResponse: true,
			ignoreHttpStatusErrors: true, // Resolve non-2xx responses instead of throwing so the status checks below can return tailored messages.
		});

		if (resp.statusCode >= 200 && resp.statusCode < 300) {
			return;
		}

		if (resp.statusCode === 401) {
			throw new Error('Invalid credentials');
		}
		if (resp.statusCode === 403) {
			throw new Error('Permission denied. Verify the machine identity has access to this project.');
		}
		if (resp.statusCode === 404) {
			throw new Error('Project not found. Check the Project ID and Site URL.');
		}

		throw new Error(`Unexpected response from Infisical (status ${resp.statusCode}).`);
	}

	private logOperationFailure(
		message: string,
		params: SecretsProviderOperationFailureParams,
	): void {
		const context: LogContext = { ...params.context };
		if (this.settings) {
			const { siteURL, projectId, authMethod, environment, secretPath } = this.settings;
			Object.assign(context, { siteURL, projectId });
			if (params.operation === 'connect' || params.operation === 'tokenRefresh') {
				context.authMethod = authMethod;
			} else if (params.operation === 'update') {
				Object.assign(context, { environment, secretPath });
			}
		}

		logSecretsProviderOperationFailure({
			logger: this.logger,
			message,
			providerName: this.name,
			providerDisplayName: this.displayName,
			operation: params.operation,
			error: params.error,
			context,
		});
	}
}
