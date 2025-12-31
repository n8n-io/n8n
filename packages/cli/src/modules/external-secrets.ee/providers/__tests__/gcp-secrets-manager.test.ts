import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import type { google } from '@google-cloud/secret-manager/build/protos/protos';
import { mock } from 'jest-mock-extended';

import { GcpSecretsManager } from '../gcp-secrets-manager/gcp-secrets-manager';
import type { GcpSecretsManagerContext } from '../gcp-secrets-manager/types';

jest.mock('@google-cloud/secret-manager');

type GcpSecretVersionResponse = google.cloud.secretmanager.v1.IAccessSecretVersionResponse;

describe('GCP Secrets Manager', () => {
	const gcpSecretsManager = new GcpSecretsManager();

	afterEach(() => {
		jest.clearAllMocks();
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
			'#@&': 'value', // unsupported name
		};

		await gcpSecretsManager.init(
			mock<GcpSecretsManagerContext>({
				settings: { serviceAccountKey: `{ "project_id": "${PROJECT_ID}" }` },
			}),
		);

		const listSpy = jest
			.spyOn(SecretManagerServiceClient.prototype, 'listSecrets')
			// @ts-expect-error Partial mock
			.mockResolvedValue([
				[
					{ name: `projects/${PROJECT_ID}/secrets/secret1` },
					{ name: `projects/${PROJECT_ID}/secrets/secret2` },
					{ name: `projects/${PROJECT_ID}/secrets/secret3` },
					{ name: `projects/${PROJECT_ID}/secrets/#@&` },
				],
			]);

		const getSpy = jest
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
		expect(getSpy).not.toHaveBeenCalledWith({
			name: `projects/${PROJECT_ID}/secrets/#@&/versions/latest`,
		});

		expect(gcpSecretsManager.getSecret('secret1')).toBe('value1');
		expect(gcpSecretsManager.getSecret('secret2')).toBe('value2');
		expect(gcpSecretsManager.getSecret('secret3')).toBeUndefined(); // no value
		expect(gcpSecretsManager.getSecret('#@&')).toBeUndefined(); // unsupported name
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
			'#@&': 'value', // unsupported name
		};

		await gcpSecretsManager.init(
			mock<GcpSecretsManagerContext>({
				settings: { serviceAccountKey: `{ "project_id": "${PROJECT_ID}" }` },
			}),
		);

		jest
			.spyOn(SecretManagerServiceClient.prototype, 'listSecrets')
			// @ts-expect-error Partial mock
			.mockResolvedValue([
				[
					{ name: `projects/${PROJECT_ID}/secrets/secret1` },
					{ name: `projects/${PROJECT_ID}/secrets/secret2` },
					{ name: `projects/${PROJECT_ID}/secrets/secret3` },
					{ name: `projects/${PROJECT_ID}/secrets/#@&` },
				],
			]);

		jest
			.spyOn(SecretManagerServiceClient.prototype, 'accessSecretVersion')
			.mockImplementationOnce(() => {
				throw new Error('test error');
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
		try {
			await gcpSecretsManager.connect();
			await gcpSecretsManager.update();
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			expect(error.message).toBe('test error');
		}
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
			'#@&': 'value', // unsupported name
		};

		await gcpSecretsManager.init(
			mock<GcpSecretsManagerContext>({
				settings: { serviceAccountKey: `{ "project_id": "${PROJECT_ID}" }` },
			}),
		);

		const listSpy = jest
			.spyOn(SecretManagerServiceClient.prototype, 'listSecrets')
			// @ts-expect-error Partial mock
			.mockResolvedValue([
				[
					{ name: `projects/${PROJECT_ID}/secrets/secret1` },
					{ name: `projects/${PROJECT_ID}/secrets/secret2` },
					{ name: `projects/${PROJECT_ID}/secrets/secret3` },
					{ name: `projects/${PROJECT_ID}/secrets/#@&` },
				],
			]);

		const getSpy = jest
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
		expect(getSpy).not.toHaveBeenCalledWith({
			name: `projects/${PROJECT_ID}/secrets/#@&/versions/latest`,
		});

		expect(gcpSecretsManager.getSecret('secret1')).toBeUndefined(); // error case
		expect(gcpSecretsManager.getSecret('secret2')).toBe('value2');
		expect(gcpSecretsManager.getSecret('secret3')).toBeUndefined(); // no value
		expect(gcpSecretsManager.getSecret('#@&')).toBeUndefined(); // unsupported name
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
			'#@&': 'value', // unsupported name
		};

		await gcpSecretsManager.init(
			mock<GcpSecretsManagerContext>({
				settings: { serviceAccountKey: `{ "project_id": "${PROJECT_ID}" }` },
			}),
		);

		const listSpy = jest
			.spyOn(SecretManagerServiceClient.prototype, 'listSecrets')
			// @ts-expect-error Partial mock
			.mockResolvedValue([
				[
					{ name: `projects/${PROJECT_ID}/secrets/secret1` },
					{ name: `projects/${PROJECT_ID}/secrets/secret2` },
					{ name: `projects/${PROJECT_ID}/secrets/secret3` },
					{ name: `projects/${PROJECT_ID}/secrets/#@&` },
				],
			]);

		const getSpy = jest
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
		expect(getSpy).not.toHaveBeenCalledWith({
			name: `projects/${PROJECT_ID}/secrets/#@&/versions/latest`,
		});

		expect(gcpSecretsManager.getSecret('secret1')).toBeUndefined(); // error case
		expect(gcpSecretsManager.getSecret('secret2')).toBe('value2');
		expect(gcpSecretsManager.getSecret('secret3')).toBeUndefined(); // no value
		expect(gcpSecretsManager.getSecret('#@&')).toBeUndefined(); // unsupported name
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
			'#@&': 'value', // unsupported name
		};

		await gcpSecretsManager.init(
			mock<GcpSecretsManagerContext>({
				settings: { serviceAccountKey: `{ "project_id": "${PROJECT_ID}" }` },
			}),
		);

		const listSpy = jest
			.spyOn(SecretManagerServiceClient.prototype, 'listSecrets')
			// @ts-expect-error Partial mock
			.mockResolvedValue([
				[
					{ name: `projects/${PROJECT_ID}/secrets/secret1` },
					{ name: `projects/${PROJECT_ID}/secrets/secret2` },
					{ name: `projects/${PROJECT_ID}/secrets/secret3` },
					{ name: `projects/${PROJECT_ID}/secrets/#@&` },
				],
			]);

		const getSpy = jest
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
		expect(getSpy).not.toHaveBeenCalledWith({
			name: `projects/${PROJECT_ID}/secrets/#@&/versions/latest`,
		});

		expect(gcpSecretsManager.getSecret('secret1')).toBeUndefined(); // error case
		expect(gcpSecretsManager.getSecret('secret2')).toBe('value2');
		expect(gcpSecretsManager.getSecret('secret3')).toBeUndefined(); // no value
		expect(gcpSecretsManager.getSecret('#@&')).toBeUndefined(); // unsupported name
	});
});
