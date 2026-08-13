import type { protos, SecretManagerServiceClient as GcpClient } from '@google-cloud/secret-manager';
import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { jsonParse, UserError, type INodeProperties } from 'n8n-workflow';

import type {
	GcpSecretsManagerContext,
	GcpSecretsManagerSettings,
	GcpSecretAccountKey,
	RawGcpSecretAccountKey,
} from './types';
import { DOCS_HELP_NOTICE } from '../../constants';
import {
	buildFailureSummaryLogContext,
	type LogContext,
	logSecretsProviderOperationFailure,
	type SafeContextValue,
	type SecretsProviderOperationFailureParams,
} from '../../errors/secrets-provider-errors';
import { SecretsProvider } from '../../types';

const CLOUD_PLATFORM_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

export class GcpSecretsManager extends SecretsProvider {
	name = 'gcpSecretsManager';

	displayName = 'GCP Secrets Manager';

	properties: INodeProperties[] = [
		DOCS_HELP_NOTICE,
		{
			displayName: 'Use application default credentials',
			name: 'useApplicationDefaultCredentials',
			type: 'boolean',
			default: false,
			description: "Use credentials detected automatically from n8n's runtime environment",
			noDataExpression: true,
		},
		{
			displayName: 'Service account key',
			name: 'serviceAccountKey',
			type: 'json',
			default: '',
			required: true,
			typeOptions: { password: true },
			placeholder: 'e.g. { "type": "service_account", "project_id": "gcp-secrets-store", ... }',
			hint: 'Content of JSON file downloaded from Google Cloud Console.',
			noDataExpression: true,
			displayOptions: {
				hide: {
					useApplicationDefaultCredentials: [true],
				},
			},
		},
		{
			displayName: 'Impersonate service account',
			name: 'impersonateServiceAccount',
			type: 'string',
			default: '',
			placeholder: 'n8n-secrets@my-project.iam.gserviceaccount.com',
			hint: 'Optional. The authenticated identity needs the <a href="https://cloud.google.com/iam/docs/service-account-impersonation" target="_blank">Service Account Token Creator</a> role on this account.',
			noDataExpression: true,
		},
		{
			displayName: 'Project ID',
			name: 'projectId',
			type: 'string',
			default: '',
			placeholder: 'my-gcp-project',
			hint: 'Optional. Overrides the project ID from credentials or automatic detection.',
			noDataExpression: true,
		},
		{
			displayName: 'Secret filter',
			name: 'secretFilter',
			type: 'string',
			default: '',
			placeholder: 'labels.n8n-vault=finance',
			hint: 'Use <a href="https://cloud.google.com/secret-manager/docs/filtering" target="_blank">Google Cloud Secret Manager filter syntax</a>, such as <code>labels.n8n-vault=finance</code>. n8n imports only matching secrets. IAM permissions still apply.',
			noDataExpression: true,
		},
	];

	private cachedSecrets: Record<string, string> = {};

	private client: GcpClient;

	private settings: GcpSecretsManagerSettings;

	constructor(private readonly logger = Container.get(Logger)) {
		super();
		this.logger = this.logger.scoped('external-secrets');
	}

	async init(context: GcpSecretsManagerContext) {
		try {
			const useApplicationDefaultCredentials =
				context.settings.useApplicationDefaultCredentials === true;
			const configuredProjectId = context.settings.projectId?.trim() || undefined;
			const secretFilter = context.settings.secretFilter?.trim() || undefined;
			const impersonateServiceAccount =
				context.settings.impersonateServiceAccount?.trim() || undefined;

			if (useApplicationDefaultCredentials) {
				this.settings = {
					useApplicationDefaultCredentials,
					projectId: configuredProjectId,
					secretFilter,
					impersonateServiceAccount,
				};
			} else {
				const serviceAccountKey = this.parseSecretAccountKey(
					context.settings.serviceAccountKey ?? '',
				);
				this.settings = {
					useApplicationDefaultCredentials,
					...serviceAccountKey,
					projectId: configuredProjectId ?? serviceAccountKey.projectId,
					secretFilter,
					impersonateServiceAccount,
				};
			}
		} catch (error) {
			this.logOperationFailure('Failed to initialize GCP Secrets Manager provider', {
				operation: 'initialize',
				error,
			});
			throw error;
		}
	}

	protected async doConnect(): Promise<void> {
		try {
			// TODO: gRPC bypasses @n8n/backend-network, so the configured proxy and SSRF/DNS rules are not enforced here.
			// Route through it once it supports a gRPC transport.
			this.client = await this.createClient();
			await this.resolveProjectId();

			this.logger.debug('GCP Secrets Manager provider connected');
		} catch (error) {
			this.logOperationFailure('Failed to connect GCP Secrets Manager provider', {
				operation: 'connect',
				error,
			});
			throw error;
		}
	}

	async test(): Promise<[boolean] | [boolean, string]> {
		if (!this.client) return [false, 'Failed to connect to GCP Secrets Manager'];

		try {
			await this.client.listSecrets(this.createListSecretsRequest(1), { autoPaginate: false });
			return [true];
		} catch (error: unknown) {
			this.logOperationFailure('GCP Secrets Manager provider test failed', {
				operation: 'test',
				error,
			});
			return [false, error instanceof Error ? error.message : 'Unknown error'];
		}
	}

	async disconnect() {
		// unused
	}

	async update() {
		try {
			const projectId = this.getProjectId();

			const [rawSecretNames] = await this.client.listSecrets(this.createListSecretsRequest());

			const secretNames = rawSecretNames.reduce<string[]>((acc, cur) => {
				if (!cur.name) return acc;

				const secretName = cur.name.split('/').pop();

				if (secretName) acc.push(secretName);

				return acc;
			}, []);

			const skippedSecrets: Array<{ name: string; errorCode: SafeContextValue }> = [];
			let firstSkippedError: unknown;

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
					const errorCode = this.getGcpErrorCode(error);
					if (errorCode === 7 || errorCode === 5 || errorCode === 14) {
						if (firstSkippedError === undefined) {
							firstSkippedError = error;
						}
						this.logger.debug('Skipping inaccessible GCP secret version', {
							providerName: this.name,
							operation: 'update',
							projectId,
							secretName: name,
							errorCode,
						});
						skippedSecrets.push({
							name,
							errorCode: errorCode ?? 'unknown',
						});
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

			const failureSummary = buildFailureSummaryLogContext(skippedSecrets);
			if (failureSummary) {
				this.logOperationFailure('Skipped inaccessible GCP secret versions during update', {
					operation: 'update',
					error:
						firstSkippedError instanceof Error
							? firstSkippedError
							: new Error('One or more GCP secret versions were inaccessible'),
					context: failureSummary,
				});
			}

			this.logger.debug('GCP Secrets Manager provider secrets updated');
		} catch (error) {
			this.logOperationFailure('Failed to update GCP Secrets Manager provider secrets', {
				operation: 'update',
				error,
			});
			throw error;
		}
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

	private createListSecretsRequest(
		pageSize?: number,
	): protos.google.cloud.secretmanager.v1.IListSecretsRequest {
		const request: protos.google.cloud.secretmanager.v1.IListSecretsRequest = {
			parent: `projects/${this.getProjectId()}`,
		};

		if (this.settings.secretFilter) request.filter = this.settings.secretFilter;
		if (pageSize !== undefined) request.pageSize = pageSize;

		return request;
	}

	private async resolveProjectId(): Promise<void> {
		if (this.settings.projectId) return;

		const projectId = (await this.client.auth.getProjectId())?.trim();
		if (!projectId) {
			throw new UserError(
				'Could not determine the Google Cloud project ID. Enter a Project ID and try again.',
			);
		}

		this.settings.projectId = projectId;
	}

	private getProjectId(): string {
		if (!this.settings.projectId) {
			throw new UserError(
				'Could not determine the Google Cloud project ID. Enter a Project ID and try again.',
			);
		}

		return this.settings.projectId;
	}

	private async createClient() {
		const [{ SecretManagerServiceClient: GcpClient }, { GoogleAuth, Impersonated }] =
			await Promise.all([import('@google-cloud/secret-manager'), import('google-auth-library')]);

		const projectId = this.settings.projectId;
		const scopes = [CLOUD_PLATFORM_SCOPE];
		const sourceAuth =
			this.settings.useApplicationDefaultCredentials
				? new GoogleAuth()
				: new GoogleAuth({
						credentials: {
							client_email: this.settings.clientEmail,
							private_key: this.settings.privateKey,
						},
					});

		// SecretManagerServiceClient sets these defaults on its GoogleAuth wrapper after
		// construction, so apply them before resolving and injecting authClient.
		sourceAuth.defaultScopes = scopes;
		sourceAuth.defaultServicePath = 'secretmanager.googleapis.com';

		let authClient = await sourceAuth.getClient();
		if (this.settings.impersonateServiceAccount) {
			authClient = new Impersonated({
				sourceClient: authClient,
				targetPrincipal: this.settings.impersonateServiceAccount,
				targetScopes: scopes,
			});
		}

		return new GcpClient({
			authClient,
			...(projectId ? { projectId } : {}),
		});
	}

	private parseSecretAccountKey(serviceAccountKey: string): GcpSecretAccountKey {
		const secretAccountKey = jsonParse<RawGcpSecretAccountKey>(serviceAccountKey, {
			fallbackValue: {},
		});
		const clientEmail = secretAccountKey.client_email?.trim();
		const privateKey = secretAccountKey.private_key?.trim();
		const projectId = secretAccountKey.project_id?.trim();

		if (!clientEmail || !privateKey) {
			this.logger.warn(
				'Service account key must contain "client_email" and "private_key" fields. Use the downloaded service account JSON key file from Google Cloud Console.',
			);
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

	private getGcpErrorCode(error: unknown): number | string | undefined {
		if (typeof error === 'object' && error !== null && 'code' in error) {
			const { code } = error;
			if (typeof code === 'number' || typeof code === 'string') {
				return code;
			}
		}

		return undefined;
	}

	private logOperationFailure(
		message: string,
		params: SecretsProviderOperationFailureParams,
	): void {
		const context: LogContext = { ...params.context };
		const errorCode = this.getGcpErrorCode(params.error);
		if (errorCode !== undefined) {
			context.errorCode = errorCode;
		}
		if (this.settings?.projectId) {
			context.projectId = this.settings.projectId;
		}

		logSecretsProviderOperationFailure({
			logger: this.logger,
			message,
			providerName: this.name,
			providerDisplayName: this.displayName,
			operation: params.operation,
			error: params.error,
			context,
		});
	}
}
