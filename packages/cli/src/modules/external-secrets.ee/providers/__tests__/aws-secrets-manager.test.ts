import type { Mock } from 'vitest';
import { SecretsManager } from '@aws-sdk/client-secrets-manager';
import type { OutboundHttp, HttpTransport } from '@n8n/backend-network';
import { mock } from 'vitest-mock-extended';
import type { Agent as HttpAgent } from 'node:http';
import type { Agent as HttpsAgent } from 'node:https';

import { AwsSecretsManager, type AwsSecretsManagerContext } from '../aws-secrets-manager';

vi.mock('@aws-sdk/client-secrets-manager');

describe('AwsSecretsManager', () => {
	const region = 'eu-central-1';
	const accessKeyId = 'FAKE-ACCESS-KEY-ID';
	const secretAccessKey = 'FAKE-SECRET';

	const context = mock<AwsSecretsManagerContext>();
	const listSecretsSpy = vi.spyOn(SecretsManager.prototype, 'listSecrets');
	const batchGetSpy = vi.spyOn(SecretsManager.prototype, 'batchGetSecretValue');

	let awsSecretsManager: AwsSecretsManager;

	beforeEach(() => {
		vi.resetAllMocks();

		awsSecretsManager = new AwsSecretsManager();
	});

	describe('transport wiring', () => {
		it('drives the SDK through the outbound HTTP transport with SSRF disabled', async () => {
			const httpAgent = mock<HttpAgent>();
			const httpsAgent = mock<HttpsAgent>();
			const transport = mock<HttpTransport>();
			transport.getNodeAgent.mockReturnValue({ httpAgent, httpsAgent });
			const outboundHttp = mock<OutboundHttp>();
			outboundHttp.transport.mockReturnValue(transport);

			const provider = new AwsSecretsManager(undefined, outboundHttp);
			await provider.init(
				mock<AwsSecretsManagerContext>({
					settings: { region, authMethod: 'iamUser', accessKeyId, secretAccessKey },
				}),
			);

			expect(outboundHttp.transport).toHaveBeenCalledWith({ ssrf: 'disabled' });

			// The SDK client is built with our agents as its requestHandler, while the
			// region and credentials it was already given are left untouched.
			const SecretsManagerMock = SecretsManager as unknown as Mock;
			const clientConfig = SecretsManagerMock.mock.calls.at(-1)?.[0];
			expect(clientConfig.requestHandler).toEqual({ httpAgent, httpsAgent });
			expect(clientConfig.region).toBe(region);
			expect(clientConfig.credentials).toEqual({ accessKeyId, secretAccessKey });
		});
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
