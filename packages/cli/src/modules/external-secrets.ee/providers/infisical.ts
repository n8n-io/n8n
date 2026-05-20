import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { AxiosInstance } from 'axios';
import axios from 'axios';
import { type INodeProperties, UnexpectedError } from 'n8n-workflow';

import { DOCS_HELP_NOTICE } from '../constants';
import type { SecretsProviderSettings } from '../types';
import { SecretsProvider } from '../types';

interface InfisicalSettings {
	siteURL: string;
	projectId: string;
	environment: string;
	secretPath: string;
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
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
			noDataExpression: true,
			placeholder: 'e.g. 8a7b1f1c-9f2a-4d6c-bf1a-2c4e6f8b1d3a',
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
		},
	];

	displayName = 'Infisical';

	name = 'infisical';

	private cachedSecrets: Record<string, string> = {};

	private settings: InfisicalSettings;

	private http: AxiosInstance;

	private currentToken: string | null = null;

	private tokenExpiresAt: number | null = null;

	private refreshTimeout: NodeJS.Timeout | null = null;

	private refreshAbort = new AbortController();

	constructor(readonly logger = Container.get(Logger)) {
		super();
		this.logger = this.logger.scoped('external-secrets');
	}

	async init(settings: SecretsProviderSettings): Promise<void> {
		this.settings = settings.settings as unknown as InfisicalSettings;

		const baseURL = new URL(this.settings.siteURL);

		this.http = axios.create({ baseURL: baseURL.toString() });
		this.http.interceptors.request.use((config) => {
			if (this.currentToken) {
				config.headers.Authorization = `Bearer ${this.currentToken}`;
			}
			return config;
		});

		this.logger.debug('Infisical provider initialized');
	}

	protected async doConnect(): Promise<void> {
		this.refreshAbort = new AbortController();

		if (!this.settings.clientId || !this.settings.clientSecret) {
			throw new UnexpectedError('Client ID and Client Secret are required for Universal Auth');
		}
		await this.loginUniversalAuth();

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
			const resp = await this.http.get(
				`/api/v1/workspace/${encodeURIComponent(this.settings.projectId)}`,
				{ validateStatus: () => true },
			);

			if (resp.status >= 200 && resp.status < 300) {
				return [true];
			}

			if (resp.status === 401) {
				return [false, 'Invalid credentials'];
			}
			if (resp.status === 403) {
				return [
					false,
					'Permission denied. Verify the machine identity has access to this project.',
				];
			}
			if (resp.status === 404) {
				return [false, 'Project not found. Check the Project ID and Site URL.'];
			}

			return [false, `Unexpected response from Infisical (status ${resp.status}).`];
		} catch (error) {
			if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
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
			if (axios.isAxiosError(error) && error.response?.status === 401) {
				this.logger.debug('Infisical token rejected during update; re-authenticating and retrying');
				await this.loginUniversalAuth();
				this.cacheSecrets(await this.fetchSecrets());
				return;
			}
			throw error;
		}
	}

	private async fetchSecrets(): Promise<InfisicalListSecretsResponse> {
		const resp = await this.http.get<InfisicalListSecretsResponse>('/api/v4/secrets', {
			params: {
				projectId: this.settings.projectId,
				environment: this.settings.environment,
				secretPath: this.settings.secretPath,
			},
		});
		return resp.data;
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
		const resp = await this.http.post<InfisicalUniversalAuthLoginResponse>(
			'/api/v1/auth/universal-auth/login',
			{
				clientId: this.settings.clientId,
				clientSecret: this.settings.clientSecret,
			},
		);

		this.currentToken = resp.data.accessToken;
		this.tokenExpiresAt =
			Date.now() + Math.max(resp.data.expiresIn - TOKEN_REFRESH_LEEWAY_SECONDS, 60) * 1000;
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
}
