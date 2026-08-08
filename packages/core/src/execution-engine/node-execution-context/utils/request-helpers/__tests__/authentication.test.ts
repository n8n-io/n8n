import type {
	IAllExecuteFunctions,
	IHttpRequestOptions,
	INode,
	IWorkflowExecuteAdditionalData,
	Workflow,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { httpRequestWithAuthentication } from '../authentication';
import { httpRequest } from '../http-request';

vi.mock('../http-request', () => ({
	httpRequest: vi.fn(),
	removeEmptyBody: vi.fn(),
}));

const mockedHttpRequest = vi.mocked(httpRequest);

describe('httpRequestWithAuthentication - tokenExpiredStatusCodes', () => {
	const baseUrl = 'https://api.example.com';
	const credentialsType = 'testApi';
	const mockThis = mockDeep<IAllExecuteFunctions>();
	const mockNode = mockDeep<INode>();
	const mockWorkflow = mockDeep<Workflow>();
	const mockAdditionalData = mockDeep<IWorkflowExecuteAdditionalData>();

	beforeEach(() => {
		vi.resetAllMocks();
		mockNode.name = 'test-node';

		mockAdditionalData.credentialsHelper.getParentTypes.mockReturnValue([]);
		mockThis.getCredentials.mockResolvedValue({ token: 'secret' });
		mockAdditionalData.credentialsHelper.preAuthentication.mockResolvedValue(undefined);
		mockAdditionalData.credentialsHelper.authenticate.mockImplementation(
			async (_credentials, _type, options) =>
				(await Promise.resolve(options)) as IHttpRequestOptions,
		);
	});

	test('should retry once on 401 by default', async () => {
		mockedHttpRequest
			.mockRejectedValueOnce(Object.assign(new Error('401'), { response: { status: 401 } }))
			.mockResolvedValueOnce({ success: true });

		await expect(
			httpRequestWithAuthentication.call(
				mockThis,
				credentialsType,
				{ method: 'GET', url: `${baseUrl}/data` },
				mockWorkflow,
				mockNode,
				mockAdditionalData,
				undefined,
			),
		).resolves.toEqual({ success: true });

		expect(mockedHttpRequest).toHaveBeenCalledTimes(2);
		expect(mockAdditionalData.credentialsHelper.preAuthentication).toHaveBeenCalledTimes(2);
		expect(mockAdditionalData.credentialsHelper.preAuthentication).toHaveBeenLastCalledWith(
			expect.anything(),
			expect.anything(),
			credentialsType,
			mockNode,
			true,
		);
	});

	test('should retry on a custom tokenExpiredStatusCode', async () => {
		mockedHttpRequest
			.mockRejectedValueOnce(Object.assign(new Error('429'), { response: { status: 429 } }))
			.mockResolvedValueOnce({ success: true });

		await expect(
			httpRequestWithAuthentication.call(
				mockThis,
				credentialsType,
				{ method: 'GET', url: `${baseUrl}/data` },
				mockWorkflow,
				mockNode,
				mockAdditionalData,
				{ generic: { tokenExpiredStatusCodes: [429] } },
			),
		).resolves.toEqual({ success: true });

		expect(mockedHttpRequest).toHaveBeenCalledTimes(2);
		expect(mockAdditionalData.credentialsHelper.preAuthentication).toHaveBeenCalledTimes(2);
		expect(mockAdditionalData.credentialsHelper.preAuthentication).toHaveBeenLastCalledWith(
			expect.anything(),
			expect.anything(),
			credentialsType,
			mockNode,
			true,
		);
	});

	test('should retry on any of several custom tokenExpiredStatusCodes', async () => {
		mockedHttpRequest
			.mockRejectedValueOnce(Object.assign(new Error('403'), { response: { status: 403 } }))
			.mockResolvedValueOnce({ success: true });

		await expect(
			httpRequestWithAuthentication.call(
				mockThis,
				credentialsType,
				{ method: 'GET', url: `${baseUrl}/data` },
				mockWorkflow,
				mockNode,
				mockAdditionalData,
				{ generic: { tokenExpiredStatusCodes: [401, 403] } },
			),
		).resolves.toEqual({ success: true });

		expect(mockedHttpRequest).toHaveBeenCalledTimes(2);
		expect(mockAdditionalData.credentialsHelper.preAuthentication).toHaveBeenCalledTimes(2);
		expect(mockAdditionalData.credentialsHelper.preAuthentication).toHaveBeenLastCalledWith(
			expect.anything(),
			expect.anything(),
			credentialsType,
			mockNode,
			true,
		);
	});

	test('should NOT retry on 401 when custom codes do not include it', async () => {
		mockedHttpRequest.mockRejectedValueOnce(
			Object.assign(new Error('401'), { response: { status: 401 } }),
		);

		await expect(
			httpRequestWithAuthentication.call(
				mockThis,
				credentialsType,
				{ method: 'GET', url: `${baseUrl}/data` },
				mockWorkflow,
				mockNode,
				mockAdditionalData,
				{ generic: { tokenExpiredStatusCodes: [429] } },
			),
		).rejects.toThrow(NodeApiError);

		expect(mockedHttpRequest).toHaveBeenCalledTimes(1);
		expect(mockAdditionalData.credentialsHelper.preAuthentication).toHaveBeenCalledTimes(1);
	});

	test('should NOT retry on a non-expiry status code by default', async () => {
		mockedHttpRequest.mockRejectedValueOnce(
			Object.assign(new Error('500'), { response: { status: 500 } }),
		);

		await expect(
			httpRequestWithAuthentication.call(
				mockThis,
				credentialsType,
				{ method: 'GET', url: `${baseUrl}/data` },
				mockWorkflow,
				mockNode,
				mockAdditionalData,
				undefined,
			),
		).rejects.toThrow(NodeApiError);

		expect(mockedHttpRequest).toHaveBeenCalledTimes(1);
		expect(mockAdditionalData.credentialsHelper.preAuthentication).toHaveBeenCalledTimes(1);
	});
});
