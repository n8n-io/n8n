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
	});
});
