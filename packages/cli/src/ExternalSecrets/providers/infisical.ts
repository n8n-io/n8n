import type { SecretsProvider, SecretsProviderSettings, SecretsProviderState } from '@/Interfaces';
import InfisicalClient from 'infisical-node';
import { populateClientWorkspaceConfigsHelper } from 'infisical-node/lib/helpers/key';
import { getServiceTokenData } from 'infisical-node/lib/api/serviceTokenData';
import type { IDataObject, INodeProperties } from 'n8n-workflow';
import { EXTERNAL_SECRETS_NAME_REGEX } from '../constants';

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

interface InfisicalServiceToken {
	environment?: string;
	scopes?: Array<{ environment: string; path: string }>;
}

export class InfisicalProvider implements SecretsProvider {
	properties: INodeProperties[] = [
		{
			displayName:
				'Need help filling out these fields? <a href="https://docs.n8n.io/external-secrets/#connect-n8n-to-your-secrets-store" target="_blank">Open docs</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Service Token',
			name: 'token',
			type: 'string',
			hint: 'The Infisical Service Token with read access',
			default: '',
			required: true,
			placeholder: 'e.g. st.64ae963e1874ea.374226a166439dce.39557e4a1b7bdd82',
			noDataExpression: true,
			typeOptions: { password: true },
		},
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
	];

	displayName = 'Infisical';

	name = 'infisical';

	state: SecretsProviderState = 'initializing';

	private cachedSecrets: Record<string, string> = {};

	private client: InfisicalClient;

	private settings: InfisicalSettings;

	private environment: string;

	async init(settings: SecretsProviderSettings): Promise<void> {
		this.settings = settings.settings as unknown as InfisicalSettings;
	}

	async update(): Promise<void> {
		if (!this.client) {
			throw new Error('Updated attempted on Infisical when initialization failed');
		}
		if (!(await this.test())[0]) {
			throw new Error('Infisical provider test failed during update');
		}
		const secrets = (await this.client.getAllSecrets({
			environment: this.environment,
			path: '/',
			attachToProcessEnv: false,
			includeImports: true,
		})) as InfisicalSecret[];
		const newCache = Object.fromEntries(
			secrets.map((s) => [s.secretName, s.secretValue]),
		) as Record<string, string>;
		if (Object.keys(newCache).length === 1 && '' in newCache) {
			this.cachedSecrets = {};
		} else {
			this.cachedSecrets = newCache;
		}
	}

	async connect(): Promise<void> {
		this.client = new InfisicalClient(this.settings);
		if ((await this.test())[0]) {
			try {
				this.environment = await this.getEnvironment();
				this.state = 'connected';
			} catch {
				this.state = 'error';
			}
		} else {
			this.state = 'error';
		}
	}

	async getEnvironment(): Promise<string> {
		const serviceTokenData = (await getServiceTokenData(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			this.client.clientConfig,
		)) as InfisicalServiceToken;
		if (serviceTokenData.environment) {
			return serviceTokenData.environment;
		}
		if (serviceTokenData.scopes) {
			return serviceTokenData.scopes[0].environment;
		}
		throw new Error("Couldn't find environment for Infisical");
	}

	async test(): Promise<[boolean] | [boolean, string]> {
		if (!this.client) {
			return [false, 'Client not initialized'];
		}
		try {
			await populateClientWorkspaceConfigsHelper(this.client.clientConfig);
			return [true];
		} catch (e) {
			return [false];
		}
	}

	async disconnect(): Promise<void> {
		//
	}

	getSecret(name: string): IDataObject {
		return this.cachedSecrets[name] as unknown as IDataObject;
	}

	getSecretNames(): string[] {
		return Object.keys(this.cachedSecrets).filter((k) => EXTERNAL_SECRETS_NAME_REGEX.test(k));
	}

	hasSecret(name: string): boolean {
		return name in this.cachedSecrets;
	}
}
