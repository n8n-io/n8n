import type {
	ICredentialDataDecryptedObject,
	IHttpRequestOptions,
	INodeParameters,
	INodeType,
	INodeTypes,
} from 'n8n-workflow';
import { NodeHelpers, UserError, Workflow } from 'n8n-workflow';

import { HeaderConstants } from '../../nodes/Microsoft/Storage/GenericFunctions';
import { AzureStorageSharedKeyApi } from '../AzureStorageSharedKeyApi.credentials';

const { mockContainer, MockSecurityConfig } = vi.hoisted(() => {
	class MockSecurityConfig {
		azureStorageCustomEndpoints = false;
	}
	return { mockContainer: { get: vi.fn() }, MockSecurityConfig };
});

vi.mock('@n8n/di', () => ({ Container: mockContainer }));
vi.mock('@n8n/config', () => ({ SecurityConfig: MockSecurityConfig }));

describe('AzureStorageSharedKeyApi Credential', () => {
	const credential = new AzureStorageSharedKeyApi();
	const property = (name: string) => credential.properties.find((p) => p.name === name);
	const securityConfig = new MockSecurityConfig();
	const credentials: ICredentialDataDecryptedObject = {
		account: 'myaccount',
		key: 'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==',
	};
	const privateEndpoint = 'https://myaccount.privatelink.blob.core.windows.net';
	const publicCloudSignature = 'SharedKey myaccount:LTfRKI8awvSOEoMJ6moAHQKF9Rt38hRdut6PsXHhnUI=';
	const listBlobsRequest = (baseURL: string): IHttpRequestOptions => ({
		method: 'GET',
		baseURL,
		url: '/mycontainer',
		qs: { restype: 'container', comp: 'list' },
		headers: { 'x-ms-date': 'Wed, 01 Jan 2025 00:00:00 GMT', 'x-ms-version': '2021-12-02' },
	});

	const nodeTypes: INodeTypes = {
		getByName: () => ({ description: { properties: [] } }) as unknown as INodeType,
		getByNameAndVersion: () => ({ description: { properties: [] } }) as unknown as INodeType,
		getKnownTypes: () => ({}),
	};
	const resolveDefault = (expression: unknown, selfData: ICredentialDataDecryptedObject) => {
		const workflow = new Workflow({
			id: '1',
			nodes: [
				{
					name: 'Credential',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					id: 'credential-1',
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
			active: false,
			nodeTypes,
		});
		return workflow.expression.getComplexParameterValue(
			workflow.getNode('Credential')!,
			expression as string,
			'internal',
			{},
			undefined,
			undefined,
			selfData,
		);
	};

	beforeEach(() => {
		securityConfig.azureStorageCustomEndpoints = false;
		mockContainer.get.mockReset();
		mockContainer.get.mockReturnValue(securityConfig);
	});

	describe('properties', () => {
		it('should offer the Azure clouds and a custom endpoint, defaulting to the public cloud', () => {
			const environment = property('environment');

			expect(environment?.type).toBe('options');
			expect(environment?.default).toBe('blob.core.windows.net');
			expect(environment?.options?.map((option) => 'value' in option && option.value)).toEqual([
				'blob.core.windows.net',
				'blob.core.usgovcloudapi.net',
				'blob.core.chinacloudapi.cn',
				'custom',
			]);
		});

		it('should ask for the endpoint only for a custom cloud', () => {
			const endpoint = property('customEndpoint');

			expect(endpoint?.type).toBe('string');
			expect(endpoint?.required).toBe(true);
			expect(endpoint?.displayOptions).toEqual({ show: { environment: ['custom'] } });
		});

		it.each([
			['blob.core.windows.net', '', 'https://myaccount.blob.core.windows.net'],
			['blob.core.usgovcloudapi.net', '', 'https://myaccount.blob.core.usgovcloudapi.net'],
			['blob.core.chinacloudapi.cn', '', 'https://myaccount.blob.core.chinacloudapi.cn'],
			['custom', privateEndpoint, privateEndpoint],
		])('should build the hidden base URL for %s', (environment, customEndpoint, expected) => {
			const baseUrl = property('baseUrl');

			expect(baseUrl?.type).toBe('hidden');
			expect(
				resolveDefault(baseUrl?.default, { account: 'myaccount', environment, customEndpoint }),
			).toBe(expected);
		});

		it('should resolve a credential saved before the cloud selection existed to the public cloud', () => {
			const stored = { account: 'myaccount', key: 'secret' };
			const withDefaults = NodeHelpers.getNodeParameters(
				credential.properties,
				stored as INodeParameters,
				true,
				false,
				null,
				null,
			) as ICredentialDataDecryptedObject;

			expect(withDefaults.environment).toBe('blob.core.windows.net');
			expect(resolveDefault(withDefaults.baseUrl, withDefaults)).toBe(
				'https://myaccount.blob.core.windows.net',
			);
		});

		it('should test the credential against the configured base URL', () => {
			expect(credential.test.request.baseURL).toBe('={{$credentials.baseUrl}}');
		});
	});

	describe('authenticate', () => {
		const custom = (customEndpoint: string): ICredentialDataDecryptedObject => ({
			...credentials,
			environment: 'custom',
			customEndpoint,
		});

		it('should sign with the account name and path, independent of the host', async () => {
			const publicCloud = await credential.authenticate(
				credentials,
				listBlobsRequest('https://myaccount.blob.core.windows.net'),
			);
			const sovereignCloud = await credential.authenticate(
				{ ...credentials, environment: 'blob.core.chinacloudapi.cn' },
				listBlobsRequest('https://myaccount.blob.core.chinacloudapi.cn'),
			);

			expect(publicCloud.headers?.[HeaderConstants.AUTHORIZATION]).toBe(publicCloudSignature);
			expect(sovereignCloud.headers?.[HeaderConstants.AUTHORIZATION]).toBe(publicCloudSignature);
		});

		it('should not consult the instance setting for an Azure cloud', async () => {
			mockContainer.get.mockImplementation(() => {
				throw new Error('instance setting read');
			});

			const result = await credential.authenticate(
				{ ...credentials, environment: 'blob.core.usgovcloudapi.net' },
				listBlobsRequest('https://myaccount.blob.core.usgovcloudapi.net'),
			);

			expect(result.headers?.[HeaderConstants.AUTHORIZATION]).toBe(publicCloudSignature);
		});

		it.each(['my-account', 'myaccount.example.com', 'myaccount/x', ''])(
			'should reject the account name %j',
			async (account) => {
				const request = credential.authenticate(
					{ ...credentials, account },
					listBlobsRequest('https://myaccount.blob.core.windows.net'),
				);

				await expect(request).rejects.toThrow(UserError);
				await expect(request).rejects.toThrow(
					'The account name can contain only letters and numbers.',
				);
			},
		);

		it('should reject a cloud that is not in the list', async () => {
			const request = credential.authenticate(
				{ ...credentials, environment: 'blob.example.com' },
				listBlobsRequest('https://myaccount.blob.example.com'),
			);

			await expect(request).rejects.toThrow(UserError);
			await expect(request).rejects.toThrow('Select an Azure cloud from the list.');
		});

		it('should refuse a custom endpoint when the instance does not allow it', async () => {
			const request = credential.authenticate(
				custom(privateEndpoint),
				listBlobsRequest(privateEndpoint),
			);

			await expect(request).rejects.toThrow(UserError);
			await expect(request).rejects.toThrow(
				'Custom Azure Storage endpoints are disabled on this instance, contact your administrator.',
			);
		});

		it.each([privateEndpoint, `${privateEndpoint}/`, 'https://myaccount.example.com:10000'])(
			'should sign a request to the custom endpoint %j when the instance allows it',
			async (customEndpoint) => {
				securityConfig.azureStorageCustomEndpoints = true;

				const result = await credential.authenticate(
					custom(customEndpoint),
					listBlobsRequest(customEndpoint),
				);

				expect(result.headers?.[HeaderConstants.AUTHORIZATION]).toBe(publicCloudSignature);
			},
		);

		it('should require an endpoint for a custom cloud', async () => {
			securityConfig.azureStorageCustomEndpoints = true;

			const request = credential.authenticate(
				custom(''),
				listBlobsRequest('https://myaccount.blob.core.windows.net'),
			);

			await expect(request).rejects.toThrow(UserError);
			await expect(request).rejects.toThrow(
				'Endpoint is required when Azure Cloud is set to Custom.',
			);
		});

		it.each([
			'myaccount.privatelink.blob.core.windows.net',
			'ftp://myaccount.example.com',
			'http://myaccount.example.com',
			'https://user:pass@myaccount.example.com',
			'https://myaccount.example.com/devstoreaccount1',
			'https://myaccount.example.com/?x=1',
			'https://myaccount.example.com/#fragment',
		])('should reject the endpoint %j', async (customEndpoint) => {
			securityConfig.azureStorageCustomEndpoints = true;

			const request = credential.authenticate(
				custom(customEndpoint),
				listBlobsRequest('https://myaccount.blob.core.windows.net'),
			);

			await expect(request).rejects.toThrow(UserError);
			await expect(request).rejects.toThrow(
				'Endpoint must be an https:// URL with only a hostname and an optional port',
			);
		});
	});
});
