import type { IDataObject } from 'n8n-workflow';
import { Service } from 'typedi';

export type ProviderSettings = IDataObject;

export abstract class SecretsProvider {
	static providerName: string;

	providerName: string;

	abstract init(settings: ProviderSettings): Promise<void>;
	abstract update(): Promise<void>;
	abstract getSecret(name: string): string | undefined;
	abstract getSecretNames(): string[];
}

class DummyProvider implements SecretsProvider {
	private static DATA: Record<string, string> = {
		password: 'testpassword',
		api_key: 'testapikey',
	};

	static providerName = 'dummy';

	providerName = DummyProvider.providerName;

	async init(): Promise<void> {
		//
	}

	async update(): Promise<void> {
		//
	}

	getSecret(name: string): string {
		return DummyProvider.DATA[name];
	}

	getSecretNames(): string[] {
		return Object.keys(DummyProvider.DATA);
	}
}

@Service()
export class ExternalSecretsManager {
	private providers: Array<{ new (): SecretsProvider }>;

	private activeProviders: SecretsProvider[];

	private initializingPromise?: Promise<void>;

	initialized = false;

	constructor() {
		this.providers = [DummyProvider];
		this.activeProviders = [new DummyProvider()];
	}

	async init(): Promise<void> {
		if (!this.initialized) {
			if (!this.initializingPromise) {
				this.initializingPromise = new Promise<void>(async (resolve) => {
					this.activeProviders = await this.getActiveProviders();
					// TODO: fetch settings from DB
					await Promise.all(this.activeProviders.map(async (p) => p.init({})));
					this.initialized = true;
					resolve();
					this.initializingPromise = undefined;
				});
			}
			return this.initializingPromise;
		}
	}

	private async getActiveProviders(): Promise<SecretsProvider[]> {
		return [new DummyProvider()];
	}

	async updateSecrets() {
		await Promise.all(this.activeProviders.map(async (p) => p.update()));
	}

	private getActiveProvider(provider: string): SecretsProvider | undefined {
		return this.activeProviders.find((p) => p.providerName === provider);
	}

	hasActiveProvider(provider: string): boolean {
		return this.activeProviders.some((p) => p.providerName === provider);
	}

	getActiveProviderNames(): string[] | undefined {
		return this.activeProviders.map((p) => p.providerName);
	}

	getSecret(provider: string, name: string): string | undefined {
		return this.getActiveProvider(provider)?.getSecret(name);
	}

	getSecretNames(provider: string): string[] | undefined {
		return this.getActiveProvider(provider)?.getSecretNames();
	}
}
