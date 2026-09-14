import type * as ClientOAuth2Module from '@n8n/client-oauth2';
import type { IAllExecuteFunctions, INode, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { refreshOAuth2Token, requestOAuth2 } from '../request-helpers/oauth';

const { mockGetToken, mockSign, mockCreateToken, MockClientOAuth2 } = vi.hoisted(() => ({
	mockGetToken: vi.fn(),
	mockSign: vi.fn(),
	mockCreateToken: vi.fn(),
	MockClientOAuth2: vi.fn(),
}));

vi.mock('@n8n/client-oauth2', async (importOriginal) => {
	const actual = await importOriginal<typeof ClientOAuth2Module>();
	return { ...actual, ClientOAuth2: MockClientOAuth2 };
});

describe('createOAuth2Client - scope handling', () => {
	const mockThis = mockDeep<IAllExecuteFunctions>();
	const mockNode = mockDeep<INode>();
	const mockAdditionalData = mockDeep<IWorkflowExecuteAdditionalData>();

	const baseCredentials = {
		clientId: 'client-id',
		clientSecret: 'client-secret',
		grantType: 'clientCredentials',
		accessTokenUrl: 'https://auth.example.com/token',
		authentication: 'body',
		oauthTokenData: undefined,
	};

	beforeEach(() => {
		vi.resetAllMocks();
		mockNode.name = 'test-node';
		mockNode.credentials = { testOAuth2: { id: 'cred-id', name: 'cred-name' } };

		mockGetToken.mockResolvedValue({ data: { access_token: 'mock-token' } });
		mockSign.mockImplementation((opts: object) => ({
			...opts,
			headers: { Authorization: 'Bearer mock-token' },
		}));
		mockCreateToken.mockReturnValue({ sign: mockSign, accessToken: 'mock-token' });

		MockClientOAuth2.mockImplementation(function (this: {
			credentials: { getToken: typeof mockGetToken };
			createToken: typeof mockCreateToken;
		}) {
			this.credentials = { getToken: mockGetToken };
			this.createToken = mockCreateToken;
		});

		mockThis.helpers.httpRequest.mockResolvedValue({ success: true });
	});

	const call = async () =>
		await requestOAuth2.call(
			mockThis,
			'testOAuth2',
			{ method: 'GET', url: 'https://api.example.com/data' },
			mockNode,
			mockAdditionalData,
			undefined,
			true,
		);

	test('should pass undefined scopes when scope is undefined', async () => {
		mockThis.getCredentials.mockResolvedValue({ ...baseCredentials, scope: undefined });

		await call();

		expect(MockClientOAuth2).toHaveBeenCalledWith(expect.objectContaining({ scopes: undefined }));
	});

	test('should pass undefined scopes when scope is null', async () => {
		mockThis.getCredentials.mockResolvedValue({ ...baseCredentials, scope: null });

		await call();

		expect(MockClientOAuth2).toHaveBeenCalledWith(expect.objectContaining({ scopes: undefined }));
	});

	test('should pass undefined scopes when scope is an empty string', async () => {
		mockThis.getCredentials.mockResolvedValue({ ...baseCredentials, scope: '' });

		await call();

		expect(MockClientOAuth2).toHaveBeenCalledWith(expect.objectContaining({ scopes: undefined }));
	});

	test('should pass undefined scopes when scope contains only spaces', async () => {
		mockThis.getCredentials.mockResolvedValue({ ...baseCredentials, scope: '   ' });

		await call();

		expect(MockClientOAuth2).toHaveBeenCalledWith(expect.objectContaining({ scopes: undefined }));
	});

	test('should pass a trimmed scopes array for a valid scope string', async () => {
		mockThis.getCredentials.mockResolvedValue({ ...baseCredentials, scope: 'read write' });

		await call();

		expect(MockClientOAuth2).toHaveBeenCalledWith(
			expect.objectContaining({ scopes: ['read', 'write'] }),
		);
	});

	test('should trim and filter extra whitespace between scopes', async () => {
		mockThis.getCredentials.mockResolvedValue({ ...baseCredentials, scope: '  read   write  ' });

		await call();

		expect(MockClientOAuth2).toHaveBeenCalledWith(
			expect.objectContaining({ scopes: ['read', 'write'] }),
		);
	});

	test('should pass clientCertificate when certificate authentication is selected', async () => {
		mockThis.getCredentials.mockResolvedValue({
			...baseCredentials,
			clientCredentialType: 'certificate',
			privateKey: 'private-key-pem',
			certificate: 'certificate-pem',
		});

		await call();

		expect(MockClientOAuth2).toHaveBeenCalledWith(
			expect.objectContaining({
				clientCertificate: { privateKey: 'private-key-pem', certificate: 'certificate-pem' },
			}),
		);
	});

	test('should not pass clientCertificate when authentication is the default client secret', async () => {
		mockThis.getCredentials.mockResolvedValue({ ...baseCredentials });

		await call();

		expect(MockClientOAuth2).toHaveBeenCalledWith(
			expect.not.objectContaining({ clientCertificate: expect.anything() }),
		);
	});

	test('should not pass clientCertificate when certificate is selected but PEMs are missing', async () => {
		mockThis.getCredentials.mockResolvedValue({
			...baseCredentials,
			clientCredentialType: 'certificate',
			privateKey: '',
			certificate: '',
		});

		await call();

		expect(MockClientOAuth2).toHaveBeenCalledWith(
			expect.not.objectContaining({ clientCertificate: expect.anything() }),
		);
	});

	test('should not pass clientCertificate when only one PEM field is provided', async () => {
		mockThis.getCredentials.mockResolvedValue({
			...baseCredentials,
			clientCredentialType: 'certificate',
			privateKey: 'private-key-pem',
			certificate: '',
		});

		await call();

		expect(MockClientOAuth2).toHaveBeenCalledWith(
			expect.not.objectContaining({ clientCertificate: expect.anything() }),
		);
	});

	test('should not carry the client secret when certificate authentication is selected', async () => {
		mockThis.getCredentials.mockResolvedValue({
			...baseCredentials,
			clientCredentialType: 'certificate',
			privateKey: 'private-key-pem',
			certificate: 'certificate-pem',
			clientSecret: 'stale-secret',
		});

		await call();

		const passedOptions = MockClientOAuth2.mock.calls[0][0];
		expect(passedOptions.clientSecret).toBeUndefined();
		expect(passedOptions.clientCertificate).toEqual({
			privateKey: 'private-key-pem',
			certificate: 'certificate-pem',
		});
	});

	test('should build the client with a certificate on the token-refresh path', async () => {
		mockThis.getCredentials.mockResolvedValue({
			...baseCredentials,
			grantType: 'authorizationCode',
			clientCredentialType: 'certificate',
			privateKey: 'private-key-pem',
			certificate: 'certificate-pem',
			oauthTokenData: { access_token: 'stale', refresh_token: 'refresh-tok' },
		});

		await refreshOAuth2Token
			.call(mockThis, 'testOAuth2', mockNode, mockAdditionalData)
			.catch(() => {});

		expect(MockClientOAuth2).toHaveBeenCalledWith(
			expect.objectContaining({
				clientCertificate: { privateKey: 'private-key-pem', certificate: 'certificate-pem' },
			}),
		);
	});
});
