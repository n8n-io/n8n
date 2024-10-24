import type { SecretManagerServiceClient as GcpClient } from '@google-cloud/secret-manager';
import { ensureError, jsonParse, type INodeProperties } from 'n8n-workflow';
import Container from 'typedi';

import { DOCS_HELP_NOTICE, EXTERNAL_SECRETS_NAME_REGEX } from '@/external-secrets/constants';
import type { SecretsProvider, SecretsProviderState } from '@/interfaces';
import { Logger } from '@/logging/logger.service';

import type {
	GcpSecretsManagerContext,
	GcpSecretAccountKey,
	RawGcpSecretAccountKey,
} from './types';

export class GcpSecretsManager implements SecretsProvider {
	name = 'gcpSecretsManager';

	displayName = 'GCP Secrets Manager';

	state: SecretsProviderState = 'initializing';

	properties: INodeProperties[] = [
		DOCS_HELP_NOTICE,
		{
			displayName: 'Service Account Key',
			name: 'serviceAccountKey',
			type: 'string',
			default: '',
			required: true,
			typeOptions: { password: true },
			placeholder: 'e.g. { "type": "service_account", "project_id": "gcp-secrets-store", ... }',
			hint: 'Content of JSON file downloaded from Google Cloud Console.',
			noDataExpression: true,
		},
	];

	private cachedSecrets: Record<string, string> = {};

	private client: GcpClient;

	private settings: GcpSecretAccountKey;

	constructor(private readonly logger = Container.get(Logger)) {
		this.logger = this.logger.scoped('external-secrets');
	}

	async init(context: GcpSecretsManagerContext) {
		this.settings = this.parseSecretAccountKey(context.settings.serviceAccountKey);
	}

	async connect() {
		const { projectId, privateKey, clientEmail } = this.settings;

		const { SecretManagerServiceClient: GcpClient } = await import('@google-cloud/secret-manager');

		try {
			this.client = new GcpClient({
				credentials: { client_email: clientEmail, private_key: privateKey },
				projectId,
			});
			this.state = 'connected';
			this.logger.debug('GCP Secrets Manager provider connected');
		} catch (error) {
			this.state = 'error';
			this.logger.debug('GCP Secrets Manager provider failed to connect', {
				error: ensureError(error),
			});
		}
	}

	async test(): Promise<[boolean] | [boolean, string]> {
		if (!this.client) return [false, 'Failed to connect to GCP Secrets Manager'];

		try {
			await this.client.initialize();
			return [true];
		} catch (error: unknown) {
			return [false, error instanceof Error ? error.message : 'Unknown error'];
		}
	}

	async disconnect() {
		// unused
	}

	async update() {
		const { projectId } = this.settings;

		const [rawSecretNames] = await this.client.listSecrets({
			parent: `projects/${projectId}`,
		});

		const secretNames = rawSecretNames.reduce<string[]>((acc, cur) => {
			if (!cur.name || !EXTERNAL_SECRETS_NAME_REGEX.test(cur.name)) return acc;

			const secretName = cur.name.split('/').pop();

			if (secretName) acc.push(secretName);

			return acc;
		}, []);

		const promises = secretNames.map(async (name) => {
			const versions = await this.client.accessSecretVersion({
				name: `projects/${projectId}/secrets/${name}/versions/latest`,
			});

			if (!Array.isArray(versions) || !versions.length) return null;

			const [latestVersion] = versions;

			if (!latestVersion.payload?.data) return null;

			const value = latestVersion.payload.data.toString();

			if (!value) return null;

			return { name, value };
		});

		const results = await Promise.all(promises);

		this.cachedSecrets = results.reduce<Record<string, string>>((acc, cur) => {
			if (cur) acc[cur.name] = cur.value;
			return acc;
		}, {});

		this.logger.debug('GCP Secrets Manager provider secrets updated');
	}

	getSecret(name: string) {
		return this.cachedSecrets[name];
	}

	hasSecret(name: string) {
		return name in this.cachedSecrets;
	}

	getSecretNames() {
		return Object.keys(this.cachedSecrets);
	}

	private parseSecretAccountKey(privateKey: string): GcpSecretAccountKey {
		const parsed = jsonParse<RawGcpSecretAccountKey>(privateKey, { fallbackValue: {} });

		return {
			projectId: parsed?.project_id ?? '',
			clientEmail: parsed?.client_email ?? '',
			privateKey: parsed?.private_key ?? '',
		};
	}
}
