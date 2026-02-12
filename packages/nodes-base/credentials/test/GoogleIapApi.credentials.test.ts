import type { ICredentialDataDecryptedObject, IHttpRequestOptions } from 'n8n-workflow';

import { GoogleIapApi } from '../GoogleIapApi.credentials';

// Mock axios
jest.mock('axios', () => jest.fn());

// Sample RSA private key for testing (DO NOT use in production)
const TEST_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7o5IDAhRAVHqW
dDJf4B0xT9LLBuLPtZYv9bVlqGlPjxFxIyqCJGt5CtJmqWKA8oJsLLj7DJKM4d6g
oA6LGx8LHiJFxKCRCPo4x3sVP/mH4ELPI3cFgL7qYzB1g7SzF6pLqEV/qJQKZmMG
9JTtPb1oqWGrjzC7VJKMfGvNZlZNvfVdDfPAGqK0B/TzjPLgfJRqfprJgcSpdEzM
KNLKK5S9QoJP7UdBmvlqQ7ThFPzGPvwLqJwqVgMDH5DGsVaqpGGJV7LGYvwA9N7m
3zBfPvCGh0Gh3zKHLEkOprB2IiI/Q9v0Gx9EgFFEi8VLdBGQl7bY3HLi9xvPbPQZ
qE9NTrXNAgMBAAECggEAHEZa/ZLTPWP0MqZ1aBSZNNI+WxLvYvJZEJI2VGHpEUn+
dJlB7g7P3VLPC0mTmMXG8nMgJg2LCBM0bMPP0k6GW2LJwzPWMDZU6lEFKLKUZmlT
nIjKVnHHrVqJzWlT7GvPPpJ7l2B3cCDxPTnPCJxJrsbDjJzB7OqJ4ZYqPAFFbPbP
p5JVXMC7VvQrw7VT0vpPfWJ0RWPH3MDQJQNK7X7EgFLfJ6sJh7y6BDNY3n7Mc8V3
6JQZP7LpgQWgmZKL7EV8hkP7Fq7sK7n4p7CIy6VJHiREy7mB5FkFHkTxgQRQLN4v
mQBFAgJLgCBHvF1NvbxN3yS9RqHzgV9bHRsrgxYRAQKBgQDwXfF1GAQjvFZKy7FS
L7C8bF7YQqC2i6PoEFnJLPJPJABzPGpGBN2zhKfW3j7FqVELQJ2wqGj7jKPgCdT5
kLj9vqZbGSA7JFqLNJq7QBaWvWx9GcZr1LbCZdVT1BFZZE0r0RA0aXKGrVKl7vny
FJPXS7TY3FiQjbKJB2h/AZ4jAQKBgQDH8RYGpMDTksBLDSpHLMNK8L5FqgFG2CRv
yJgR7i0CBoXX1B/HBRzkhbvYRCJLh0nPqc5tQN6FT1h4xgbC7D3DGwLDkLxvHqNJ
lBv7J8MLLbPKwGm8Xd0dMPBqo4D3E5THRwM7P6M5KVqXMm9VqKVJqnj6aWbY4TLp
WE6+8tzLzQKBgDPHUKv6dwdPT9MJOvfqPr2Z5YAPwMvRpEgEIpypDCkBTjPJt6Fn
S0p8lZvVFHlm5MXqfmVZVLj9gFhx3Ct7T3M3YVg0mBkXQWQJ9DEV3aQPFYbJC2Dv
qNLT3Y2u6nGVVo4xJqM2qZqJh5xJpZJK3TqGGrYb8iFGzl+BFQM0m5ABAoGAFCqv
N0L5LDC7P8Kl0jvPrFcl7xvVc6MLH8T0b0FeLlKBHJTnPHlK3VqqFCJgJGLl1g6l
8b8rOE0qWjZL/qJqNB9J2mcHqSNQl7HLhH5TZrGxYH8CqkA2Mzv2Dgl2DqKHJpLG
vXJJKKnkO7M3zPNq3LdXJRHWxrYi+gXkjBNKJZECgYEAqKP6M8E3m9u7MEvn3Cmj
N0vKqFEy5RqLNvMm7x9xC5LqDzR7WvHQHLqPFfC7IkuKdHPJE3gVqMy8PK5dCBre
QwSJp3V3NF1GxHl6x3V9K8QFz5dTlvPRJmvQE0KqJZ7Xq2W2nW3xQquqLJN5AqLF
yJqZG7H5VQvPy3N7mLsJT0s=
-----END PRIVATE KEY-----`;

describe('GoogleIapApi Credential', () => {
	const googleIapApi = new GoogleIapApi();
	let mockAxios: jest.Mock;

	beforeEach(() => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		mockAxios = require('axios') as jest.Mock;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should have correct properties', () => {
		expect(googleIapApi.name).toBe('googleIapApi');
		expect(googleIapApi.displayName).toBe('Google IAP (Identity-Aware Proxy) API');
		expect(googleIapApi.documentationUrl).toBe('google/service-account');
		expect(googleIapApi.properties).toHaveLength(5);

		// Verify IAP Client ID field exists
		const iapClientIdProp = googleIapApi.properties.find((p) => p.name === 'iapClientId');
		expect(iapClientIdProp).toBeDefined();
		expect(iapClientIdProp?.required).toBe(true);
	});

	describe('authenticate', () => {
		it('should exchange JWT for IAP token and add Authorization header', async () => {
			const mockIdToken = 'mock-iap-id-token-12345';

			mockAxios.mockResolvedValue({
				data: {
					id_token: mockIdToken,
					token_type: 'Bearer',
					expires_in: 3600,
				},
			});

			const credentials: ICredentialDataDecryptedObject = {
				email: 'test-sa@project.iam.gserviceaccount.com',
				privateKey: TEST_PRIVATE_KEY,
				iapClientId: '123456789.apps.googleusercontent.com',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {},
				url: '/api/data',
				baseURL: 'https://my-iap-protected-app.example.com',
			};

			const result = await googleIapApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				Authorization: `Bearer ${mockIdToken}`,
			});

			// Verify axios was called with correct parameters
			expect(mockAxios).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'POST',
					url: 'https://oauth2.googleapis.com/token',
				}),
			);
		});

		it('should preserve existing headers', async () => {
			const mockIdToken = 'mock-iap-id-token-preserve';

			mockAxios.mockResolvedValue({
				data: {
					id_token: mockIdToken,
					token_type: 'Bearer',
					expires_in: 3600,
				},
			});

			const credentials: ICredentialDataDecryptedObject = {
				email: 'test-sa@project.iam.gserviceaccount.com',
				privateKey: TEST_PRIVATE_KEY,
				iapClientId: '123456789.apps.googleusercontent.com',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {
					'X-Custom-Header': 'custom-value',
					'Content-Type': 'application/json',
				},
				url: '/api/data',
				baseURL: 'https://my-iap-protected-app.example.com',
			};

			const result = await googleIapApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				'X-Custom-Header': 'custom-value',
				'Content-Type': 'application/json',
				Authorization: `Bearer ${mockIdToken}`,
			});
		});

		it('should use delegated email when impersonating', async () => {
			const mockIdToken = 'mock-iap-id-token-delegate';

			mockAxios.mockResolvedValue({
				data: {
					id_token: mockIdToken,
					token_type: 'Bearer',
					expires_in: 3600,
				},
			});

			const credentials: ICredentialDataDecryptedObject = {
				email: 'test-sa@project.iam.gserviceaccount.com',
				privateKey: TEST_PRIVATE_KEY,
				iapClientId: '123456789.apps.googleusercontent.com',
				inpersonate: true,
				delegatedEmail: 'user@example.com',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {},
				url: '/api/data',
				baseURL: 'https://my-iap-protected-app.example.com',
			};

			const result = await googleIapApi.authenticate(credentials, requestOptions);

			expect(result.headers).toEqual({
				Authorization: `Bearer ${mockIdToken}`,
			});

			// Verify the JWT assertion was created - extract and decode it
			const axiosCall = mockAxios.mock.calls[0][0];
			const requestData = axiosCall.data as string;

			// Verify grant_type is correct for JWT bearer
			expect(requestData).toContain(
				'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer',
			);

			// Extract the JWT assertion from the request
			const assertionMatch = requestData.match(/assertion=([^&]+)/);
			expect(assertionMatch).toBeTruthy();

			// Decode the JWT payload (base64url decode the middle part)
			const jwtParts = assertionMatch![1].split('.');
			const payload = JSON.parse(Buffer.from(jwtParts[1], 'base64url').toString());

			// Verify the JWT contains the delegated email as 'sub'
			expect(payload.sub).toBe('user@example.com');
			expect(payload.iss).toBe('test-sa@project.iam.gserviceaccount.com');
			expect(payload.target_audience).toBe('123456789.apps.googleusercontent.com');
			expect(payload.aud).toBe('https://oauth2.googleapis.com/token');
		});

		it('should include target_audience in JWT for IAP authentication', async () => {
			const mockIdToken = 'mock-iap-id-token';

			mockAxios.mockResolvedValue({
				data: {
					id_token: mockIdToken,
					token_type: 'Bearer',
					expires_in: 3600,
				},
			});

			const credentials: ICredentialDataDecryptedObject = {
				email: 'test-sa@project.iam.gserviceaccount.com',
				privateKey: TEST_PRIVATE_KEY,
				iapClientId: 'my-iap-client.apps.googleusercontent.com',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {},
				url: '/api/data',
				baseURL: 'https://my-iap-protected-app.example.com',
			};

			await googleIapApi.authenticate(credentials, requestOptions);

			// Extract and verify the JWT payload
			const axiosCall = mockAxios.mock.calls[0][0];
			const requestData = axiosCall.data as string;
			const assertionMatch = requestData.match(/assertion=([^&]+)/);
			const jwtParts = assertionMatch![1].split('.');
			const payload = JSON.parse(Buffer.from(jwtParts[1], 'base64url').toString());

			// Key difference from standard OAuth: target_audience instead of scope
			expect(payload.target_audience).toBe('my-iap-client.apps.googleusercontent.com');
			expect(payload.scope).toBeUndefined();
		});

		it('should throw error when Google OAuth returns an error', async () => {
			mockAxios.mockRejectedValue(new Error('Invalid JWT'));

			const credentials: ICredentialDataDecryptedObject = {
				email: 'test-sa@project.iam.gserviceaccount.com',
				privateKey: TEST_PRIVATE_KEY,
				iapClientId: '123456789.apps.googleusercontent.com',
			};

			const requestOptions: IHttpRequestOptions = {
				headers: {},
				url: '/api/data',
				baseURL: 'https://my-iap-protected-app.example.com',
			};

			await expect(googleIapApi.authenticate(credentials, requestOptions)).rejects.toThrow(
				'Invalid JWT',
			);
		});
	});
});
