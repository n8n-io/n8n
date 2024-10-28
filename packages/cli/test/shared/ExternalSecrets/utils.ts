import { SecretsProvider } from '@/Interfaces';
import type { SecretsProviderSettings, SecretsProviderState } from '@/Interfaces';
import type { IDataObject, INodeProperties } from 'n8n-workflow';

export class MockProviders {
	providers: Record<string, { new (): SecretsProvider }> = {
		dummy: DummyProvider,
	};

	setProviders(providers: Record<string, { new (): SecretsProvider }>) {
		this.providers = providers;
	}

	getProvider(name: string): { new (): SecretsProvider } | null {
		return this.providers[name] ?? null;
	}

	hasProvider(name: string) {
		return name in this.providers;
	}

	getAllProviders() {
		return this.providers;
	}
}

export class DummyProvider extends SecretsProvider {
	properties: INodeProperties[] = [
		{
			name: 'username',
			displayName: 'Username',
			type: 'string',
			default: '',
			required: true,
		},
		{
			name: 'other',
			displayName: 'Other',
			type: 'string',
			default: '',
		},
		{
			name: 'password',
			displayName: 'Password',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
		},
	];

	secrets: Record<string, string> = {};

	displayName = 'Dummy Provider';

	name = 'dummy';

	state: SecretsProviderState = 'initializing';

	_updateSecrets: Record<string, string> = {
		test1: 'value1',
		test2: 'value2',
	};

	async init(_settings: SecretsProviderSettings<IDataObject>): Promise<void> {}

	async connect(): Promise<void> {
		this.state = 'connected';
	}

	async disconnect(): Promise<void> {}

	async update(): Promise<void> {
		this.secrets = this._updateSecrets;
	}

	async test(): Promise<[boolean] | [boolean, string]> {
		return [true];
	}

	getSecret(name: string): IDataObject | undefined {
		return this.secrets[name] as unknown as IDataObject | undefined;
	}

	hasSecret(name: string): boolean {
		return name in this.secrets;
	}

	getSecretNames(): string[] {
		return Object.keys(this.secrets);
	}
}

export class ErrorProvider extends SecretsProvider {
	secrets: Record<string, string> = {};

	displayName = 'Error Provider';

	name = 'dummy';

	state: SecretsProviderState = 'initializing';

	async init(_settings: SecretsProviderSettings<IDataObject>): Promise<void> {
		throw new Error();
	}

	async connect(): Promise<void> {
		this.state = 'error';
		throw new Error();
	}

	async disconnect(): Promise<void> {
		throw new Error();
	}

	async update(): Promise<void> {
		throw new Error();
	}

	async test(): Promise<[boolean] | [boolean, string]> {
		throw new Error();
	}

	getSecret(_name: string): IDataObject | undefined {
		throw new Error();
	}

	hasSecret(_name: string): boolean {
		throw new Error();
	}

	getSecretNames(): string[] {
		throw new Error();
	}
}

export class FailedProvider extends SecretsProvider {
	secrets: Record<string, string> = {};

	displayName = 'Failed Provider';

	name = 'dummy';

	state: SecretsProviderState = 'initializing';

	async init(_settings: SecretsProviderSettings<IDataObject>): Promise<void> {}

	async connect(): Promise<void> {
		this.state = 'error';
	}

	async disconnect(): Promise<void> {}

	async update(): Promise<void> {}

	async test(): Promise<[boolean] | [boolean, string]> {
		return [true];
	}

	getSecret(name: string): IDataObject | undefined {
		return this.secrets[name] as unknown as IDataObject | undefined;
	}

	hasSecret(name: string): boolean {
		return name in this.secrets;
	}

	getSecretNames(): string[] {
		return Object.keys(this.secrets);
	}
}

export class TestFailProvider extends SecretsProvider {
	secrets: Record<string, string> = {};

	displayName = 'Test Failed Provider';

	name = 'dummy';

	state: SecretsProviderState = 'initializing';

	_updateSecrets: Record<string, string> = {
		test1: 'value1',
		test2: 'value2',
	};

	async init(_settings: SecretsProviderSettings<IDataObject>): Promise<void> {}

	async connect(): Promise<void> {
		this.state = 'connected';
	}

	async disconnect(): Promise<void> {}

	async update(): Promise<void> {
		this.secrets = this._updateSecrets;
	}

	async test(): Promise<[boolean] | [boolean, string]> {
		return [false];
	}

	getSecret(name: string): IDataObject | undefined {
		return this.secrets[name] as unknown as IDataObject | undefined;
	}

	hasSecret(name: string): boolean {
		return name in this.secrets;
	}

	getSecretNames(): string[] {
		return Object.keys(this.secrets);
	}
}
