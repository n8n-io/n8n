import { sign, type Request } from 'aws4';
import type { IHttpRequestOptions } from 'n8n-workflow';

import { Aws, type AwsCredentialsType } from '../Aws.credentials';

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
		expect(aws.displayName).toBe('AWS');
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
		const credentials: AwsCredentialsType = {
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
					// PR #14037 introduces region normalization for global endpoints
					// This test works with or without the normalization
					region: expect.stringMatching(/[a-z]{2}-[a-z]+-[0-9]+/),
				},
				securityHeaders,
			);
			expect(result.method).toBe('POST');
			expect(result.url).toBe('https://iam.amazonaws.com/');
		});

		describe('China regions', () => {
			const chinaCredentials: AwsCredentialsType = {
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
