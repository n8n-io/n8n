'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const secret_manager_1 = require('@google-cloud/secret-manager');
const jest_mock_extended_1 = require('jest-mock-extended');
const gcp_secrets_manager_1 = require('../gcp-secrets-manager/gcp-secrets-manager');
jest.mock('@google-cloud/secret-manager');
describe('GCP Secrets Manager', () => {
	const gcpSecretsManager = new gcp_secrets_manager_1.GcpSecretsManager();
	afterEach(() => {
		jest.clearAllMocks();
	});
	it('should update cached secrets', async () => {
		const PROJECT_ID = 'my-project-id';
		const SECRETS = {
			secret1: 'value1',
			secret2: 'value2',
			secret3: '',
			'#@&': 'value',
		};
		await gcpSecretsManager.init(
			(0, jest_mock_extended_1.mock)({
				settings: { serviceAccountKey: `{ "project_id": "${PROJECT_ID}" }` },
			}),
		);
		const listSpy = jest
			.spyOn(secret_manager_1.SecretManagerServiceClient.prototype, 'listSecrets')
			.mockResolvedValue([
				[
					{ name: `projects/${PROJECT_ID}/secrets/secret1` },
					{ name: `projects/${PROJECT_ID}/secrets/secret2` },
					{ name: `projects/${PROJECT_ID}/secrets/secret3` },
					{ name: `projects/${PROJECT_ID}/secrets/#@&` },
				],
			]);
		const getSpy = jest
			.spyOn(secret_manager_1.SecretManagerServiceClient.prototype, 'accessSecretVersion')
			.mockImplementation(async ({ name }) => {
				const secretName = name.split('/')[3];
				return [{ payload: { data: Buffer.from(SECRETS[secretName]) } }];
			});
		await gcpSecretsManager.connect();
		await gcpSecretsManager.update();
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
		expect(gcpSecretsManager.getSecret('secret3')).toBeUndefined();
		expect(gcpSecretsManager.getSecret('#@&')).toBeUndefined();
	});
});
//# sourceMappingURL=gcp-secrets-manager.test.js.map
