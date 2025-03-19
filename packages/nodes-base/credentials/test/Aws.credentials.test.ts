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
		expect(aws.test.request.baseURL).toBe('=https://sts.{{$credentials.region}}.amazonaws.com');
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
			const result = await aws.authenticate(
				{ ...credentials },
				{ ...requestOptions, url: 'https://jeff.amazonaws.com', baseURL: '' },
			);

			expect(mockSign).toHaveBeenCalledWith(
				{
					...signOpts,
					baseURL: '',
					path: '/',
					host: 'jeff.amazonaws.com',
					url: 'https://jeff.amazonaws.com',
					region: 'us-east-1',
				},
				securityHeaders,
			);
			expect(result.method).toBe('POST');
			expect(result.url).toBe('https://jeff.amazonaws.com/');
		});

		it('should return correct options for the global S3 endpoint', async () => {
			const result = await aws.authenticate(
				{ ...credentials },
				{ ...requestOptions, url: 'https://jeff.s3.amazonaws.com', baseURL: '' },
			);

			expect(mockSign).toHaveBeenCalledWith(
				{
					...signOpts,
					baseURL: '',
					path: '/',
					host: 'jeff.s3.amazonaws.com',
					url: 'https://jeff.s3.amazonaws.com',
					region: 'eu-central-1',
				},
				securityHeaders,
			);
			expect(result.method).toBe('POST');
			expect(result.url).toBe('https://jeff.s3.amazonaws.com/');
		});

		it('should return correct options for the regional S3 endpoint', async () => {
			const result = await aws.authenticate(
				{ ...credentials },
				{ ...requestOptions, url: 'https://jeff.s3-ap-southeast-2.amazonaws.com', baseURL: '' },
			);

			expect(mockSign).toHaveBeenCalledWith(
				{
					...signOpts,
					baseURL: '',
					path: '/',
					host: 'jeff.s3-ap-southeast-2.amazonaws.com',
					url: 'https://jeff.s3-ap-southeast-2.amazonaws.com',
					region: 'ap-southeast-2',
				},
				securityHeaders,
			);
			expect(result.method).toBe('POST');
			expect(result.url).toBe('https://jeff.s3-ap-southeast-2.amazonaws.com/');
		});

		it('should use the whole URL as host if the URL is invalid', async () => {
			const result = await aws.authenticate(
				{ ...credentials },
				{ ...requestOptions, url: 'https://amazonaws.com', baseURL: '' },
			);

			expect(mockSign).toHaveBeenCalledWith(
				{
					...signOpts,
					baseURL: '',
					path: '/',
					host: 'amazonaws.com',
					url: 'https://amazonaws.com',
					region: 'eu-central-1',
				},
				securityHeaders,
			);
			expect(result.method).toBe('POST');
			expect(result.url).toBe('https://amazonaws.com/');
		});

		it('should extract the region and service from a long URL', async () => {
			const result = await aws.authenticate(
				{ ...credentials },
				{
					...requestOptions,
					url: 'https://jeffrey.the.space.donkey.ap-southeast-2.amazonaws.com',
					baseURL: '',
				},
			);

			expect(mockSign).toHaveBeenCalledWith(
				{
					...signOpts,
					baseURL: '',
					path: '/',
					host: 'jeffrey.the.space.donkey.ap-southeast-2.amazonaws.com',
					url: 'https://jeffrey.the.space.donkey.ap-southeast-2.amazonaws.com',
					region: 'ap-southeast-2',
				},
				securityHeaders,
			);
			expect(result.method).toBe('POST');
			expect(result.url).toBe('https://jeffrey.the.space.donkey.ap-southeast-2.amazonaws.com/');
		});
	});
});
