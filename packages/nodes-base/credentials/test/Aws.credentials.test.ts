import { sign, type Request } from 'aws4';
import type { IHttpRequestOptions } from 'n8n-workflow';

import { Aws } from '../Aws.credentials';
import type { AwsIamCredentialsType } from '../common/aws/types';

jest.mock('aws4', () => ({
	sign: jest.fn(),
}));

describe('Aws Credential', () => {
	const aws = new Aws();
	let mockSign: jest.Mock;

	beforeEach(() => {
		mockSign = sign as unknown as jest.Mock;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should have correct properties', () => {
		expect(aws.name).toBe('aws');
		expect(aws.displayName).toBe('AWS (IAM)');
		expect(aws.documentationUrl).toBe('aws');
		expect(aws.icon).toEqual({ light: 'file:icons/AWS.svg', dark: 'file:icons/AWS.dark.svg' });
		expect(aws.properties.length).toBeGreaterThan(0);
		expect(aws.test.request.baseURL).toBe(
			// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
			'={{$credentials.region.startsWith("cn-") ? `https://sts.${$credentials.region}.amazonaws.com.cn` : `https://sts.${$credentials.region}.amazonaws.com`}}',
		);
		expect(aws.test.request.url).toBe('?Action=GetCallerIdentity&Version=2011-06-15');
		expect(aws.test.request.method).toBe('POST');
	});

	describe('authenticate', () => {
		const credentials: AwsIamCredentialsType = {
			region: 'eu-central-1',
			accessKeyId: 'hakuna',
			secretAccessKey: 'matata',
			customEndpoints: false,
			temporaryCredentials: false,
		};

		const requestOptions: IHttpRequestOptions = {
			qs: {},
			body: {},
			headers: {},
			baseURL: 'https://sts.eu-central-1.amazonaws.com',
			url: '?Action=GetCallerIdentity&Version=2011-06-15',
			method: 'POST',
			returnFullResponse: true,
		};

		const signOpts: Request & IHttpRequestOptions = {
			qs: {},
			body: undefined,
			headers: {},
			baseURL: 'https://sts.eu-central-1.amazonaws.com',
			url: '?Action=GetCallerIdentity&Version=2011-06-15',
			method: 'POST',
			returnFullResponse: true,
			host: 'sts.eu-central-1.amazonaws.com',
			path: '/?Action=GetCallerIdentity&Version=2011-06-15',
			region: 'eu-central-1',
			service: 'sts',
		};

		const securityHeaders = {
			accessKeyId: 'hakuna',
			secretAccessKey: 'matata',
			sessionToken: undefined,
		};

		it('should call sign with correct parameters', async () => {
			const result = await aws.authenticate(credentials, requestOptions);

			expect(mockSign).toHaveBeenCalledWith(signOpts, securityHeaders);

			expect(result.method).toBe('POST');
			expect(result.url).toBe(
				'https://sts.eu-central-1.amazonaws.com/?Action=GetCallerIdentity&Version=2011-06-15',
			);
		});

		it('should return correct options with custom endpoint', async () => {
			const customEndpoint = 'https://custom.endpoint.com';
			const result = await aws.authenticate(
				{ ...credentials, customEndpoints: true, snsEndpoint: customEndpoint },
				{ ...requestOptions, url: '', baseURL: '', qs: { service: 'sns' } },
			);

			expect(mockSign).toHaveBeenCalledWith(
				{
					...signOpts,
					baseURL: '',
					path: '/',
					url: '',
					qs: {
						service: 'sns',
					},
					host: 'custom.endpoint.com',
					service: 'sns',
				},
				securityHeaders,
			);
			expect(result.method).toBe('POST');
			expect(result.url).toBe(`${customEndpoint}/`);
		});

		it('should return correct options with temporary credentials', async () => {
			const result = await aws.authenticate(
				{ ...credentials, temporaryCredentials: true, sessionToken: 'test-token' },
				requestOptions,
			);

			expect(mockSign).toHaveBeenCalledWith(signOpts, {
				...securityHeaders,
				sessionToken: 'test-token',
			});
			expect(result.method).toBe('POST');
			expect(result.url).toBe(
				'https://sts.eu-central-1.amazonaws.com/?Action=GetCallerIdentity&Version=2011-06-15',
			);
		});

		it('should return correct options for a global AWS service', async () => {
			const result = await aws.authenticate(credentials, {
				...requestOptions,
				url: 'https://iam.amazonaws.com',
				baseURL: '',
			});

			expect(mockSign).toHaveBeenCalledWith(
				{
					...signOpts,
					baseURL: '',
					path: '/',
					host: 'iam.amazonaws.com',
					url: 'https://iam.amazonaws.com',
					service: 'iam',
				},
				securityHeaders,
			);
			expect(result.method).toBe('POST');
			expect(result.url).toBe('https://iam.amazonaws.com/');
		});

		it('should handle an IRequestOptions object with form instead of body', async () => {
			const result = await aws.authenticate({ ...credentials }, {
				...requestOptions,
				body: undefined,
				form: {
					Action: 'ListUsers',
					Version: '2010-05-08',
				},
				baseURL: '',
				url: 'https://iam.amazonaws.com',
				host: 'iam.amazonaws.com',
				path: '/',
			} as IHttpRequestOptions);

			expect(mockSign).toHaveBeenCalledWith(
				{
					...signOpts,
					form: {
						Action: 'ListUsers',
						Version: '2010-05-08',
					},
					body: 'Action=ListUsers&Version=2010-05-08',
					host: 'iam.amazonaws.com',
					url: 'https://iam.amazonaws.com',
					baseURL: '',
					path: '/',
					headers: {
						'content-type': 'application/x-www-form-urlencoded',
					},
					region: 'eu-central-1',
					service: 'iam',
				},
				securityHeaders,
			);
			expect(result.method).toBe('POST');
			expect(result.url).toBe('https://iam.amazonaws.com/');
		});

		describe('Bedrock header injection', () => {
			it('should auto-inject Content-Type and Accept headers for bedrock service', async () => {
				const result = await aws.authenticate(credentials, {
					...requestOptions,
					url: '',
					baseURL: '',
					qs: { service: 'bedrock' },
					headers: {},
				});

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						headers: expect.objectContaining({
							'Content-Type': 'application/json',
							Accept: 'application/json',
						}),
					}),
					securityHeaders,
				);
			});

			it('should auto-inject headers for bedrock-runtime service', async () => {
				const result = await aws.authenticate(credentials, {
					...requestOptions,
					url: '',
					baseURL: '',
					qs: { service: 'bedrock-runtime' },
					headers: {},
				});

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						headers: expect.objectContaining({
							'Content-Type': 'application/json',
							Accept: 'application/json',
						}),
					}),
					securityHeaders,
				);
			});

			it('should auto-inject headers for bedrock-agent-runtime service', async () => {
				const result = await aws.authenticate(credentials, {
					...requestOptions,
					url: '',
					baseURL: '',
					qs: { service: 'bedrock-agent-runtime' },
					headers: {},
				});

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						headers: expect.objectContaining({
							'Content-Type': 'application/json',
							Accept: 'application/json',
						}),
					}),
					securityHeaders,
				);
			});

			it('should not override existing Content-Type header for bedrock', async () => {
				const result = await aws.authenticate(credentials, {
					...requestOptions,
					url: '',
					baseURL: '',
					qs: { service: 'bedrock' },
					headers: {
						'Content-Type': 'application/x-custom',
					},
				});

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						headers: expect.objectContaining({
							'Content-Type': 'application/x-custom',
							Accept: 'application/json',
						}),
					}),
					securityHeaders,
				);
			});

			it('should not override existing Accept header for bedrock', async () => {
				const result = await aws.authenticate(credentials, {
					...requestOptions,
					url: '',
					baseURL: '',
					qs: { service: 'bedrock' },
					headers: {
						Accept: 'text/plain',
					},
				});

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						headers: expect.objectContaining({
							'Content-Type': 'application/json',
							Accept: 'text/plain',
						}),
					}),
					securityHeaders,
				);
			});

			it('should handle case-sensitive headers correctly', async () => {
				const result = await aws.authenticate(credentials, {
					...requestOptions,
					url: '',
					baseURL: '',
					qs: { service: 'bedrock' },
					headers: {
						'content-type': 'application/x-custom',
					},
				});

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						headers: expect.objectContaining({
							'content-type': 'application/x-custom',
							Accept: 'application/json',
						}),
					}),
					securityHeaders,
				);
			});

			it('should not inject headers for non-bedrock services', async () => {
				const result = await aws.authenticate(credentials, {
					...requestOptions,
					url: '',
					baseURL: '',
					qs: { service: 's3' },
					headers: {},
				});

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						headers: {},
					}),
					securityHeaders,
				);
			});
		});

		describe('China regions', () => {
			const chinaCredentials: AwsIamCredentialsType = {
				region: 'cn-north-1',
				accessKeyId: 'hakuna',
				secretAccessKey: 'matata',
				customEndpoints: false,
				temporaryCredentials: false,
			};

			it('should use amazonaws.com.cn domain for cn-north-1 region', async () => {
				const result = await aws.authenticate(chinaCredentials, {
					...requestOptions,
					url: '',
					baseURL: '',
					qs: { service: 's3' },
				});

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						host: 's3.cn-north-1.amazonaws.com.cn',
						region: 'cn-north-1',
					}),
					{
						accessKeyId: 'hakuna',
						secretAccessKey: 'matata',
						sessionToken: undefined,
					},
				);
				expect(result.url).toBe('https://s3.cn-north-1.amazonaws.com.cn/');
			});

			it('should handle custom endpoints for China regions', async () => {
				const customEndpoint = 'https://custom.china.endpoint.com.cn';
				const result = await aws.authenticate(
					{ ...chinaCredentials, customEndpoints: true, s3Endpoint: customEndpoint },
					{ ...requestOptions, url: '', baseURL: '', qs: { service: 's3' } },
				);

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						host: 'custom.china.endpoint.com.cn',
					}),
					{
						accessKeyId: 'hakuna',
						secretAccessKey: 'matata',
						sessionToken: undefined,
					},
				);
				expect(result.url).toBe(`${customEndpoint}/`);
			});

			it('should parse China region URLs correctly', async () => {
				const result = await aws.authenticate(chinaCredentials, {
					...requestOptions,
					url: 'https://s3.cn-north-1.amazonaws.com.cn/bucket/key',
					baseURL: '',
				});

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						host: 's3.cn-north-1.amazonaws.com.cn',
						region: 'cn-north-1',
						path: '/bucket/key',
					}),
					{
						accessKeyId: 'hakuna',
						secretAccessKey: 'matata',
						sessionToken: undefined,
					},
				);
				expect(result.url).toBe('https://s3.cn-north-1.amazonaws.com.cn/bucket/key');
			});
		});

		describe('Regular regions (non-China)', () => {
			it('should use amazonaws.com domain for regular regions', async () => {
				const result = await aws.authenticate(credentials, {
					...requestOptions,
					url: '',
					baseURL: '',
					qs: { service: 's3' },
				});

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						host: 's3.eu-central-1.amazonaws.com',
						region: 'eu-central-1',
					}),
					{
						accessKeyId: 'hakuna',
						secretAccessKey: 'matata',
						sessionToken: undefined,
					},
				);
				expect(result.url).toBe('https://s3.eu-central-1.amazonaws.com/');
			});
		});

		describe('Explicit service parameter preservation', () => {
			it('should preserve explicit iot-data service parameter and normalize to iotdevicegateway', async () => {
				// IoT Data uses custom endpoint format: {account-id}-ats.iot.{region}.amazonaws.com
				// Service must be explicitly set to 'iot-data' which gets normalized to 'iotdevicegateway'
				// Region should also be set explicitly for non-standard endpoint formats
				const iotDataUrl =
					'https://a3ks7h4zvs4k3n-ats.iot.us-east-1.amazonaws.com/things/test-thing/shadow';

				const result = await aws.authenticate(
					{ ...credentials, region: 'us-east-1' },
					{
						...requestOptions,
						url: iotDataUrl,
						baseURL: '',
						qs: { service: 'iot-data' },
					},
				);

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						service: 'iotdevicegateway', // Should normalize iot-data to iotdevicegateway
						host: 'a3ks7h4zvs4k3n-ats.iot.us-east-1.amazonaws.com',
						path: '/things/test-thing/shadow',
						region: 'us-east-1',
					}),
					{
						accessKeyId: 'hakuna',
						secretAccessKey: 'matata',
						sessionToken: undefined,
					},
				);
				expect(result.url).toBe(iotDataUrl);
			});

			it('should not override explicit service parameter with URL-based parsing', async () => {
				// Test that explicit service in qs takes precedence over URL parsing
				// Use credentials without explicit region to allow URL region parsing
				const credsWithoutRegion = { ...credentials, region: '' };
				const result = await aws.authenticate(credsWithoutRegion, {
					...requestOptions,
					url: 'https://s3.us-west-2.amazonaws.com/bucket/key',
					baseURL: '',
					qs: { service: 'lambda' }, // Explicitly setting different service
				});

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						service: 'lambda', // Should use explicit service, not 's3' from URL
						host: 's3.us-west-2.amazonaws.com',
						region: 'us-west-2',
					}),
					{
						accessKeyId: 'hakuna',
						secretAccessKey: 'matata',
						sessionToken: undefined,
					},
				);
			});

			it('should use URL-parsed service when no explicit service provided', async () => {
				// Test that URL parsing works when service is not explicitly set
				// Use credentials without explicit region to allow URL parsing
				const credsWithoutRegion = { ...credentials, region: '' };
				const result = await aws.authenticate(credsWithoutRegion, {
					...requestOptions,
					url: 'https://dynamodb.ap-southeast-1.amazonaws.com/',
					baseURL: '',
					qs: {}, // No explicit service
				});

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						service: 'dynamodb', // Should parse from URL
						host: 'dynamodb.ap-southeast-1.amazonaws.com',
						region: 'ap-southeast-1',
					}),
					{
						accessKeyId: 'hakuna',
						secretAccessKey: 'matata',
						sessionToken: undefined,
					},
				);
			});
		});

		describe('Body handling', () => {
			it('should stringify object body content', async () => {
				const objectBody = { key: 'value', nested: { prop: 'test' } };
				const result = await aws.authenticate(credentials, {
					...requestOptions,
					body: objectBody,
				});

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						body: JSON.stringify(objectBody),
					}),
					securityHeaders,
				);
				expect(result.body).toBe(JSON.stringify(objectBody));
			});

			it('should not stringify object body content when Content-Length header is present', async () => {
				const objectBody = { key: 'value', nested: { prop: 'test' } };
				const result = await aws.authenticate(credentials, {
					...requestOptions,
					body: objectBody,
					headers: {
						'Content-Length': '100',
					},
				});

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						body: objectBody,
					}),
					securityHeaders,
				);
				expect(result.body).toBe(objectBody);
			});

			it('should not stringify object body content when content-length header is present (lowercase)', async () => {
				const objectBody = { key: 'value', nested: { prop: 'test' } };
				const result = await aws.authenticate(credentials, {
					...requestOptions,
					body: objectBody,
					headers: {
						'content-length': '100',
					},
				});

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						body: objectBody,
					}),
					securityHeaders,
				);
				expect(result.body).toBe(objectBody);
			});

			it('should not stringify string body content', async () => {
				const stringBody = 'test string body';
				const result = await aws.authenticate(credentials, {
					...requestOptions,
					body: stringBody,
				});

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						body: stringBody,
					}),
					securityHeaders,
				);
				expect(result.body).toBe(stringBody);
			});

			it('should not stringify Buffer body content', async () => {
				const bufferBody = Buffer.from('test buffer');
				const result = await aws.authenticate(credentials, {
					...requestOptions,
					body: bufferBody,
				});

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						body: bufferBody,
					}),
					securityHeaders,
				);
				expect(result.body).toBe(bufferBody);
			});

			it('should handle null body content', async () => {
				const result = await aws.authenticate(credentials, {
					...requestOptions,
					body: null,
				});

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						body: null,
					}),
					securityHeaders,
				);
				expect(result.body).toBe(null);
			});

			it('should handle undefined body content', async () => {
				const result = await aws.authenticate(credentials, {
					...requestOptions,
					body: undefined,
				});

				expect(mockSign).toHaveBeenCalledWith(
					expect.objectContaining({
						body: undefined,
					}),
					securityHeaders,
				);
				expect(result.body).toBe(undefined);
			});
		});
	});
});
