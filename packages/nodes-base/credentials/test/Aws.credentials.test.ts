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
			credentialType: 'iam',
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

		it('should throw error if accessKeyId is missing for IAM credentials', async () => {
			await expect(
				aws.authenticate(
					{
						...credentials,
						accessKeyId: '',
					},
					requestOptions,
				),
			).rejects.toThrow('Access Key ID is required for IAM credentials.');
		});

		it('should throw error if secretAccessKey is missing for IAM credentials', async () => {
			await expect(
				aws.authenticate(
					{
						...credentials,
						secretAccessKey: '',
					},
					requestOptions,
				),
			).rejects.toThrow('Secret Access Key is required for IAM credentials.');
		});

		it('should work with backward compatibility (no credentialType field)', async () => {
			// Create credentials without credentialType field to simulate old credentials
			const { credentialType, ...oldCredentials } = credentials;
			const result = await aws.authenticate(oldCredentials as AwsCredentialsType, requestOptions);

			expect(mockSign).toHaveBeenCalledWith(signOpts, securityHeaders);

			expect(result.method).toBe('POST');
			expect(result.url).toBe(
				'https://sts.eu-central-1.amazonaws.com/?Action=GetCallerIdentity&Version=2011-06-15',
			);
		});

		it('should work with backward compatibility (assumeRole field)', async () => {
			// Create credentials with assumeRole field to simulate old role assumption credentials
			const oldCredentials = {
				...credentials,
				assumeRole: true,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'test-external-id',
				roleSessionName: 'test-session',
			};
			delete oldCredentials.credentialType;

			// Mock system credentials for the STS call
			const originalEnv = process.env;
			process.env = {
				...originalEnv,
				AWS_ACCESS_KEY_ID: 'system-access-key',
				AWS_SECRET_ACCESS_KEY: 'system-secret-key',
			};

			const mockStsResponse = {
				ok: true,
				text: () =>
					Promise.resolve(`
					<AssumeRoleResponse>
						<AssumeRoleResult>
							<Credentials>
								<AccessKeyId>assumed-access-key</AccessKeyId>
								<SecretAccessKey>assumed-secret-key</SecretAccessKey>
								<SessionToken>assumed-session-token</SessionToken>
							</Credentials>
						</AssumeRoleResult>
					</AssumeRoleResponse>
				`),
			};

			// Mock fetch for role assumption
			global.fetch = jest.fn().mockResolvedValue(mockStsResponse);

			const result = await aws.authenticate(oldCredentials as AwsCredentialsType, requestOptions);

			// Check that the final sign call uses the assumed credentials
			expect(mockSign).toHaveBeenCalledTimes(2);
			const lastCall = mockSign.mock.calls[1];
			expect(lastCall[1]).toMatchObject({
				accessKeyId: 'assumed-access-key',
				secretAccessKey: 'assumed-secret-key',
				sessionToken: 'assumed-session-token',
			});

			process.env = originalEnv;
		});

		it('should assume role with system credentials when useSystemCredentialsForRole is true', async () => {
			const roleCredentials: AwsCredentialsType = {
				region: 'eu-central-1',
				credentialType: 'assumeRole',
				accessKeyId: '', // Not used for role assumption
				secretAccessKey: '', // Not used for role assumption
				temporaryCredentials: false,
				customEndpoints: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'test-external-id',
				roleSessionName: 'test-session',
				useSystemCredentialsForRole: true,
			};

			// Mock system credentials for the STS call
			const originalEnv = process.env;
			process.env = {
				...originalEnv,
				AWS_ACCESS_KEY_ID: 'system-access-key',
				AWS_SECRET_ACCESS_KEY: 'system-secret-key',
			};

			const mockStsResponse = {
				ok: true,
				text: () =>
					Promise.resolve(`
					<AssumeRoleResponse>
						<AssumeRoleResult>
							<Credentials>
								<AccessKeyId>assumed-access-key</AccessKeyId>
								<SecretAccessKey>assumed-secret-key</SecretAccessKey>
								<SessionToken>assumed-session-token</SessionToken>
							</Credentials>
						</AssumeRoleResult>
					</AssumeRoleResponse>
				`),
			};

			// Mock fetch for role assumption
			global.fetch = jest.fn().mockResolvedValue(mockStsResponse);

			const result = await aws.authenticate(roleCredentials, requestOptions);

			// Check that the final sign call uses the assumed credentials
			expect(mockSign).toHaveBeenCalledTimes(2);
			const lastCall = mockSign.mock.calls[1];
			expect(lastCall[1]).toMatchObject({
				accessKeyId: 'assumed-access-key',
				secretAccessKey: 'assumed-secret-key',
				sessionToken: 'assumed-session-token',
			});

			process.env = originalEnv;
		});

		it('should assume role with manual STS credentials when useSystemCredentialsForRole is false', async () => {
			const roleCredentials: AwsCredentialsType = {
				region: 'eu-central-1',
				credentialType: 'assumeRole',
				accessKeyId: '', // Not used for role assumption
				secretAccessKey: '', // Not used for role assumption
				temporaryCredentials: false,
				customEndpoints: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'test-external-id',
				roleSessionName: 'test-session',
				useSystemCredentialsForRole: false,
				temporaryStsCredentials: false, // Not using temporary STS credentials
				stsAccessKeyId: 'sts-access-key',
				stsSecretAccessKey: 'sts-secret-key',
				// stsSessionToken is not shown when temporaryStsCredentials is false
			};

			const mockStsResponse = {
				ok: true,
				text: () =>
					Promise.resolve(`
					<AssumeRoleResponse>
						<AssumeRoleResult>
							<Credentials>
								<AccessKeyId>assumed-access-key</AccessKeyId>
								<SecretAccessKey>assumed-secret-key</SecretAccessKey>
								<SessionToken>assumed-session-token</SessionToken>
							</Credentials>
						</AssumeRoleResult>
					</AssumeRoleResponse>
				`),
			};

			// Mock fetch for role assumption
			global.fetch = jest.fn().mockResolvedValue(mockStsResponse);

			const result = await aws.authenticate(roleCredentials, requestOptions);

			// Check that the final sign call uses the assumed credentials
			expect(mockSign).toHaveBeenCalledTimes(2);
			const lastCall = mockSign.mock.calls[1];
			expect(lastCall[1]).toMatchObject({
				accessKeyId: 'assumed-access-key',
				secretAccessKey: 'assumed-secret-key',
				sessionToken: 'assumed-session-token',
			});
		});

		it('should assume role with manual STS credentials including session token when temporaryStsCredentials is true', async () => {
			const roleCredentials: AwsCredentialsType = {
				region: 'eu-central-1',
				credentialType: 'assumeRole',
				accessKeyId: '', // Not used for role assumption
				secretAccessKey: '', // Not used for role assumption
				temporaryCredentials: false,
				customEndpoints: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'test-external-id',
				roleSessionName: 'test-session',
				useSystemCredentialsForRole: false,
				temporaryStsCredentials: true, // Using temporary STS credentials
				stsAccessKeyId: 'sts-access-key',
				stsSecretAccessKey: 'sts-secret-key',
				stsSessionToken: 'sts-session-token', // Session token is shown when temporaryStsCredentials is true
			};

			const mockStsResponse = {
				ok: true,
				text: () =>
					Promise.resolve(`
					<AssumeRoleResponse>
						<AssumeRoleResult>
							<Credentials>
								<AccessKeyId>assumed-access-key</AccessKeyId>
								<SecretAccessKey>assumed-secret-key</SecretAccessKey>
								<SessionToken>assumed-session-token</SessionToken>
							</Credentials>
						</AssumeRoleResult>
					</AssumeRoleResponse>
				`),
			};

			// Mock fetch for role assumption
			global.fetch = jest.fn().mockResolvedValue(mockStsResponse);

			const result = await aws.authenticate(roleCredentials, requestOptions);

			// Check that the final sign call uses the assumed credentials
			expect(mockSign).toHaveBeenCalledTimes(2);
			const lastCall = mockSign.mock.calls[1];
			expect(lastCall[1]).toMatchObject({
				accessKeyId: 'assumed-access-key',
				secretAccessKey: 'assumed-secret-key',
				sessionToken: 'assumed-session-token',
			});
		});

		it('should work with backward compatibility (no temporaryStsCredentials field)', async () => {
			const roleCredentials: AwsCredentialsType = {
				region: 'eu-central-1',
				credentialType: 'assumeRole',
				accessKeyId: '',
				secretAccessKey: '',
				temporaryCredentials: false,
				customEndpoints: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'test-external-id',
				roleSessionName: 'test-session',
				useSystemCredentialsForRole: false,
				// temporaryStsCredentials field is missing (backward compatibility)
				stsAccessKeyId: 'sts-access-key',
				stsSecretAccessKey: 'sts-secret-key',
				stsSessionToken: 'sts-session-token', // This should be ignored when temporaryStsCredentials is not set
			};

			const mockStsResponse = {
				ok: true,
				text: () =>
					Promise.resolve(`
					<AssumeRoleResponse>
						<AssumeRoleResult>
							<Credentials>
								<AccessKeyId>assumed-access-key</AccessKeyId>
								<SecretAccessKey>assumed-secret-key</SecretAccessKey>
								<SessionToken>assumed-session-token</SessionToken>
							</Credentials>
						</AssumeRoleResult>
					</AssumeRoleResponse>
				`),
			};

			// Mock fetch for role assumption
			global.fetch = jest.fn().mockResolvedValue(mockStsResponse);

			const result = await aws.authenticate(roleCredentials, requestOptions);

			// Check that the final sign call uses the assumed credentials
			expect(mockSign).toHaveBeenCalledTimes(2);
			const lastCall = mockSign.mock.calls[1];
			expect(lastCall[1]).toMatchObject({
				accessKeyId: 'assumed-access-key',
				secretAccessKey: 'assumed-secret-key',
				sessionToken: 'assumed-session-token',
			});
		});

		it('should throw error when role assumption fails', async () => {
			const roleCredentials: AwsCredentialsType = {
				region: 'eu-central-1',
				credentialType: 'assumeRole',
				accessKeyId: '',
				secretAccessKey: '',
				temporaryCredentials: false,
				customEndpoints: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'test-external-id',
				roleSessionName: 'test-session',
				useSystemCredentialsForRole: true,
			};

			// Mock system credentials for the STS call
			const originalEnv = process.env;
			process.env = {
				...originalEnv,
				AWS_ACCESS_KEY_ID: 'system-access-key',
				AWS_SECRET_ACCESS_KEY: 'system-secret-key',
			};

			const mockStsResponse = {
				ok: false,
				status: 403,
				statusText: 'Forbidden',
				text: () => Promise.resolve('<Error><Message>Access Denied</Message></Error>'),
			};

			// Mock fetch for role assumption
			global.fetch = jest.fn().mockResolvedValue(mockStsResponse);

			await expect(aws.authenticate(roleCredentials, requestOptions)).rejects.toThrow(
				'STS AssumeRole failed: 403 Forbidden',
			);

			process.env = originalEnv;
		});

		it('should throw error if roleArn is missing for role assumption', async () => {
			const roleCredentials: AwsCredentialsType = {
				region: 'eu-central-1',
				credentialType: 'assumeRole',
				accessKeyId: '',
				secretAccessKey: '',
				temporaryCredentials: false,
				customEndpoints: false,
				externalId: 'test-external-id',
				roleSessionName: 'test-session',
				useSystemCredentialsForRole: true,
			};

			await expect(aws.authenticate(roleCredentials, requestOptions)).rejects.toThrow(
				'Role ARN is required when assuming a role.',
			);
		});

		it('should throw error if externalId is missing for role assumption', async () => {
			const roleCredentials: AwsCredentialsType = {
				region: 'eu-central-1',
				credentialType: 'assumeRole',
				accessKeyId: '',
				secretAccessKey: '',
				temporaryCredentials: false,
				customEndpoints: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				roleSessionName: 'test-session',
				useSystemCredentialsForRole: true,
			};

			await expect(aws.authenticate(roleCredentials, requestOptions)).rejects.toThrow(
				'External ID is required when assuming a role.',
			);
		});

		it('should throw error if roleSessionName is missing for role assumption', async () => {
			const roleCredentials: AwsCredentialsType = {
				region: 'eu-central-1',
				credentialType: 'assumeRole',
				accessKeyId: '',
				secretAccessKey: '',
				temporaryCredentials: false,
				customEndpoints: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'test-external-id',
				useSystemCredentialsForRole: true,
			};

			await expect(aws.authenticate(roleCredentials, requestOptions)).rejects.toThrow(
				'Role Session Name is required when assuming a role.',
			);
		});

		it('should throw error if STS credentials are missing when not using system credentials', async () => {
			const roleCredentials: AwsCredentialsType = {
				region: 'eu-central-1',
				credentialType: 'assumeRole',
				accessKeyId: '',
				secretAccessKey: '',
				temporaryCredentials: false,
				customEndpoints: false,
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'test-external-id',
				roleSessionName: 'test-session',
				useSystemCredentialsForRole: false,
				// Missing STS credentials
			};

			await expect(aws.authenticate(roleCredentials, requestOptions)).rejects.toThrow(
				'STS Access Key ID is required when not using system credentials.',
			);
		});

		describe('Backward Compatibility Tests', () => {
			it('should work with legacy credentials (no credentialType, no assumeRole)', async () => {
				// Simulate the oldest possible credential format
				const legacyCredentials = {
					region: 'eu-central-1',
					accessKeyId: 'hakuna',
					secretAccessKey: 'matata',
					temporaryCredentials: false,
					customEndpoints: false,
					// No credentialType, no assumeRole, no role fields
				} as AwsCredentialsType;

				const result = await aws.authenticate(legacyCredentials, requestOptions);

				expect(mockSign).toHaveBeenCalledWith(signOpts, securityHeaders);
				expect(result.method).toBe('POST');
				expect(result.url).toBe(
					'https://sts.eu-central-1.amazonaws.com/?Action=GetCallerIdentity&Version=2011-06-15',
				);
			});

			it('should work with legacy credentials with temporary credentials', async () => {
				// Simulate legacy credentials with temporary credentials
				const legacyCredentials = {
					region: 'eu-central-1',
					accessKeyId: 'hakuna',
					secretAccessKey: 'matata',
					temporaryCredentials: true,
					sessionToken: 'legacy-session-token',
					customEndpoints: false,
					// No credentialType, no assumeRole, no role fields
				} as AwsCredentialsType;

				const result = await aws.authenticate(legacyCredentials, requestOptions);

				expect(mockSign).toHaveBeenCalledWith(signOpts, {
					...securityHeaders,
					sessionToken: 'legacy-session-token',
				});
				expect(result.method).toBe('POST');
				expect(result.url).toBe(
					'https://sts.eu-central-1.amazonaws.com/?Action=GetCallerIdentity&Version=2011-06-15',
				);
			});

			it('should work with legacy role assumption (assumeRole: true, no credentialType)', async () => {
				// Simulate legacy role assumption format
				const legacyRoleCredentials = {
					region: 'eu-central-1',
					accessKeyId: '', // Not used for role assumption
					secretAccessKey: '', // Not used for role assumption
					temporaryCredentials: false,
					customEndpoints: false,
					assumeRole: true, // Legacy field
					roleArn: 'arn:aws:iam::123456789012:role/TestRole',
					externalId: 'test-external-id',
					roleSessionName: 'test-session',
					// No credentialType, no useSystemCredentialsForRole (should default to true)
				} as AwsCredentialsType;

				// Mock system credentials for the STS call
				const originalEnv = process.env;
				process.env = {
					...originalEnv,
					AWS_ACCESS_KEY_ID: 'system-access-key',
					AWS_SECRET_ACCESS_KEY: 'system-secret-key',
				};

				const mockStsResponse = {
					ok: true,
					text: () =>
						Promise.resolve(`
						<AssumeRoleResponse>
							<AssumeRoleResult>
								<Credentials>
									<AccessKeyId>assumed-access-key</AccessKeyId>
									<SecretAccessKey>assumed-secret-key</SecretAccessKey>
									<SessionToken>assumed-session-token</SessionToken>
								</Credentials>
							</AssumeRoleResult>
						</AssumeRoleResponse>
					`),
				};

				global.fetch = jest.fn().mockResolvedValue(mockStsResponse);

				const result = await aws.authenticate(legacyRoleCredentials, requestOptions);

				expect(mockSign).toHaveBeenCalledTimes(2);
				const lastCall = mockSign.mock.calls[1];
				expect(lastCall[1]).toMatchObject({
					accessKeyId: 'assumed-access-key',
					secretAccessKey: 'assumed-secret-key',
					sessionToken: 'assumed-session-token',
				});

				process.env = originalEnv;
			});

			it('should work with legacy role assumption with manual STS credentials', async () => {
				// Simulate legacy role assumption with manual STS credentials
				const legacyRoleCredentials = {
					region: 'eu-central-1',
					accessKeyId: '', // Not used for role assumption
					secretAccessKey: '', // Not used for role assumption
					temporaryCredentials: false,
					customEndpoints: false,
					assumeRole: true, // Legacy field
					roleArn: 'arn:aws:iam::123456789012:role/TestRole',
					externalId: 'test-external-id',
					roleSessionName: 'test-session',
					useSystemCredentialsForRole: false, // Use manual STS credentials
					// No temporaryStsCredentials (should default to false)
					stsAccessKeyId: 'sts-access-key',
					stsSecretAccessKey: 'sts-secret-key',
					stsSessionToken: 'sts-session-token', // Should be ignored when temporaryStsCredentials is not set
				} as AwsCredentialsType;

				const mockStsResponse = {
					ok: true,
					text: () =>
						Promise.resolve(`
						<AssumeRoleResponse>
							<AssumeRoleResult>
								<Credentials>
									<AccessKeyId>assumed-access-key</AccessKeyId>
									<SecretAccessKey>assumed-secret-key</SecretAccessKey>
									<SessionToken>assumed-session-token</SessionToken>
								</Credentials>
							</AssumeRoleResult>
						</AssumeRoleResponse>
					`),
				};

				global.fetch = jest.fn().mockResolvedValue(mockStsResponse);

				const result = await aws.authenticate(legacyRoleCredentials, requestOptions);

				expect(mockSign).toHaveBeenCalledTimes(2);
				const lastCall = mockSign.mock.calls[1];
				expect(lastCall[1]).toMatchObject({
					accessKeyId: 'assumed-access-key',
					secretAccessKey: 'assumed-secret-key',
					sessionToken: 'assumed-session-token',
				});
			});

			it('should work with legacy role assumption with temporary STS credentials', async () => {
				// Simulate legacy role assumption with temporary STS credentials
				const legacyRoleCredentials = {
					region: 'eu-central-1',
					accessKeyId: '', // Not used for role assumption
					secretAccessKey: '', // Not used for role assumption
					temporaryCredentials: false,
					customEndpoints: false,
					assumeRole: true, // Legacy field
					roleArn: 'arn:aws:iam::123456789012:role/TestRole',
					externalId: 'test-external-id',
					roleSessionName: 'test-session',
					useSystemCredentialsForRole: false, // Use manual STS credentials
					temporaryStsCredentials: true, // Use temporary STS credentials
					stsAccessKeyId: 'sts-access-key',
					stsSecretAccessKey: 'sts-secret-key',
					stsSessionToken: 'sts-session-token', // Should be used when temporaryStsCredentials is true
				} as AwsCredentialsType;

				const mockStsResponse = {
					ok: true,
					text: () =>
						Promise.resolve(`
						<AssumeRoleResponse>
							<AssumeRoleResult>
								<Credentials>
									<AccessKeyId>assumed-access-key</AccessKeyId>
									<SecretAccessKey>assumed-secret-key</SecretAccessKey>
									<SessionToken>assumed-session-token</SessionToken>
								</Credentials>
							</AssumeRoleResult>
						</AssumeRoleResponse>
					`),
				};

				global.fetch = jest.fn().mockResolvedValue(mockStsResponse);

				const result = await aws.authenticate(legacyRoleCredentials, requestOptions);

				expect(mockSign).toHaveBeenCalledTimes(2);
				const lastCall = mockSign.mock.calls[1];
				expect(lastCall[1]).toMatchObject({
					accessKeyId: 'assumed-access-key',
					secretAccessKey: 'assumed-secret-key',
					sessionToken: 'assumed-session-token',
				});
			});

			it('should work with mixed legacy and new fields', async () => {
				// Simulate credentials with some legacy and some new fields
				const mixedCredentials = {
					region: 'eu-central-1',
					accessKeyId: 'hakuna',
					secretAccessKey: 'matata',
					temporaryCredentials: true,
					sessionToken: 'mixed-session-token',
					customEndpoints: false,
					credentialType: 'iam', // New field
					// No assumeRole field (legacy)
					// No role fields (legacy)
				} as AwsCredentialsType;

				const result = await aws.authenticate(mixedCredentials, requestOptions);

				expect(mockSign).toHaveBeenCalledWith(signOpts, {
					...securityHeaders,
					sessionToken: 'mixed-session-token',
				});
				expect(result.method).toBe('POST');
				expect(result.url).toBe(
					'https://sts.eu-central-1.amazonaws.com/?Action=GetCallerIdentity&Version=2011-06-15',
				);
			});

			it('should work with new format but missing optional fields', async () => {
				// Simulate new format credentials with missing optional fields
				const newFormatCredentials = {
					region: 'eu-central-1',
					credentialType: 'assumeRole', // New field
					accessKeyId: '', // Not used for role assumption
					secretAccessKey: '', // Not used for role assumption
					temporaryCredentials: false,
					customEndpoints: false,
					roleArn: 'arn:aws:iam::123456789012:role/TestRole',
					externalId: 'test-external-id',
					roleSessionName: 'test-session',
					// No assumeRole field (new format)
					// No useSystemCredentialsForRole (should default to true)
					// No temporaryStsCredentials (should default to false)
					// No STS credential fields (should use system credentials)
				} as AwsCredentialsType;

				// Mock system credentials for the STS call
				const originalEnv = process.env;
				process.env = {
					...originalEnv,
					AWS_ACCESS_KEY_ID: 'system-access-key',
					AWS_SECRET_ACCESS_KEY: 'system-secret-key',
				};

				const mockStsResponse = {
					ok: true,
					text: () =>
						Promise.resolve(`
						<AssumeRoleResponse>
							<AssumeRoleResult>
								<Credentials>
									<AccessKeyId>assumed-access-key</AccessKeyId>
									<SecretAccessKey>assumed-secret-key</SecretAccessKey>
									<SessionToken>assumed-session-token</SessionToken>
								</Credentials>
							</AssumeRoleResult>
						</AssumeRoleResponse>
					`),
				};

				global.fetch = jest.fn().mockResolvedValue(mockStsResponse);

				const result = await aws.authenticate(newFormatCredentials, requestOptions);

				expect(mockSign).toHaveBeenCalledTimes(2);
				const lastCall = mockSign.mock.calls[1];
				expect(lastCall[1]).toMatchObject({
					accessKeyId: 'assumed-access-key',
					secretAccessKey: 'assumed-secret-key',
					sessionToken: 'assumed-session-token',
				});

				process.env = originalEnv;
			});

			it('should handle empty string values in legacy fields', async () => {
				// Simulate legacy credentials with empty string values
				const legacyCredentialsWithEmptyStrings = {
					region: 'eu-central-1',
					accessKeyId: 'hakuna',
					secretAccessKey: 'matata',
					temporaryCredentials: false,
					sessionToken: '', // Empty string
					customEndpoints: false,
					assumeRole: false, // Explicitly false
					roleArn: '', // Empty string
					externalId: '', // Empty string
					roleSessionName: '', // Empty string
					// No credentialType field
				} as AwsCredentialsType;

				const result = await aws.authenticate(legacyCredentialsWithEmptyStrings, requestOptions);

				expect(mockSign).toHaveBeenCalledWith(signOpts, securityHeaders);
				expect(result.method).toBe('POST');
				expect(result.url).toBe(
					'https://sts.eu-central-1.amazonaws.com/?Action=GetCallerIdentity&Version=2011-06-15',
				);
			});

			it('should handle undefined values in legacy fields', async () => {
				// Simulate legacy credentials with undefined values
				const legacyCredentialsWithUndefined = {
					region: 'eu-central-1',
					accessKeyId: 'hakuna',
					secretAccessKey: 'matata',
					temporaryCredentials: false,
					sessionToken: undefined, // Undefined
					customEndpoints: false,
					assumeRole: undefined, // Undefined
					roleArn: undefined, // Undefined
					externalId: undefined, // Undefined
					roleSessionName: undefined, // Undefined
					// No credentialType field
				} as AwsCredentialsType;

				const result = await aws.authenticate(legacyCredentialsWithUndefined, requestOptions);

				expect(mockSign).toHaveBeenCalledWith(signOpts, securityHeaders);
				expect(result.method).toBe('POST');
				expect(result.url).toBe(
					'https://sts.eu-central-1.amazonaws.com/?Action=GetCallerIdentity&Version=2011-06-15',
				);
			});

			it('should handle null values in legacy fields', async () => {
				// Simulate legacy credentials with null values
				const legacyCredentialsWithNull = {
					region: 'eu-central-1',
					accessKeyId: 'hakuna',
					secretAccessKey: 'matata',
					temporaryCredentials: false,
					sessionToken: null as any, // Null
					customEndpoints: false,
					assumeRole: null as any, // Null
					roleArn: null as any, // Null
					externalId: null as any, // Null
					roleSessionName: null as any, // Null
					// No credentialType field
				} as AwsCredentialsType;

				const result = await aws.authenticate(legacyCredentialsWithNull, requestOptions);

				expect(mockSign).toHaveBeenCalledWith(signOpts, securityHeaders);
				expect(result.method).toBe('POST');
				expect(result.url).toBe(
					'https://sts.eu-central-1.amazonaws.com/?Action=GetCallerIdentity&Version=2011-06-15',
				);
			});
		});
	});
});
