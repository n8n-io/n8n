import type { SecretsProvider, SecretsProviderSettings } from '@/Interfaces';
import InfisicalClient from 'infisical-node';
import type { INodeProperties } from 'n8n-workflow';

export interface InfisicalSettings {
	token: string;
	siteURL: string;
	cacheTTL: number;
	debug: boolean;
}

interface InfisicalSecret {
	secretName: string;
	secretValue?: string;
}

export class InfisicalProvider implements SecretsProvider {
	properties: INodeProperties[] = [
		{
			displayName: 'Token',
			name: 'token',
			type: 'string',
			default: '',
			placeholder: '***************',
			typeOptions: { password: true },
			noDataExpression: true,
		},
		{
			displayName: 'Site URL',
			name: 'siteURL',
			type: 'string',
			placeholder: 'https://app.infisical.com',
			default: 'https://app.infisical.com',
			noDataExpression: true,
		},
		{
			displayName: 'Cache TTL',
			name: 'cacheTTL',
			type: 'number',
			placeholder: '300',
			default: 300,
			noDataExpression: true,
		},
		{
			displayName: 'Debug Mode',
			name: 'debug',
			type: 'boolean',
			default: false,
			noDataExpression: true,
		},
	];

	displayName = 'Infisical';

	name = 'infisical';

	initialized = false;

	private cachedSecrets: Record<string, string> = {};

	private client: InfisicalClient;

	private settings: InfisicalSettings;

	async init(settings: SecretsProviderSettings): Promise<void> {
		this.settings = settings.settings as unknown as InfisicalSettings;
	}

	async update(): Promise<void> {
		if (!this.client) {
			return;
		}
		const secrets = (await this.client.getAllSecrets()) as InfisicalSecret[];
		const newCache = Object.fromEntries(
			secrets.map((s) => [s.secretName, s.secretValue]),
		) as Record<string, string>;
		this.cachedSecrets = newCache;
	}

	async connect(): Promise<void> {
		this.client = new InfisicalClient(this.settings);
	}

	async test() {
		return false;
	}

	getSecret(name: string): string {
		return this.cachedSecrets[name];
	}

	getSecretNames(): string[] {
		return Object.keys(this.cachedSecrets);
	}
}
