import { generateKeyPairSync, createPublicKey, createVerify } from 'crypto';

import type { IHttpRequestOptions } from 'n8n-workflow';

import { GoogleIapApi } from '../GoogleIapApi.credentials';

// Generate RSA key pair dynamically for testing
const { privateKey: TEST_PRIVATE_KEY, publicKey: TEST_PUBLIC_KEY } = generateKeyPairSync('rsa', {
	modulusLength: 2048,
	privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
	publicKeyEncoding: { type: 'spki', format: 'pem' },
});

// Mock axios with proper default export structure
jest.mock('axios', () => {
	const mockFn = jest.fn();
	return {
		__esModule: true,
		default: mockFn,
	};
});

import axios from 'axios';

const mockAxios = axios as jest.MockedFunction<typeof axios>;

// Helper to extract and parse JWT from request data
function extractJwtFromRequest(requestData: string): {
	header: Record<string, unknown>;
	payload: Record<string, unknown>;
	signature: string;
	raw: string;
} {
	const params = new URLSearchParams(requestData);
	const assertion = params.get('assertion');
	if (!assertion) throw new Error('No assertion found in request data');

	const parts = assertion.split('.');
	if (parts.length !== 3) throw new Error('Invalid JWT format');

	return {
		header: JSON.parse(Buffer.from(parts[0], 'base64url').toString()),
		payload: JSON.parse(Buffer.from(parts[1], 'base64url').toString()),
		signature: parts[2],
		raw: assertion,
	};
}

// Helper to verify JWT signature
function verifyJwtSignature(jwt: string, publicKey: string): boolean {
	const parts = jwt.split('.');
	const signedContent = `${parts[0]}.${parts[1]}`;
	const signature = Buffer.from(parts[2], 'base64url');

	const verify = createVerify('RSA-SHA256');
	verify.update(signedContent);
	return verify.verify(createPublicKey(publicKey), signature);
}

describe('GoogleIapApi', () => {
	let googleIapApi: GoogleIapApi;

	beforeEach(() => {
		googleIapApi = new GoogleIapApi();
		jest.clearAllMocks();
	});

	describe('credential properties', () => {
		it('should have correct name and displayName', () => {
			expect(googleIapApi.name).toBe('googleIapApi');
			expect(googleIapApi.displayName).toBe('Google IAP (Identity-Aware Proxy) API');
		});

		it('should have required properties', () => {
			const propertyNames = googleIapApi.properties.map((p) => p.name);
			expect(propertyNames).toContain('email');
			expect(propertyNames).toContain('privateKey');
			expect(propertyNames).toContain('iapClientId');
		});
	});

	describe('authenticate', () => {
		const baseCredentials = {
			email: 'test-sa@project.iam.gserviceaccount.com',
			privateKey: TEST_PRIVATE_KEY,
			iapClientId: '123456789.apps.googleusercontent.com',
		};

		const baseRequestOptions: IHttpRequestOptions = {
			url: 'https://my-iap-protected-app.com/api',
			method: 'GET',
		};

		it('should exchange JWT for IAP token and add Authorization header', async () => {
			mockAxios.mockResolvedValueOnce({
				data: { id_token: 'mock-iap-id-token' },
			});

			const result = await googleIapApi.authenticate(baseCredentials, baseRequestOptions);

			expect(mockAxios).toHaveBeenCalledTimes(1);
			expect(result.headers).toHaveProperty('Authorization', 'Bearer mock-iap-id-token');
		});

		it('should preserve existing headers', async () => {
			mockAxios.mockResolvedValueOnce({
				data: { id_token: 'mock-iap-id-token' },
			});

			const requestWithHeaders: IHttpRequestOptions = {
				...baseRequestOptions,
				headers: { 'X-Custom-Header': 'custom-value' },
			};

			const result = await googleIapApi.authenticate(baseCredentials, requestWithHeaders);

			expect(result.headers).toHaveProperty('X-Custom-Header', 'custom-value');
			expect(result.headers).toHaveProperty('Authorization', 'Bearer mock-iap-id-token');
		});

		it('should use delegated email when impersonating', async () => {
			mockAxios.mockResolvedValueOnce({
				data: { id_token: 'mock-iap-id-token' },
			});

			const credentialsWithDelegation = {
				...baseCredentials,
				impersonate: true,
				delegatedEmail: 'user@example.com',
			};

			await googleIapApi.authenticate(credentialsWithDelegation, baseRequestOptions);

			// Extract JWT using URLSearchParams (more robust than regex)
			const axiosCall = mockAxios.mock.calls[0][0] as unknown as { data: string };
			const jwt = extractJwtFromRequest(axiosCall.data);

			// Verify the JWT contains the delegated email as 'sub'
			expect(jwt.payload.sub).toBe('user@example.com');
			expect(jwt.payload.iss).toBe('test-sa@project.iam.gserviceaccount.com');
			expect(jwt.payload.target_audience).toBe('123456789.apps.googleusercontent.com');

			// Verify JWT signature is valid
			expect(verifyJwtSignature(jwt.raw, TEST_PUBLIC_KEY)).toBe(true);
		});

		it('should use service account email as sub when not impersonating', async () => {
			mockAxios.mockResolvedValueOnce({
				data: { id_token: 'mock-iap-id-token' },
			});

			// No delegatedEmail set
			await googleIapApi.authenticate(baseCredentials, baseRequestOptions);

			const axiosCall = mockAxios.mock.calls[0][0] as unknown as { data: string };
			const jwt = extractJwtFromRequest(axiosCall.data);

			// When not impersonating, sub should equal iss (service account email)
			expect(jwt.payload.sub).toBe('test-sa@project.iam.gserviceaccount.com');
			expect(jwt.payload.iss).toBe('test-sa@project.iam.gserviceaccount.com');
		});

		it('should include target_audience in JWT for IAP authentication', async () => {
			mockAxios.mockResolvedValueOnce({
				data: { id_token: 'mock-iap-id-token' },
			});

			await googleIapApi.authenticate(baseCredentials, baseRequestOptions);

			const axiosCall = mockAxios.mock.calls[0][0] as unknown as { data: string };
			const params = new URLSearchParams(axiosCall.data);

			// Verify grant_type is correct for JWT bearer
			expect(params.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');

			// Extract and verify JWT payload
			const jwt = extractJwtFromRequest(axiosCall.data);

			// IAP uses target_audience instead of scope
			expect(jwt.payload.target_audience).toBe('123456789.apps.googleusercontent.com');
			expect(jwt.payload).not.toHaveProperty('scope');

			// Verify JWT signature
			expect(verifyJwtSignature(jwt.raw, TEST_PUBLIC_KEY)).toBe(true);
		});

		it('should throw error when Google OAuth returns an error', async () => {
			const axiosError = {
				response: {
					status: 400,
					data: {
						error: 'invalid_grant',
						error_description: 'Invalid JWT Signature.',
					},
				},
				message: 'Request failed with status code 400',
			};
			mockAxios.mockRejectedValueOnce(axiosError);

			await expect(googleIapApi.authenticate(baseCredentials, baseRequestOptions)).rejects.toThrow(
				'Google IAP token exchange failed (HTTP 400): Invalid JWT Signature.',
			);
		});

		it('should throw error when response is missing id_token', async () => {
			mockAxios.mockResolvedValueOnce({
				data: { access_token: 'wrong-token-type' },
			});

			await expect(googleIapApi.authenticate(baseCredentials, baseRequestOptions)).rejects.toThrow(
				'Google IAP token exchange response missing id_token',
			);
		});

		it('should not use delegated email when impersonate is false', async () => {
			mockAxios.mockResolvedValueOnce({
				data: { id_token: 'mock-iap-id-token' },
			});

			const credentialsWithDelegationButNotEnabled = {
				...baseCredentials,
				impersonate: false,
				delegatedEmail: 'user@example.com',
			};

			await googleIapApi.authenticate(credentialsWithDelegationButNotEnabled, baseRequestOptions);

			const axiosCall = mockAxios.mock.calls[0][0] as unknown as { data: string };
			const jwt = extractJwtFromRequest(axiosCall.data);

			// When impersonate is false, sub should be service account email even if delegatedEmail is set
			expect(jwt.payload.sub).toBe('test-sa@project.iam.gserviceaccount.com');
		});

		it('should include clock skew adjustment in JWT iat', async () => {
			mockAxios.mockResolvedValueOnce({
				data: { id_token: 'mock-iap-id-token' },
			});

			await googleIapApi.authenticate(baseCredentials, baseRequestOptions);

			const axiosCall = mockAxios.mock.calls[0][0] as unknown as { data: string };
			const jwt = extractJwtFromRequest(axiosCall.data);

			// iat should be set to approximately now - 10 seconds
			const now = Math.floor(Date.now() / 1000);
			expect(jwt.payload.iat).toBeLessThanOrEqual(now);
			expect(jwt.payload.iat).toBeGreaterThan(now - 30); // Allow some test execution time
		});
	});
});
