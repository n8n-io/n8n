import type { OPConnect } from '@1password/connect';
import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { UserError, type IDataObject, type INodeProperties } from 'n8n-workflow';

import { DOCS_HELP_NOTICE } from '../constants';
import { SecretsProvider, type SecretsProviderSettings } from '../types';

export type OnePasswordContext = SecretsProviderSettings<{
	serverUrl: string;
	accessToken: string;
}>;

export class OnePasswordProvider extends SecretsProvider {
	name = 'onePassword';

	displayName = '1Password';

	properties: INodeProperties[] = [
		DOCS_HELP_NOTICE,
		{
			displayName: 'Connect Server URL',
			name: 'serverUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'e.g. http://localhost:8080',
			hint: 'URL of your <a href="https://developer.1password.com/docs/connect/get-started/" target="_blank">1Password Connect Server</a>.',
			noDataExpression: true,
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
			required: true,
			typeOptions: { password: true },
			placeholder: 'e.g. eyJhbGciOiJFUzI1NiIsImtpZCI6...',
			hint: 'Token created for your Connect Server integration.',
			noDataExpression: true,
		},
	];

	private cachedSecrets: Record<string, IDataObject> = {};

	private client: OPConnect;

	private settings: { serverUrl: string; accessToken: string };

	constructor(private readonly logger = Container.get(Logger)) {
		super();
		this.logger = this.logger.scoped('external-secrets');
	}

	async init(context: OnePasswordContext) {
		const trimmedServerUrl = context.settings.serverUrl?.trim();
		const trimmedAccessToken = context.settings.accessToken?.trim();

		if (!trimmedServerUrl) {
			throw new UserError('Connect Server URL is required.');
		}

		if (!trimmedAccessToken) {
			throw new UserError('Access Token is required.');
		}

		this.settings = {
			serverUrl: trimmedServerUrl,
			accessToken: trimmedAccessToken,
		};
	}

	protected async doConnect(): Promise<void> {
		const { OnePasswordConnect } = await import('@1password/connect');

		this.client = OnePasswordConnect({
			serverURL: this.settings.serverUrl,
			token: this.settings.accessToken,
			keepAlive: true,
		});

		const [wasSuccessful, errorMessage] = await this.test();

		if (!wasSuccessful) {
			throw new Error(errorMessage || 'Connection failed');
		}

		this.logger.debug('1Password provider connected');
	}

	async test(): Promise<[boolean] | [boolean, string]> {
		if (!this.client) return [false, 'Client not initialized'];

		try {
			await this.client.listVaults();
			return [true];
		} catch (error: unknown) {
			return [false, error instanceof Error ? error.message : 'Unknown error'];
		}
	}

	async disconnect() {
		// Stateless HTTP client — nothing to disconnect
	}

	async update() {
		const vaults = await this.client.listVaults();

		const secrets: Record<string, IDataObject> = {};

		for (const vault of vaults) {
			if (!vault.id) continue;

			const items = await this.client.listItems(vault.id);

			for (const item of items) {
				if (!item.id || !item.title) continue;

				const fullItem = await this.client.getItemById(vault.id, item.id);

				if (!fullItem.fields?.length) continue;

				const fieldValues: IDataObject = {};
				for (const field of fullItem.fields) {
					if (field.label && field.value) {
						fieldValues[field.label] = field.value;
					}
				}

				if (Object.keys(fieldValues).length === 0) continue;

				secrets[item.title] = fieldValues;
			}
		}

		this.cachedSecrets = secrets;

		this.logger.debug('1Password provider secrets updated');
	}

	getSecret(name: string): IDataObject {
		return this.cachedSecrets[name];
	}

	hasSecret(name: string) {
		return name in this.cachedSecrets;
	}

	getSecretNames() {
		return Object.keys(this.cachedSecrets);
	}
}
