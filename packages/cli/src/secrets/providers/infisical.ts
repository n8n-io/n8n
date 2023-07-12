import type { SecretsProvider, SecretsProviderSettings, SecretsProviderState } from '@/Interfaces';
import InfisicalClient from 'infisical-node';
import { populateClientWorkspaceConfigsHelper } from 'infisical-node/lib/helpers/key';
import type { IDataObject, INodeProperties } from 'n8n-workflow';

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
			displayName:
				'Need help filling out these fields? <a href="https://infisical.com/docs/documentation/platform/token" target="_blank">Open docs</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Service Token',
			name: 'token',
			type: 'string',
			hint: 'The Infisical Service Token with read access.',
			default: '',
			required: true,
			placeholder: 'e.g. fe333be1-37f9-40bb-a9f8-d54dce389f17',
			typeOptions: { password: true },
		},
		{
			displayName: 'Site URL',
			name: 'siteURL',
			type: 'string',
			hint: "The absolute URL of the Infisical instance. Change it only if you're self-hosting Infisical.",
			required: true,
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
		if (Object.keys(newCache).length === 1 && '' in newCache) {
			this.cachedSecrets = {};
		} else {
			this.cachedSecrets = newCache;
		}
	}

	async connect(): Promise<void> {
		this.client = new InfisicalClient(this.settings);
		if (await this.test()) {
			this.state = 'connected';
		} else {
			this.state = 'error';
		}
	}

	async test(): Promise<[boolean] | [boolean, string]> {
		if (!this.client) {
			return [false, 'Client not initialized'];
		}
		try {
			await populateClientWorkspaceConfigsHelper(
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				this.client.clientConfig,
			);
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
		return Object.keys(this.cachedSecrets);
	}
}
