import { mockDeep } from 'jest-mock-extended';
import type { IAllExecuteFunctions, INode, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

const mockGetToken = jest.fn();
const mockSign = jest.fn();
const mockCreateToken = jest.fn();
const MockClientOAuth2 = jest.fn();

jest.mock('@n8n/client-oauth2', () => ({
	ClientOAuth2: MockClientOAuth2,
}));

import { requestOAuth2 } from '../request-helper-functions';

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
		jest.resetAllMocks();
		mockNode.name = 'test-node';
		mockNode.credentials = { testOAuth2: { id: 'cred-id', name: 'cred-name' } };

		mockGetToken.mockResolvedValue({ data: { access_token: 'mock-token' } });
		mockSign.mockImplementation((opts: object) => ({
			...opts,
			headers: { Authorization: 'Bearer mock-token' },
		}));
		mockCreateToken.mockReturnValue({ sign: mockSign, accessToken: 'mock-token' });

		MockClientOAuth2.mockImplementation(() => ({
			credentials: { getToken: mockGetToken },
			createToken: mockCreateToken,
		}));

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
});
