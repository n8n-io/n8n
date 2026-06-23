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
import type { SecretsProviderSettings } from '../types';
import { SecretsProvider } from '../types';

type InfisicalAuthMethod = 'universalAuth';

interface InfisicalSettings {
	siteURL: string;
	projectId: string;
	environment: string;
	secretPath: string;
	authMethod: InfisicalAuthMethod;

	// Universal Auth
	clientId: string;
	clientSecret: string;
}

interface InfisicalUniversalAuthLoginResponse {
	accessToken: string;
	expiresIn: number;
	accessTokenMaxTTL: number;
	tokenType: string;
}

interface InfisicalSecret {
	secretKey: string;
	secretValue: string;
}

interface InfisicalImport {
	secrets: InfisicalSecret[];
	secretPath: string;
	environment: string;
}

interface InfisicalListSecretsResponse {
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
			ssrf: 'disabled', // Settings are configured by admins, so we do not enable SSRF (for now)
		});

		this.logger.debug('Infisical provider initialized');
	}

	protected async doConnect(): Promise<void> {
		this.refreshAbort = new AbortController();

		if (this.settings.authMethod === 'universalAuth') {
			if (!this.settings.clientId || !this.settings.clientSecret) {
				throw new UnexpectedError('Client ID and Client Secret are required for Universal Auth');
			}
			await this.loginUniversalAuth();
		}

		const [testSuccess, testMessage] = await this.test();
		if (!testSuccess) {
			throw new Error(testMessage ?? 'Connection test failed');
		}

		this.setupTokenRefresh();
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
			const resp = await this.http.request({
				url: `/api/v1/workspace/${encodeURIComponent(this.settings.projectId)}`,
				method: 'GET',
				returnFullResponse: true,
				ignoreHttpStatusErrors: true, // Resolve non-2xx responses instead of throwing so the status checks below can return tailored messages.
			});

			if (resp.statusCode >= 200 && resp.statusCode < 300) {
				return [true];
			}

			if (resp.statusCode === 401) {
				return [false, 'Invalid credentials'];
			}
			if (resp.statusCode === 403) {
				return [
					false,
					'Permission denied. Verify the machine identity has access to this project.',
				];
			}
			if (resp.statusCode === 404) {
				return [false, 'Project not found. Check the Project ID and Site URL.'];
			}

			return [false, `Unexpected response from Infisical (status ${resp.statusCode}).`];
		} catch (error) {
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

		await this.ensureTokenFresh();

		try {
			this.cacheSecrets(await this.fetchSecrets());
		} catch (error) {
			if (httpStatusFromError(error) === 401) {
				this.logger.debug('Infisical token rejected during update; re-authenticating and retrying');
				await this.loginUniversalAuth();
				this.cacheSecrets(await this.fetchSecrets());
				return;
			}
			throw error;
		}
	}

	private async fetchSecrets(): Promise<InfisicalListSecretsResponse> {
		return (await this.http.request({
			url: '/api/v4/secrets',
			method: 'GET',
			qs: {
				projectId: this.settings.projectId,
				environment: this.settings.environment,
				secretPath: this.settings.secretPath,
			},
			json: true,
		})) as InfisicalListSecretsResponse;
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
		const body = (await this.http.request({
			url: '/api/v1/auth/universal-auth/login',
			method: 'POST',
			body: {
				clientId: this.settings.clientId,
				clientSecret: this.settings.clientSecret,
			},
			json: true,
		})) as InfisicalUniversalAuthLoginResponse;

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
		} catch {
			this.logger.error('Failed to refresh Infisical token. Attempting reconnect.');
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
}
