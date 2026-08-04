import type { IDataObject, INodeProperties } from 'n8n-workflow';

import { ExternalSecretsProviders } from '@/modules/external-secrets.ee/external-secrets-providers.ee';
import { SecretsProvider } from '@/modules/external-secrets.ee/types';
import type { SecretsProviderSettings } from '@/modules/external-secrets.ee/types';

export class MockProviders extends ExternalSecretsProviders {
	override providers: Record<string, { new (): SecretsProvider }> = {
		dummy: DummyProvider,
	};

	setProviders(providers: Record<string, { new (): SecretsProvider }>) {
		this.providers = providers;
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

	_updateSecrets: Record<string, string> = {
		test1: 'value1',
		test2: 'value2',
	};

	async init(_settings: SecretsProviderSettings<IDataObject>): Promise<void> {}

	protected async doConnect(): Promise<void> {
		// Connected successfully - base class will set state
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

export class AnotherDummyProvider extends SecretsProvider {
	properties: INodeProperties[] = [
		{
			name: 'username',
			displayName: 'Username',
			type: 'string',
			default: '',
			required: true,
		},
	];

	secrets: Record<string, string> = {};

	displayName = 'Another Dummy Provider';

	name = 'another_dummy';

	_updateSecrets: Record<string, string> = {
		test1: 'value1',
		test2: 'value2',
	};

	async init(_settings: SecretsProviderSettings<IDataObject>): Promise<void> {}

	protected async doConnect(): Promise<void> {
		// Connected successfully - base class will set state
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

	properties = [];

	async init(_settings: SecretsProviderSettings<IDataObject>): Promise<void> {
		throw new Error();
	}

	protected async doConnect(): Promise<void> {
		throw new Error('Connection failed');
	}

	async disconnect(): Promise<void> {
		// no-op
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

	properties = [];

	async init(_settings: SecretsProviderSettings<IDataObject>): Promise<void> {}

	protected async doConnect(): Promise<void> {
		throw new Error('Failed to connect');
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

	properties = [];

	_updateSecrets: Record<string, string> = {
		test1: 'value1',
		test2: 'value2',
	};

	async init(_settings: SecretsProviderSettings<IDataObject>): Promise<void> {}

	protected async doConnect(): Promise<void> {
		// Connected successfully - base class will set state
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

export function createDummyProvider({
	name,
	secrets,
	displayName,
	properties,
}: {
	name: string;
	displayName?: string;
	secrets?: Record<string, string>;
	properties?: INodeProperties[];
}): { new (): SecretsProvider } {
	const defaultSecrets = secrets ?? {
		test1: 'value1',
		test2: 'value2',
	};

	class FreshProvider extends SecretsProvider {
		name = name;
		displayName = displayName ?? name;

		properties: INodeProperties[] = properties ?? [
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

		secrets: Record<string, string> = { ...defaultSecrets };

		_updateSecrets: Record<string, string> = { ...defaultSecrets };

		async init(_settings: SecretsProviderSettings<IDataObject>): Promise<void> {}

		protected async doConnect(): Promise<void> {
			// Connected successfully - base class will set state
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
	return FreshProvider;
}
