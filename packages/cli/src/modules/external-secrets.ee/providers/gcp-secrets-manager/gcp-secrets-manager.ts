import type { protos, SecretManagerServiceClient as GcpClient } from '@google-cloud/secret-manager';
import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { ensureError, jsonParse, UserError, type INodeProperties } from 'n8n-workflow';

import type {
	GcpSecretsManagerContext,
	GcpSecretAccountKey,
	RawGcpSecretAccountKey,
} from './types';
import { DOCS_HELP_NOTICE, EXTERNAL_SECRETS_NAME_REGEX } from '../../constants';
import { SecretsProvider } from '../../types';

export class GcpSecretsManager extends SecretsProvider {
	name = 'gcpSecretsManager';

	displayName = 'GCP Secrets Manager';

	properties: INodeProperties[] = [
		DOCS_HELP_NOTICE,
		{
			displayName: 'Service Account Key',
			name: 'serviceAccountKey',
			type: 'json',
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
		super();
		this.logger = this.logger.scoped('external-secrets');
	}

	async init(context: GcpSecretsManagerContext) {
		this.settings = this.parseSecretAccountKey(context.settings.serviceAccountKey);
	}

	protected async doConnect(): Promise<void> {
		const { projectId, privateKey, clientEmail } = this.settings;

		const { SecretManagerServiceClient: GcpClient } = await import('@google-cloud/secret-manager');

		this.client = new GcpClient({
			credentials: { client_email: clientEmail, private_key: privateKey },
			projectId,
		});

		this.logger.debug('GCP Secrets Manager provider connected');
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
			let versions:
				| [
						protos.google.cloud.secretmanager.v1.IAccessSecretVersionResponse,
						protos.google.cloud.secretmanager.v1.IAccessSecretVersionRequest | undefined,
						{} | undefined,
				  ]
				| undefined;

			try {
				versions = await this.client.accessSecretVersion({
					name: `projects/${projectId}/secrets/${name}/versions/latest`,
				});
			} catch (error) {
				// Only handle expected error codes that indicate the secret is not accessible
				// PERMISSION_DENIED (7), NOT_FOUND (5), UNAVAILABLE (14)
				const errorCode = error?.code;
				if (errorCode === 7 || errorCode === 5 || errorCode === 14) {
					this.logger.info(
						`Skipping GCP secret: ${name}, version: latest as the version is not accessible`,
						{
							error: ensureError(error),
						},
					);
				} else {
					// Rethrow unexpected errors to avoid masking broader failures
					throw error;
				}
			}

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

	private parseSecretAccountKey(serviceAccountKey: string): GcpSecretAccountKey {
		const secretAccountKey = jsonParse<RawGcpSecretAccountKey>(serviceAccountKey, {
			fallbackValue: {},
		});
		const clientEmail = secretAccountKey.client_email?.trim();
		const privateKey = secretAccountKey.private_key?.trim();
		const projectId = secretAccountKey.project_id?.trim();

		if (!clientEmail || !privateKey) {
			throw new UserError(
				'Service account key must contain "client_email" and "private_key" fields. Use the downloaded service account JSON key file from Google Cloud Console.',
			);
		}

		return {
			projectId: projectId ?? '',
			clientEmail,
			privateKey,
		};
	}
}
