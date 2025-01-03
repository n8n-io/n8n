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
});
