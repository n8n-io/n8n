import { SecretsManager } from '@aws-sdk/client-secrets-manager';
import { mock } from 'jest-mock-extended';

import { AwsSecretsManager, type AwsSecretsManagerContext } from '../aws-secrets-manager';

jest.mock('@aws-sdk/client-secrets-manager');

describe('AwsSecretsManager', () => {
	const region = 'eu-central-1';
	const accessKeyId = 'FAKE-ACCESS-KEY-ID';
	const secretAccessKey = 'FAKE-SECRET';

	const context = mock<AwsSecretsManagerContext>();
	const listSecretsSpy = jest.spyOn(SecretsManager.prototype, 'listSecrets');
	const batchGetSpy = jest.spyOn(SecretsManager.prototype, 'batchGetSecretValue');

	let awsSecretsManager: AwsSecretsManager;

	beforeEach(() => {
		jest.resetAllMocks();

		awsSecretsManager = new AwsSecretsManager();
	});

	describe('IAM User authentication', () => {
		it('should fail to connect with invalid credentials', async () => {
			context.settings = {
				region,
				authMethod: 'iamUser',
				accessKeyId: 'invalid',
				secretAccessKey: 'invalid',
			};

			await awsSecretsManager.init(context);

			listSecretsSpy.mockImplementation(() => {
				throw new Error('Invalid credentials');
			});

			await awsSecretsManager.connect();

			expect(awsSecretsManager.state).toBe('error');
		});
	});

	it('should update cached secrets', async () => {
		context.settings = {
			region,
			authMethod: 'iamUser',
			accessKeyId,
			secretAccessKey,
		};

		await awsSecretsManager.init(context);

		listSecretsSpy.mockImplementation(async () => {
			return {
				SecretList: [{ Name: 'secret1' }, { Name: 'secret2' }],
			};
		});

		batchGetSpy.mockImplementation(async () => {
			return {
				SecretValues: [
					{ Name: 'secret1', SecretString: 'value1' },
					{ Name: 'secret2', SecretString: 'value2' },
				],
			};
		});

		await awsSecretsManager.update();

		expect(listSecretsSpy).toHaveBeenCalledTimes(1);
		expect(batchGetSpy).toHaveBeenCalledWith({
			SecretIdList: expect.arrayContaining(['secret1', 'secret2']),
		});

		expect(awsSecretsManager.getSecret('secret1')).toBe('value1');
		expect(awsSecretsManager.getSecret('secret2')).toBe('value2');
	});

	it('should properly batch secret requests', async () => {
		context.settings = {
			region,
			authMethod: 'iamUser',
			accessKeyId,
			secretAccessKey,
		};
		await awsSecretsManager.init(context);

		// Generate 25 secrets to test batching (default batch size is 20)
		const secretsList = Array(25)
			.fill(0)
			.map((_, i) => ({ Name: `secret${i}` }));

		listSecretsSpy.mockImplementation(async () => {
			return { SecretList: secretsList };
		});

		batchGetSpy.mockImplementation(async (params) => {
			const secretValues = (params.SecretIdList || []).map((secretId) => ({
				Name: secretId,
				SecretString: `${secretId}-value`,
			}));
			return { SecretValues: secretValues };
		});

		await awsSecretsManager.update();

		// Should have been called twice for 25 secrets with batch size 20
		expect(batchGetSpy).toHaveBeenCalledTimes(2);

		// First batch should have 20 secrets
		expect(batchGetSpy.mock.calls[0][0].SecretIdList?.length).toBe(20);

		// Second batch should have 5 secrets
		expect(batchGetSpy.mock.calls[1][0].SecretIdList?.length).toBe(5);

		// Check a few secrets
		expect(awsSecretsManager.getSecret('secret0')).toBe('secret0-value');
		expect(awsSecretsManager.getSecret('secret24')).toBe('secret24-value');
	});

	it('should parse JSON secret values into objects for dot-notation traversal', async () => {
		context.settings = {
			region,
			authMethod: 'iamUser',
			accessKeyId,
			secretAccessKey,
		};

		await awsSecretsManager.init(context);

		const jsonSecret = JSON.stringify({ clientId: 'my-client-id', clientSecret: 'my-secret' });

		listSecretsSpy.mockImplementation(async () => {
			return {
				SecretList: [{ Name: 'salesforce' }, { Name: 'plaintext' }],
			};
		});

		batchGetSpy.mockImplementation(async () => {
			return {
				SecretValues: [
					{ Name: 'salesforce', SecretString: jsonSecret },
					{ Name: 'plaintext', SecretString: 'just-a-string' },
				],
			};
		});

		await awsSecretsManager.update();

		// JSON secret should be parsed into an object
		const parsed = awsSecretsManager.getSecret('salesforce');
		expect(typeof parsed).toBe('object');
		expect(parsed).toEqual({ clientId: 'my-client-id', clientSecret: 'my-secret' });

		// Plain text secret should remain a string
		const plain = awsSecretsManager.getSecret('plaintext');
		expect(typeof plain).toBe('string');
		expect(plain).toBe('just-a-string');
	});

	it('should keep non-object JSON values as strings', async () => {
		context.settings = {
			region,
			authMethod: 'iamUser',
			accessKeyId,
			secretAccessKey,
		};

		await awsSecretsManager.init(context);

		listSecretsSpy.mockImplementation(async () => {
			return {
				SecretList: [{ Name: 'array' }, { Name: 'number' }, { Name: 'quoted' }],
			};
		});

		batchGetSpy.mockImplementation(async () => {
			return {
				SecretValues: [
					{ Name: 'array', SecretString: '["a","b"]' },
					{ Name: 'number', SecretString: '42' },
					{ Name: 'quoted', SecretString: '"hello"' },
				],
			};
		});

		await awsSecretsManager.update();

		// Arrays should remain as strings (not traversable)
		expect(awsSecretsManager.getSecret('array')).toBe('["a","b"]');
		// Numbers should remain as strings
		expect(awsSecretsManager.getSecret('number')).toBe('42');
		// Quoted strings should remain as strings
		expect(awsSecretsManager.getSecret('quoted')).toBe('"hello"');
	});

	it('should handle pagination in listing secrets', async () => {
		context.settings = {
			region,
			authMethod: 'iamUser',
			accessKeyId,
			secretAccessKey,
		};
		await awsSecretsManager.init(context);

		// First call with NextToken
		listSecretsSpy.mockImplementationOnce(async () => {
			return {
				SecretList: [{ Name: 'secret1' }, { Name: 'secret2' }],
				NextToken: 'next-page-token',
			};
		});

		// Second call with no NextToken
		listSecretsSpy.mockImplementationOnce(async () => {
			return {
				SecretList: [{ Name: 'secret3' }],
			};
		});

		batchGetSpy.mockImplementation(async (params) => {
			const secretValues = [];
			for (const secretId of params.SecretIdList || []) {
				secretValues.push({
					Name: secretId,
					SecretString: `${secretId}-value`,
				});
			}
			return { SecretValues: secretValues };
		});

		await awsSecretsManager.update();

		expect(listSecretsSpy).toHaveBeenCalledWith({ NextToken: 'next-page-token' });
		expect(listSecretsSpy).toHaveBeenCalledWith({ NextToken: undefined });

		expect(awsSecretsManager.getSecret('secret1')).toBe('secret1-value');
		expect(awsSecretsManager.getSecret('secret2')).toBe('secret2-value');
		expect(awsSecretsManager.getSecret('secret3')).toBe('secret3-value');
	});
});
