import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import type { google } from '@google-cloud/secret-manager/build/protos/protos';
import type { Logger } from '@n8n/backend-common';
import { UserError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { GcpSecretsManager } from '../gcp-secrets-manager/gcp-secrets-manager';
import type { GcpSecretsManagerContext } from '../gcp-secrets-manager/types';

vi.mock('@google-cloud/secret-manager');

type GcpSecretVersionResponse = google.cloud.secretmanager.v1.IAccessSecretVersionResponse;

const VALID_SERVICE_ACCOUNT_KEY = (projectId: string) =>
	JSON.stringify({
		project_id: projectId,
		client_email: `test@${projectId}.iam.gserviceaccount.com`,
		private_key:
			'-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC\n-----END PRIVATE KEY-----',
	});

function createGrpcError(message: string, code: number): Error {
	return Object.assign(new Error(message), { code });
}

describe('GCP Secrets Manager', () => {
	const logger = mock<Logger>();
	let gcpSecretsManager: GcpSecretsManager;

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		gcpSecretsManager = new GcpSecretsManager(logger);
	});

	describe('error codes', () => {
		it('extracts numeric gRPC status codes', () => {
			expect(gcpSecretsManager['getGcpErrorCode'](createGrpcError('NOT_FOUND', 5))).toBe(5);
			expect(gcpSecretsManager['getGcpErrorCode'](createGrpcError('PERMISSION_DENIED', 7))).toBe(7);
		});

		it('extracts string error codes', () => {
			const error = Object.assign(new Error('Connection failed'), { code: 'ECONNREFUSED' });

			expect(gcpSecretsManager['getGcpErrorCode'](error)).toBe('ECONNREFUSED');
		});

		it('returns undefined for generic errors without a code', () => {
			expect(
				gcpSecretsManager['getGcpErrorCode'](new Error('Something went wrong')),
			).toBeUndefined();
		});

		it('returns undefined for non-error values', () => {
			expect(gcpSecretsManager['getGcpErrorCode']('not an error')).toBeUndefined();
			expect(gcpSecretsManager['getGcpErrorCode'](null)).toBeUndefined();
		});
	});

	describe('init validation', () => {
		it('should throw UserError when service account key is empty', async () => {
			const settings = { serviceAccountKey: '' };
			await expect(
				gcpSecretsManager.init(mock<GcpSecretsManagerContext>({ settings })),
			).rejects.toThrow(UserError);
		});

		it('should throw UserError when service account key is all whitespace', async () => {
			const settings = { serviceAccountKey: '   ' };
			await expect(
				gcpSecretsManager.init(mock<GcpSecretsManagerContext>({ settings })),
			).rejects.toThrow(UserError);
		});

		it('should throw UserError when service account key is not valid JSON', async () => {
			const settings = { serviceAccountKey: 'plain text' };
			await expect(
				gcpSecretsManager.init(mock<GcpSecretsManagerContext>({ settings })),
			).rejects.toThrow(UserError);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to initialize GCP Secrets Manager provider',
				expect.objectContaining({
					providerName: 'gcpSecretsManager',
					providerDisplayName: 'GCP Secrets Manager',
					operation: 'initialize',
					errorName: expect.any(String),
				}),
			);
		});

		it('should throw UserError when JSON lacks client_email', async () => {
			const settings = { serviceAccountKey: JSON.stringify({ project_id: 'proj' }) };
			await expect(
				gcpSecretsManager.init(
					mock<GcpSecretsManagerContext>({
						settings,
					}),
				),
			).rejects.toThrow(UserError);
		});

		it('should throw UserError when JSON lacks private_key', async () => {
			const settings = {
				serviceAccountKey: JSON.stringify({
					project_id: 'proj',
					client_email: 'test@proj.iam.gserviceaccount.com',
				}),
			};
			await expect(
				gcpSecretsManager.init(
					mock<GcpSecretsManagerContext>({
						settings,
					}),
				),
			).rejects.toThrow(UserError);
		});
	});

	it('should log failed client setup while preserving error state', async () => {
		const PROJECT_ID = 'my-project-id';

		await gcpSecretsManager.init(
			mock<GcpSecretsManagerContext>({
				settings: { serviceAccountKey: VALID_SERVICE_ACCOUNT_KEY(PROJECT_ID) },
			}),
		);

		const setupError = new Error('Invalid configuration');
		const SecretManagerServiceClientMock = SecretManagerServiceClient as unknown as Mock;
		SecretManagerServiceClientMock.mockImplementationOnce(() => {
			throw setupError;
		});

		await gcpSecretsManager.connect();

		expect(gcpSecretsManager.state).toBe('error');
		expect(logger.warn).toHaveBeenCalledWith(
			'Failed to connect GCP Secrets Manager provider',
			expect.objectContaining({
				providerName: 'gcpSecretsManager',
				providerDisplayName: 'GCP Secrets Manager',
				operation: 'connect',
				projectId: PROJECT_ID,
				errorName: expect.any(String),
			}),
		);
	});

	it('should update cached secrets', async () => {
		/**
		 * Arrange
		 */
		const PROJECT_ID = 'my-project-id';

		const SECRETS: Record<string, string> = {
			secret1: 'value1',
			secret2: 'value2',
			secret3: '', // no value
		};

		await gcpSecretsManager.init(
			mock<GcpSecretsManagerContext>({
				settings: { serviceAccountKey: VALID_SERVICE_ACCOUNT_KEY(PROJECT_ID) },
			}),
		);

		const listSpy = vi
			.spyOn(SecretManagerServiceClient.prototype, 'listSecrets')
			// @ts-expect-error Partial mock
			.mockResolvedValue([
				[
					{ name: `projects/${PROJECT_ID}/secrets/secret1` },
					{ name: `projects/${PROJECT_ID}/secrets/secret2` },
					{ name: `projects/${PROJECT_ID}/secrets/secret3` },
				],
			]);

		const getSpy = vi
			.spyOn(SecretManagerServiceClient.prototype, 'accessSecretVersion')
			.mockImplementation(async ({ name }: { name: string }) => {
				const secretName = name.split('/')[3];
				return [
					{ payload: { data: Buffer.from(SECRETS[secretName]) } },
				] as GcpSecretVersionResponse[];
			});

		/**
		 * Act
		 */
		await gcpSecretsManager.connect();
		await gcpSecretsManager.update();

		/**
		 * Assert
		 */
		expect(listSpy).toHaveBeenCalled();

		expect(getSpy).toHaveBeenCalledWith({
			name: `projects/${PROJECT_ID}/secrets/secret1/versions/latest`,
		});
		expect(getSpy).toHaveBeenCalledWith({
			name: `projects/${PROJECT_ID}/secrets/secret2/versions/latest`,
		});
		expect(getSpy).toHaveBeenCalledWith({
			name: `projects/${PROJECT_ID}/secrets/secret3/versions/latest`,
		});

		expect(gcpSecretsManager.getSecret('secret1')).toBe('value1');
		expect(gcpSecretsManager.getSecret('secret2')).toBe('value2');
		expect(gcpSecretsManager.getSecret('secret3')).toBeUndefined(); // no value
	});

	it('should log failed connection tests while preserving the result', async () => {
		const PROJECT_ID = 'my-project-id';

		await gcpSecretsManager.init(
			mock<GcpSecretsManagerContext>({
				settings: { serviceAccountKey: VALID_SERVICE_ACCOUNT_KEY(PROJECT_ID) },
			}),
		);
		await gcpSecretsManager.connect();

		vi.spyOn(SecretManagerServiceClient.prototype, 'initialize').mockRejectedValue(
			new Error('Invalid credentials'),
		);

		await expect(gcpSecretsManager.test()).resolves.toEqual([false, 'Invalid credentials']);
		expect(logger.warn).toHaveBeenCalledWith(
			'GCP Secrets Manager provider test failed',
			expect.objectContaining({
				providerName: 'gcpSecretsManager',
				providerDisplayName: 'GCP Secrets Manager',
				operation: 'test',
				errorName: 'Error',
				projectId: PROJECT_ID,
			}),
		);
	});

	it('should throw a generic error when accessing secret versions', async () => {
		/**
		 * Arrange
		 */
		const PROJECT_ID = 'my-project-id';

		const SECRETS: Record<string, string> = {
			secret1: 'value1',
			secret2: 'value2',
			secret3: '', // no value
		};

		await gcpSecretsManager.init(
			mock<GcpSecretsManagerContext>({
				settings: { serviceAccountKey: VALID_SERVICE_ACCOUNT_KEY(PROJECT_ID) },
			}),
		);

		vi.spyOn(SecretManagerServiceClient.prototype, 'listSecrets')
			// @ts-expect-error Partial mock
			.mockResolvedValue([
				[
					{ name: `projects/${PROJECT_ID}/secrets/secret1` },
					{ name: `projects/${PROJECT_ID}/secrets/secret2` },
					{ name: `projects/${PROJECT_ID}/secrets/secret3` },
				],
			]);

		vi.spyOn(SecretManagerServiceClient.prototype, 'accessSecretVersion')
			.mockImplementationOnce(() => {
				throw new Error('test error');
			})
			.mockImplementation(async ({ name }: { name: string }) => {
				const secretName = name.split('/')[3];
				return [
					{ payload: { data: Buffer.from(SECRETS[secretName]) } },
				] as GcpSecretVersionResponse[];
			});

		await gcpSecretsManager.connect();

		await expect(gcpSecretsManager.update()).rejects.toThrow('test error');
		expect(logger.warn).toHaveBeenCalledWith(
			'Failed to update GCP Secrets Manager provider secrets',
			expect.objectContaining({
				providerName: 'gcpSecretsManager',
				providerDisplayName: 'GCP Secrets Manager',
				operation: 'update',
				errorName: 'Error',
				projectId: PROJECT_ID,
			}),
		);
	});

	it('should handle errors when accessing secret versions (NOT_FOUND)', async () => {
		/**
		 * Arrange
		 */
		const PROJECT_ID = 'my-project-id';

		const SECRETS: Record<string, string> = {
			secret1: 'value1',
			secret2: 'value2',
			secret3: '', // no value
		};

		await gcpSecretsManager.init(
			mock<GcpSecretsManagerContext>({
				settings: { serviceAccountKey: VALID_SERVICE_ACCOUNT_KEY(PROJECT_ID) },
			}),
		);

		const listSpy = vi
			.spyOn(SecretManagerServiceClient.prototype, 'listSecrets')
			// @ts-expect-error Partial mock
			.mockResolvedValue([
				[
					{ name: `projects/${PROJECT_ID}/secrets/secret1` },
					{ name: `projects/${PROJECT_ID}/secrets/secret2` },
					{ name: `projects/${PROJECT_ID}/secrets/secret3` },
				],
			]);

		const getSpy = vi
			.spyOn(SecretManagerServiceClient.prototype, 'accessSecretVersion')
			.mockImplementationOnce(() => {
				const error = new Error('NOT_FOUND') as any;
				error.code = 5;
				throw error;
			})
			.mockImplementation(async ({ name }: { name: string }) => {
				const secretName = name.split('/')[3];
				return [
					{ payload: { data: Buffer.from(SECRETS[secretName]) } },
				] as GcpSecretVersionResponse[];
			});

		/**
		 * Act
		 */
		await gcpSecretsManager.connect();
		await gcpSecretsManager.update();

		/**
		 * Assert
		 */
		expect(listSpy).toHaveBeenCalled();
		expect(getSpy).toHaveBeenCalledWith({
			name: `projects/${PROJECT_ID}/secrets/secret1/versions/latest`,
		});
		expect(getSpy).toHaveBeenCalledWith({
			name: `projects/${PROJECT_ID}/secrets/secret2/versions/latest`,
		});
		expect(getSpy).toHaveBeenCalledWith({
			name: `projects/${PROJECT_ID}/secrets/secret3/versions/latest`,
		});

		expect(gcpSecretsManager.getSecret('secret1')).toBeUndefined(); // error case
		expect(gcpSecretsManager.getSecret('secret2')).toBe('value2');
		expect(gcpSecretsManager.getSecret('secret3')).toBeUndefined(); // no value
		expect(logger.debug).toHaveBeenCalledWith(
			'Skipping inaccessible GCP secret version',
			expect.objectContaining({
				providerName: 'gcpSecretsManager',
				operation: 'update',
				secretName: 'secret1',
				errorCode: 5,
				projectId: PROJECT_ID,
			}),
		);
		expect(logger.warn).toHaveBeenCalledWith(
			'Skipped inaccessible GCP secret versions during update',
			expect.objectContaining({
				providerName: 'gcpSecretsManager',
				operation: 'update',
				projectId: PROJECT_ID,
				failedCount: 1,
				sampleSecretNames: ['secret1'],
			}),
		);
	});

	it('should handle errors when accessing secret versions (PERMISSION_DENIED)', async () => {
		/**
		 * Arrange
		 */
		const PROJECT_ID = 'my-project-id';

		const SECRETS: Record<string, string> = {
			secret1: 'value1',
			secret2: 'value2',
			secret3: '', // no value
		};

		await gcpSecretsManager.init(
			mock<GcpSecretsManagerContext>({
				settings: { serviceAccountKey: VALID_SERVICE_ACCOUNT_KEY(PROJECT_ID) },
			}),
		);

		const listSpy = vi
			.spyOn(SecretManagerServiceClient.prototype, 'listSecrets')
			// @ts-expect-error Partial mock
			.mockResolvedValue([
				[
					{ name: `projects/${PROJECT_ID}/secrets/secret1` },
					{ name: `projects/${PROJECT_ID}/secrets/secret2` },
					{ name: `projects/${PROJECT_ID}/secrets/secret3` },
				],
			]);

		const getSpy = vi
			.spyOn(SecretManagerServiceClient.prototype, 'accessSecretVersion')
			.mockImplementationOnce(() => {
				const error = new Error('PERMISSION_DENIED') as any;
				error.code = 7;
				throw error;
			})
			.mockImplementation(async ({ name }: { name: string }) => {
				const secretName = name.split('/')[3];
				return [
					{ payload: { data: Buffer.from(SECRETS[secretName]) } },
				] as GcpSecretVersionResponse[];
			});

		/**
		 * Act
		 */
		await gcpSecretsManager.connect();
		await gcpSecretsManager.update();

		/**
		 * Assert
		 */
		expect(listSpy).toHaveBeenCalled();
		expect(getSpy).toHaveBeenCalledWith({
			name: `projects/${PROJECT_ID}/secrets/secret1/versions/latest`,
		});
		expect(getSpy).toHaveBeenCalledWith({
			name: `projects/${PROJECT_ID}/secrets/secret2/versions/latest`,
		});
		expect(getSpy).toHaveBeenCalledWith({
			name: `projects/${PROJECT_ID}/secrets/secret3/versions/latest`,
		});

		expect(gcpSecretsManager.getSecret('secret1')).toBeUndefined(); // error case
		expect(gcpSecretsManager.getSecret('secret2')).toBe('value2');
		expect(gcpSecretsManager.getSecret('secret3')).toBeUndefined(); // no value
		expect(logger.debug).toHaveBeenCalledWith(
			'Skipping inaccessible GCP secret version',
			expect.objectContaining({
				providerName: 'gcpSecretsManager',
				operation: 'update',
				secretName: 'secret1',
				errorCode: 7,
				projectId: PROJECT_ID,
			}),
		);
		expect(logger.warn).toHaveBeenCalledWith(
			'Skipped inaccessible GCP secret versions during update',
			expect.objectContaining({
				providerName: 'gcpSecretsManager',
				operation: 'update',
				projectId: PROJECT_ID,
				failedCount: 1,
				sampleSecretNames: ['secret1'],
			}),
		);
	});

	it('should handle errors when accessing secret versions (UNAVAILABLE)', async () => {
		/**
		 * Arrange
		 */
		const PROJECT_ID = 'my-project-id';

		const SECRETS: Record<string, string> = {
			secret1: 'value1',
			secret2: 'value2',
			secret3: '', // no value
		};

		await gcpSecretsManager.init(
			mock<GcpSecretsManagerContext>({
				settings: { serviceAccountKey: VALID_SERVICE_ACCOUNT_KEY(PROJECT_ID) },
			}),
		);

		const listSpy = vi
			.spyOn(SecretManagerServiceClient.prototype, 'listSecrets')
			// @ts-expect-error Partial mock
			.mockResolvedValue([
				[
					{ name: `projects/${PROJECT_ID}/secrets/secret1` },
					{ name: `projects/${PROJECT_ID}/secrets/secret2` },
					{ name: `projects/${PROJECT_ID}/secrets/secret3` },
				],
			]);

		const getSpy = vi
			.spyOn(SecretManagerServiceClient.prototype, 'accessSecretVersion')
			.mockImplementationOnce(() => {
				const error = new Error('PERMISSION_DENIED') as any;
				error.code = 14;
				throw error;
			})
			.mockImplementation(async ({ name }: { name: string }) => {
				const secretName = name.split('/')[3];
				return [
					{ payload: { data: Buffer.from(SECRETS[secretName]) } },
				] as GcpSecretVersionResponse[];
			});

		/**
		 * Act
		 */
		await gcpSecretsManager.connect();
		await gcpSecretsManager.update();

		/**
		 * Assert
		 */
		expect(listSpy).toHaveBeenCalled();
		expect(getSpy).toHaveBeenCalledWith({
			name: `projects/${PROJECT_ID}/secrets/secret1/versions/latest`,
		});
		expect(getSpy).toHaveBeenCalledWith({
			name: `projects/${PROJECT_ID}/secrets/secret2/versions/latest`,
		});
		expect(getSpy).toHaveBeenCalledWith({
			name: `projects/${PROJECT_ID}/secrets/secret3/versions/latest`,
		});

		expect(gcpSecretsManager.getSecret('secret1')).toBeUndefined(); // error case
		expect(gcpSecretsManager.getSecret('secret2')).toBe('value2');
		expect(gcpSecretsManager.getSecret('secret3')).toBeUndefined(); // no value
		expect(logger.debug).toHaveBeenCalledWith(
			'Skipping inaccessible GCP secret version',
			expect.objectContaining({
				providerName: 'gcpSecretsManager',
				operation: 'update',
				secretName: 'secret1',
				errorCode: 14,
				projectId: PROJECT_ID,
			}),
		);
		expect(logger.warn).toHaveBeenCalledWith(
			'Skipped inaccessible GCP secret versions during update',
			expect.objectContaining({
				providerName: 'gcpSecretsManager',
				operation: 'update',
				projectId: PROJECT_ID,
				failedCount: 1,
				sampleSecretNames: ['secret1'],
			}),
		);
	});
});
