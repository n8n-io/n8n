import type { HttpRequestClient } from '@n8n/backend-network';
import { OutboundHttp } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import FormData from 'form-data';
import type {
	IAllExecuteFunctions,
	ICredentialDataDecryptedObject,
	IHttpRequestOptions,
	INode,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import nock from 'nock';
import { Readable } from 'stream';
import { mock, mockDeep } from 'vitest-mock-extended';

import { httpRequestWithAuthentication, requestWithAuthentication } from '../authentication';
import { proxyRequestToAxios } from '../legacy-request-adapter';

vi.mock('../legacy-request-adapter', () => ({
	proxyRequestToAxios: vi.fn(),
}));

describe('httpRequestWithAuthentication', () => {
	const baseUrl = 'https://api.example.com';
	const tokenUrl = 'https://auth.example.com';
	const mockThis = mockDeep<IAllExecuteFunctions>();
	const mockWorkflow = mock<Workflow>();
	const mockNode = mockDeep<INode>();
	const mockAdditionalData = mockDeep<IWorkflowExecuteAdditionalData>();
	// mockDeep auto-creates truthy proxies for optional keys; opt out of the JWE
	// proxy, the outbound network guard, and the eval LLM mock
	(mockAdditionalData as unknown as Record<string, unknown>)['oauth-jwe'] = undefined;
	mockAdditionalData.ssrfBridge = undefined;
	mockAdditionalData.evalLlmMockHandler = undefined;

	const request = vi.fn();
	const requests = vi.fn();
	const outboundHttp = mock<OutboundHttp>({ requests });

	beforeEach(() => {
		nock.cleanAll();
		vi.resetAllMocks();
		requests.mockReturnValue(mock<HttpRequestClient>({ request }));
		Container.set(OutboundHttp, outboundHttp);
		mockNode.name = 'test-node';
		mockNode.credentials = { testOAuth2: { id: 'cred-id', name: 'cred-name' } };
	});

	test('does not resend an OAuth2 request whose surfaced 401 reaches the generic 401 fallback', async () => {
		mockAdditionalData.credentialsHelper.getParentTypes.mockReturnValue(['oAuth2Api']);
		mockAdditionalData.credentialsHelper.getDecrypted.mockResolvedValue({
			oauthTokenData: { access_token: 'expired-token' },
		} as unknown as ICredentialDataDecryptedObject);
		mockThis.getCredentials.mockResolvedValue({
			clientId: 'test-client-id',
			clientSecret: 'test-client-secret',
			grantType: 'clientCredentials',
			accessTokenUrl: `${tokenUrl}/token`,
			authentication: 'body',
			scope: 'read',
			oauthTokenData: { access_token: 'expired-token', token_type: 'bearer' },
		});
		nock(tokenUrl).post('/token').reply(200, { access_token: 'new-token', token_type: 'bearer' });

		const error401 = Object.assign(new Error('401 - scope does not match'), {
			response: { status: 401 },
		});
		mockThis.helpers.httpRequest.mockRejectedValueOnce(error401);

		const formData = new FormData();
		formData.append('file', Buffer.from('content'), { filename: 'file.txt' });

		await expect(
			httpRequestWithAuthentication.call(
				mockThis,
				'testOAuth2',
				{ method: 'POST', url: `${baseUrl}/upload`, body: formData },
				mockWorkflow,
				mockNode,
				mockAdditionalData,
			),
		).rejects.toSatisfy(
			(thrown: unknown) => thrown instanceof NodeApiError && thrown.cause === error401,
		);

		// Exactly one attempt: requestOAuth2 already handled the 401, so the
		// wrapper must not replay the consumed body via its own resend
		expect(mockThis.helpers.httpRequest).toHaveBeenCalledTimes(1);
		expect(request).not.toHaveBeenCalled();
	});

	test('still refreshes and resends on 401 for preAuthentication credentials', async () => {
		mockAdditionalData.credentialsHelper.getParentTypes.mockReturnValue([]);
		mockThis.getCredentials.mockResolvedValue({ sessionToken: 'stale' });
		const requestOptions: IHttpRequestOptions = { method: 'GET', url: `${baseUrl}/items` };
		mockAdditionalData.credentialsHelper.preAuthentication
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce({ sessionToken: 'fresh' });
		mockAdditionalData.credentialsHelper.authenticate.mockResolvedValue(requestOptions);

		const error401 = Object.assign(new Error('401 - session expired'), {
			response: { status: 401 },
		});
		request.mockRejectedValueOnce(error401).mockResolvedValueOnce({ ok: true });

		const result = await httpRequestWithAuthentication.call(
			mockThis,
			'testSessionAuth',
			requestOptions,
			mockWorkflow,
			mockNode,
			mockAdditionalData,
		);

		expect(result).toEqual({ ok: true });
		expect(request).toHaveBeenCalledTimes(2);
		expect(mockAdditionalData.credentialsHelper.preAuthentication).toHaveBeenLastCalledWith(
			{ helpers: mockThis.helpers },
			expect.objectContaining({ sessionToken: 'fresh' }),
			'testSessionAuth',
			mockNode,
			true,
		);
	});

	test('refreshes but does NOT resend a drained form-data body on 401; the original error surfaces', async () => {
		mockAdditionalData.credentialsHelper.getParentTypes.mockReturnValue([]);
		mockThis.getCredentials.mockResolvedValue({ sessionToken: 'stale' });
		mockAdditionalData.credentialsHelper.preAuthentication
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce({ sessionToken: 'fresh' });
		mockAdditionalData.credentialsHelper.authenticate.mockImplementation(
			async (_credentials, _type, requestOptions) => requestOptions as IHttpRequestOptions,
		);

		const error401 = Object.assign(new Error('401 - session expired'), {
			response: { status: 401 },
		});
		request.mockRejectedValueOnce(error401);

		const formData = new FormData();
		formData.append('file', Buffer.from('content'), { filename: 'file.txt' });

		await expect(
			httpRequestWithAuthentication.call(
				mockThis,
				'testSessionAuth',
				{ method: 'POST', url: `${baseUrl}/upload`, body: formData },
				mockWorkflow,
				mockNode,
				mockAdditionalData,
			),
		).rejects.toSatisfy(
			(thrown: unknown) => thrown instanceof NodeApiError && thrown.cause === error401,
		);

		expect(request).toHaveBeenCalledTimes(1);
		expect(mockAdditionalData.credentialsHelper.preAuthentication).toHaveBeenLastCalledWith(
			{ helpers: mockThis.helpers },
			expect.anything(),
			'testSessionAuth',
			mockNode,
			true,
		);
	});

	test('still retries a form-data body when the 401 happened before any send', async () => {
		mockAdditionalData.credentialsHelper.getParentTypes.mockReturnValue([]);
		mockThis.getCredentials.mockResolvedValue({ sessionToken: 'stale' });
		const error401 = Object.assign(new Error('401 - mint rejected'), {
			response: { status: 401 },
		});
		mockAdditionalData.credentialsHelper.preAuthentication
			.mockRejectedValueOnce(error401)
			.mockResolvedValueOnce({ sessionToken: 'fresh' });
		mockAdditionalData.credentialsHelper.authenticate.mockImplementation(
			async (_credentials, _type, requestOptions) => requestOptions as IHttpRequestOptions,
		);
		request.mockResolvedValueOnce({ ok: true });

		const formData = new FormData();
		formData.append('file', Buffer.from('content'), { filename: 'file.txt' });

		const result = await httpRequestWithAuthentication.call(
			mockThis,
			'testSessionAuth',
			{ method: 'POST', url: `${baseUrl}/upload`, body: formData },
			mockWorkflow,
			mockNode,
			mockAdditionalData,
		);

		expect(result).toEqual({ ok: true });
		expect(request).toHaveBeenCalledTimes(1);
	});
});

describe('requestWithAuthentication (legacy) — preAuthentication retry', () => {
	const mockThis = mockDeep<IAllExecuteFunctions>();
	const mockWorkflow = mock<Workflow>();
	const mockNode = mockDeep<INode>();
	const mockAdditionalData = mockDeep<IWorkflowExecuteAdditionalData>();
	mockAdditionalData.evalLlmMockHandler = undefined;

	const proxyRequestToAxiosMock = vi.mocked(proxyRequestToAxios);

	beforeEach(() => {
		vi.clearAllMocks();
		mockNode.name = 'test-node';
		mockAdditionalData.credentialsHelper.getParentTypes.mockReturnValue([]);
		mockThis.getCredentials.mockResolvedValue({ accessToken: 'stale' });
		mockAdditionalData.credentialsHelper.preAuthentication.mockResolvedValue({
			accessToken: 'fresh',
		});
		mockAdditionalData.credentialsHelper.authenticate.mockImplementation(
			async (_credentials, _type, requestOptions) => requestOptions as IHttpRequestOptions,
		);
	});

	test('refreshes and resends a replayable request after a failure', async () => {
		const requestError = Object.assign(new Error('401 - token expired'), {
			response: { status: 401 },
		});
		proxyRequestToAxiosMock.mockRejectedValueOnce(requestError).mockResolvedValueOnce({ ok: true });

		const result = await requestWithAuthentication.call(
			mockThis,
			'testPreAuth',
			{ method: 'POST', uri: 'https://api.example.com/items', body: { name: 'x' } },
			mockWorkflow,
			mockNode,
			mockAdditionalData,
		);

		expect(result).toEqual({ ok: true });
		expect(proxyRequestToAxiosMock).toHaveBeenCalledTimes(2);
	});

	test('refreshes but does NOT resend a drained stream body; the original error surfaces', async () => {
		const requestError = Object.assign(new Error('401 - token expired'), {
			response: { status: 401 },
		});
		proxyRequestToAxiosMock.mockRejectedValueOnce(requestError);

		await expect(
			requestWithAuthentication.call(
				mockThis,
				'testPreAuth',
				{
					method: 'POST',
					uri: 'https://api.example.com/attachments',
					formData: { file: { value: Readable.from(['content']), options: { filename: 'a.txt' } } },
				},
				mockWorkflow,
				mockNode,
				mockAdditionalData,
			),
		).rejects.toSatisfy(
			(thrown: unknown) => thrown instanceof NodeApiError && thrown.cause === requestError,
		);

		expect(proxyRequestToAxiosMock).toHaveBeenCalledTimes(1);
		expect(mockAdditionalData.credentialsHelper.preAuthentication).toHaveBeenLastCalledWith(
			{ helpers: mockThis.helpers },
			expect.anything(),
			'testPreAuth',
			mockNode,
			true,
		);
	});

	test('still retries a stream body when the failure happened before any send', async () => {
		mockAdditionalData.credentialsHelper.preAuthentication
			.mockRejectedValueOnce(new Error('token endpoint hiccup'))
			.mockResolvedValueOnce({ accessToken: 'fresh' });
		proxyRequestToAxiosMock.mockResolvedValueOnce({ ok: true });

		const result = await requestWithAuthentication.call(
			mockThis,
			'testPreAuth',
			{
				method: 'POST',
				uri: 'https://api.example.com/attachments',
				formData: { file: { value: Readable.from(['content']), options: { filename: 'a.txt' } } },
			},
			mockWorkflow,
			mockNode,
			mockAdditionalData,
		);

		expect(result).toEqual({ ok: true });
		expect(proxyRequestToAxiosMock).toHaveBeenCalledTimes(1);
	});
});
