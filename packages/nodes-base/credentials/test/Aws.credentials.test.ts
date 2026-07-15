import type { IHttpRequestOptions } from 'n8n-workflow';

import { Aws } from '../Aws.credentials';
import type { AwsIamCredentialsType } from '../common/aws/types';

const { mockSmithySignFn, MockSignatureV4 } = vi.hoisted(() => {
	const mockSmithySignFn = vi.fn();
	const MockSignatureV4 = vi.fn(function (this: { sign: typeof mockSmithySignFn }) {
		this.sign = mockSmithySignFn;
	});
	return { mockSmithySignFn, MockSignatureV4 };
});

vi.mock('@smithy/signature-v4', () => ({
	SignatureV4: MockSignatureV4,
}));

vi.mock('aws4', () => ({
	sign: vi.fn(),
}));

describe('Aws Credential', () => {
	const aws = new Aws();

	beforeEach(() => {
		mockSmithySignFn.mockResolvedValue({ headers: {} });
	});

	afterEach(() => {
		vi.clearAllMocks();
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

		const securityHeaders = {
			accessKeyId: 'hakuna',
			secretAccessKey: 'matata',
			sessionToken: undefined,
		};

		it('should call sign with correct parameters', async () => {
			const result = await aws.authenticate(credentials, requestOptions);

			expect(MockSignatureV4).toHaveBeenCalledWith(
				expect.objectContaining({
					credentials: securityHeaders,
					region: 'eu-central-1',
				}),
			);
			expect(mockSmithySignFn).toHaveBeenCalledWith(
				expect.objectContaining({
					hostname: 'sts.eu-central-1.amazonaws.com',
				}),
			);
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

			expect(mockSmithySignFn).toHaveBeenCalledWith(
				expect.objectContaining({
					hostname: 'custom.endpoint.com',
					path: '/',
				}),
			);
			expect(result.method).toBe('POST');
			expect(result.url).toBe(`${customEndpoint}/`);
		});

		it('should return correct options with temporary credentials', async () => {
			const result = await aws.authenticate(
				{ ...credentials, temporaryCredentials: true, sessionToken: 'test-token' },
				requestOptions,
			);

			expect(MockSignatureV4).toHaveBeenCalledWith(
				expect.objectContaining({
					credentials: expect.objectContaining({ sessionToken: 'test-token' }),
				}),
			);
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

			expect(mockSmithySignFn).toHaveBeenCalledWith(
				expect.objectContaining({
					hostname: 'iam.amazonaws.com',
					path: '/',
				}),
			);
			expect(result.method).toBe('POST');
			expect(result.url).toBe('https://iam.amazonaws.com/');
		});

		describe('Amazon Bedrock services', () => {
			it.each([
				{
					host: 'bedrock-runtime.us-east-1.amazonaws.com',
					path: '/model/anthropic.claude-v2/invoke',
				},
				{
					host: 'bedrock-agent.us-east-1.amazonaws.com',
					path: '/agents/',
				},
				{
					host: 'bedrock-agent-runtime.us-east-1.amazonaws.com',
					path: '/agents/agent-id/agentAliases/alias-id/sessions/session-id/text',
				},
				{
					host: 'bedrock-data-automation.us-east-1.amazonaws.com',
					path: '/projects/',
				},
				{
					host: 'bedrock-data-automation-runtime.us-east-1.amazonaws.com',
					path: '/invocations',
				},
			])(
				'should sign $host requests with the Bedrock service namespace',
				async ({ host, path }) => {
					const result = await aws.authenticate(credentials, {
						...requestOptions,
						baseURL: '',
						url: `https://${host}${path}`,
					});

					expect(MockSignatureV4).toHaveBeenCalledWith(
						expect.objectContaining({
							service: 'bedrock',
							region: 'us-east-1',
						}),
					);
					expect(mockSmithySignFn).toHaveBeenCalledWith(
						expect.objectContaining({ hostname: host, path }),
					);
					expect(result.url).toBe(`https://${host}${path}`);
				},
			);
		});

		describe('PrivateLink (vpce) endpoints', () => {
			it.each([
				{
					host: 'vpce-0abc123.bedrock-runtime.us-east-1.vpce.amazonaws.com',
					path: '/model/anthropic.claude-v2/invoke',
					region: 'us-east-1',
				},
				{
					host: 'vpce-0abc123.bedrock-agent.us-east-1.vpce.amazonaws.com',
					path: '/agents/',
					region: 'us-east-1',
				},
				{
					host: 'vpce-0abc123.bedrock-agent-runtime.us-east-1.vpce.amazonaws.com',
					path: '/agents/agent-id/agentAliases/alias-id/sessions/session-id/text',
					region: 'us-east-1',
				},
				{
					host: 'vpce-0abc123.bedrock-data-automation.us-east-1.vpce.amazonaws.com',
					path: '/projects/',
					region: 'us-east-1',
				},
				{
					host: 'vpce-0abc123.bedrock-data-automation-runtime.us-east-1.vpce.amazonaws.com',
					path: '/invocations',
					region: 'us-east-1',
				},
			])(
				'should sign vpce $host requests with the Bedrock service namespace',
				async ({ host, path, region }) => {
					const result = await aws.authenticate(credentials, {
						...requestOptions,
						baseURL: '',
						url: `https://${host}${path}`,
					});

					expect(MockSignatureV4).toHaveBeenCalledWith(
						expect.objectContaining({
							service: 'bedrock',
							region,
						}),
					);
					expect(mockSmithySignFn).toHaveBeenCalledWith(
						expect.objectContaining({ hostname: host, path }),
					);
					expect(result.url).toBe(`https://${host}${path}`);
				},
			);

			it('should sign a vpce host for a non-Bedrock service using its own service name', async () => {
				const host = 'vpce-0abc123.sqs.us-west-2.vpce.amazonaws.com';
				const path = '/';
				const result = await aws.authenticate(credentials, {
					...requestOptions,
					baseURL: '',
					url: `https://${host}${path}`,
				});

				expect(MockSignatureV4).toHaveBeenCalledWith(
					expect.objectContaining({
						service: 'sqs',
						region: 'us-west-2',
					}),
				);
				expect(mockSmithySignFn).toHaveBeenCalledWith(
					expect.objectContaining({ hostname: host, path }),
				);
				expect(result.url).toBe(`https://${host}${path}`);
			});
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

			expect(mockSmithySignFn).toHaveBeenCalledWith(
				expect.objectContaining({
					hostname: 'iam.amazonaws.com',
					body: 'Action=ListUsers&Version=2010-05-08',
				}),
			);
			expect(result.method).toBe('POST');
			expect(result.url).toBe('https://iam.amazonaws.com/');
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

				expect(mockSmithySignFn).toHaveBeenCalledWith(
					expect.objectContaining({ hostname: 's3.cn-north-1.amazonaws.com.cn' }),
				);
				expect(MockSignatureV4).toHaveBeenCalledWith(
					expect.objectContaining({ region: 'cn-north-1' }),
				);
				expect(result.url).toBe('https://s3.cn-north-1.amazonaws.com.cn/');
			});

			it('should handle custom endpoints for China regions', async () => {
				const customEndpoint = 'https://custom.china.endpoint.com.cn';
				const result = await aws.authenticate(
					{ ...chinaCredentials, customEndpoints: true, s3Endpoint: customEndpoint },
					{ ...requestOptions, url: '', baseURL: '', qs: { service: 's3' } },
				);

				expect(mockSmithySignFn).toHaveBeenCalledWith(
					expect.objectContaining({ hostname: 'custom.china.endpoint.com.cn' }),
				);
				expect(result.url).toBe(`${customEndpoint}/`);
			});

			it('should parse China region URLs correctly', async () => {
				const result = await aws.authenticate(chinaCredentials, {
					...requestOptions,
					url: 'https://s3.cn-north-1.amazonaws.com.cn/bucket/key',
					baseURL: '',
				});

				expect(mockSmithySignFn).toHaveBeenCalledWith(
					expect.objectContaining({
						hostname: 's3.cn-north-1.amazonaws.com.cn',
						path: '/bucket/key',
					}),
				);
				expect(MockSignatureV4).toHaveBeenCalledWith(
					expect.objectContaining({ region: 'cn-north-1' }),
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

				expect(mockSmithySignFn).toHaveBeenCalledWith(
					expect.objectContaining({
						hostname: 's3.eu-central-1.amazonaws.com',
					}),
				);
				expect(MockSignatureV4).toHaveBeenCalledWith(
					expect.objectContaining({ region: 'eu-central-1' }),
				);
				expect(result.url).toBe('https://s3.eu-central-1.amazonaws.com/');
			});
		});

		describe('S3 vs non-S3 signer configuration', () => {
			it('configures the signer for S3 with checksum on and path escaping off', async () => {
				await aws.authenticate(credentials, {
					...requestOptions,
					url: '',
					baseURL: '',
					qs: { service: 's3', path: '/my-bucket/my key+v.txt' },
				});

				// S3 needs the x-amz-content-sha256 header (applyChecksum) and must not
				// double-encode object keys (uriEscapePath: false), matching aws4.
				expect(MockSignatureV4).toHaveBeenCalledWith(
					expect.objectContaining({ service: 's3', applyChecksum: true, uriEscapePath: false }),
				);
			});

			it('signs virtual-hosted S3 (<bucket>.s3) under the s3 signing name', async () => {
				// The S3 node builds a `<bucket>.s3.<region>.amazonaws.com` endpoint by
				// passing service `<bucket>.s3`. The signer must still sign as `s3`,
				// otherwise the signature scope uses the bucket name and S3 rejects it.
				await aws.authenticate(credentials, {
					...requestOptions,
					url: '',
					baseURL: '',
					qs: { service: 'my-bucket.s3', path: '/binary.json' },
				});

				expect(MockSignatureV4).toHaveBeenCalledWith(
					expect.objectContaining({ service: 's3', applyChecksum: true, uriEscapePath: false }),
				);
			});

			it('configures the signer for non-S3 with checksum off and path escaping on', async () => {
				await aws.authenticate(credentials, {
					...requestOptions,
					url: '',
					baseURL: '',
					qs: { service: 'sqs' },
				});

				expect(MockSignatureV4).toHaveBeenCalledWith(
					expect.objectContaining({ service: 'sqs', applyChecksum: false, uriEscapePath: true }),
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

				expect(result.body).toBe(objectBody);
			});

			it('should not stringify string body content', async () => {
				const stringBody = 'test string body';
				const result = await aws.authenticate(credentials, {
					...requestOptions,
					body: stringBody,
				});

				expect(result.body).toBe(stringBody);
			});

			it('should not stringify Buffer body content', async () => {
				const bufferBody = Buffer.from('test buffer');
				const result = await aws.authenticate(credentials, {
					...requestOptions,
					body: bufferBody,
				});

				expect(result.body).toBe(bufferBody);
			});

			it('should handle null body content', async () => {
				const result = await aws.authenticate(credentials, {
					...requestOptions,
					body: null,
				});

				expect(result.body).toBe(null);
			});

			it('should handle undefined body content', async () => {
				const result = await aws.authenticate(credentials, {
					...requestOptions,
					body: undefined,
				});

				expect(result.body).toBe(undefined);
			});
		});
	});
});
