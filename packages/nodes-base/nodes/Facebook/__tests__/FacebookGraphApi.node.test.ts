import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import type {
	IBinaryData,
	IDataObject,
	IExecuteFunctions,
	IGetNodeParameterOptions,
} from 'n8n-workflow';

import { FacebookGraphApi } from '../FacebookGraphApi.node';
import type { Mock } from 'vitest';

describe('FacebookGraphApi node — binary upload', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;
	let node: FacebookGraphApi;

	const binaryDataBuffer = Buffer.from('fake-image-bytes');
	const binaryDescriptor: IBinaryData = {
		data: 'base64data',
		mimeType: 'image/png',
		fileName: 'photo.png',
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockExecuteFunctions = mock<IExecuteFunctions>();
		node = new FacebookGraphApi();

		mockExecuteFunctions.getInputData.mockReturnValue([
			{ json: {}, binary: { data: binaryDescriptor } },
		]);
		mockExecuteFunctions.getNode.mockReturnValue({
			id: 'test-node-id',
			name: 'Facebook Graph API',
			type: 'n8n-nodes-base.facebookGraphApi',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
		mockExecuteFunctions.getCredentials.mockResolvedValue({ accessToken: 'TOKEN' });
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
		mockExecuteFunctions.helpers = {
			request: vi.fn().mockResolvedValue({ id: 'photo-id' }),
			requestWithAuthentication: vi.fn(),
			assertBinaryData: vi.fn().mockReturnValue(binaryDescriptor),
			getBinaryDataBuffer: vi.fn().mockResolvedValue(binaryDataBuffer),
		} as any;
	});

	const setParams = (overrides: Record<string, unknown> = {}) => {
		const defaults: Record<string, unknown> = {
			authType: 'accessToken',
			hostUrl: 'graph.facebook.com',
			httpRequestMethod: 'POST',
			graphApiVersion: 'v23.0',
			node: '123456',
			edge: 'photos',
			options: {},
			sendBinaryData: true,
			binaryPropertyName: 'data',
			allowUnauthorizedCerts: false,
		};
		const params = { ...defaults, ...overrides };
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			(name: string) => params[name] as never,
		);
	};

	it('builds a multipart/form-data request with the binary buffer when Send Binary File is enabled', async () => {
		setParams();

		await node.execute.call(mockExecuteFunctions);

		const requestMock = mockExecuteFunctions.helpers.request as Mock;
		expect(requestMock).toHaveBeenCalledTimes(1);

		const requestArg = requestMock.mock.calls[0][0];
		expect(requestArg.method).toBe('POST');
		expect(requestArg.uri).toBe('https://graph.facebook.com/v23.0/123456/photos');
		expect(requestArg.formData).toEqual({
			file: {
				value: binaryDataBuffer,
				options: {
					filename: 'photo.png',
					contentType: 'image/png',
				},
			},
		});
		// Buffer must NOT be JSON-serialized into the body.
		expect(requestArg.body).toBeUndefined();
		expect(requestArg.json).toBe(true);
	});

	it('respects the "<formField>:<binaryProperty>" syntax for the form field name', async () => {
		setParams({ binaryPropertyName: 'source:data' });

		await node.execute.call(mockExecuteFunctions);

		const requestArg = (mockExecuteFunctions.helpers.request as Mock).mock.calls[0][0];
		expect(Object.keys(requestArg.formData)).toEqual(['source']);
		expect(requestArg.formData.source.value).toBe(binaryDataBuffer);
		expect(mockExecuteFunctions.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'data');
	});

	it('does not attach formData when Send Binary File is disabled', async () => {
		setParams({ sendBinaryData: false });

		await node.execute.call(mockExecuteFunctions);

		const requestArg = (mockExecuteFunctions.helpers.request as Mock).mock.calls[0][0];
		expect(requestArg.formData).toBeUndefined();
		expect(mockExecuteFunctions.helpers.assertBinaryData).not.toHaveBeenCalled();
		expect(mockExecuteFunctions.helpers.getBinaryDataBuffer).not.toHaveBeenCalled();
	});
});

describe('FacebookGraphApi Node — continueOnFail error handling', () => {
	const node = new FacebookGraphApi();

	const defaultNodeParameters: IDataObject = {
		hostUrl: 'graph.facebook.com',
		httpRequestMethod: 'GET',
		graphApiVersion: 'v23.0',
		node: 'me',
		edge: '',
		allowUnauthorizedCerts: false,
		sendBinaryData: false,
		options: {},
	};

	const createMockExecuteFunction = (
		nodeParameters: IDataObject,
		{ continueOnFail = false }: { continueOnFail?: boolean } = {},
	) => {
		const merged = { ...defaultNodeParameters, ...nodeParameters };

		const fakeExecuteFunction = {
			getCredentials: vi.fn().mockResolvedValue({
				accessToken: 'test-access-token',
			}),
			getNodeParameter(
				parameterName: string,
				_itemIndex: number,
				fallbackValue?: IDataObject,
				_options?: IGetNodeParameterOptions,
			) {
				return merged[parameterName] ?? fallbackValue;
			},
			getNode: vi.fn().mockReturnValue({
				name: 'Facebook Graph API',
				typeVersion: 1,
			}),
			continueOnFail: () => continueOnFail,
			getInputData: () => [{ json: {} }],
			helpers: {
				request: vi.fn(),
			},
		} as unknown as IExecuteFunctions;

		return fakeExecuteFunction;
	};

	it('should return { json: { error: … } } when a 4xx Graph API error occurs with continueOnFail enabled', async () => {
		const graphApiError = {
			message: 'Invalid OAuth access token.',
			type: 'OAuthException',
			code: 190,
			fbtrace_id: 'abc123',
		};

		const requestError = {
			statusCode: 400,
			response: {
				body: {
					error: graphApiError,
				},
				headers: {
					'x-fb-trace-id': 'abc123',
					'content-type': 'application/json',
				},
			},
		};

		const fakeExecuteFunction = createMockExecuteFunction({}, { continueOnFail: true });

		(fakeExecuteFunction.helpers.request as Mock).mockRejectedValue(requestError);

		const result = await node.execute.call(fakeExecuteFunction);

		expect(result).toHaveLength(1);

		const returnItems = result[0];
		expect(returnItems).toHaveLength(1);

		const item = returnItems[0];
		expect(item).toHaveProperty('json.error');

		const errorPayload = item.json.error as IDataObject;

		// statusCode is spread at the top level of the error item
		expect(errorPayload).toHaveProperty('statusCode', 400);

		// Graph API error fields are spread from response.body.error
		expect(errorPayload).toHaveProperty('message', 'Invalid OAuth access token.');
		expect(errorPayload).toHaveProperty('type', 'OAuthException');
		expect(errorPayload).toHaveProperty('code', 190);
		expect(errorPayload).toHaveProperty('fbtrace_id', 'abc123');

		// Response headers are included
		expect(errorPayload).toHaveProperty('headers');
		expect((errorPayload.headers as IDataObject)['x-fb-trace-id']).toBe('abc123');

		// pairedItem tracks lineage back to input item 0
		expect(item).toHaveProperty('pairedItem', { item: 0 });
	});

	it('should throw NodeApiError when a 4xx Graph API error occurs with continueOnFail disabled', async () => {
		const requestError = {
			statusCode: 400,
			response: {
				body: {
					error: {
						message: 'Invalid OAuth access token.',
						type: 'OAuthException',
						code: 190,
					},
				},
			},
		};

		const fakeExecuteFunction = createMockExecuteFunction({}, { continueOnFail: false });

		(fakeExecuteFunction.helpers.request as Mock).mockRejectedValue(requestError);

		await expect(node.execute.call(fakeExecuteFunction)).rejects.toThrow();
	});

	it('should handle errors without a response property when continueOnFail is enabled', async () => {
		const networkError = new Error('ECONNREFUSED');

		const fakeExecuteFunction = createMockExecuteFunction({}, { continueOnFail: true });

		(fakeExecuteFunction.helpers.request as Mock).mockRejectedValue(networkError);

		const result = await node.execute.call(fakeExecuteFunction);

		expect(result).toHaveLength(1);

		const returnItems = result[0];
		expect(returnItems).toHaveLength(1);

		const item = returnItems[0];
		expect(item).toHaveProperty('json.error');

		// When there's no response property, the raw error object is used
		expect((item.json.error as Error).message).toBe('ECONNREFUSED');

		// pairedItem tracks lineage back to input item 0
		expect(item).toHaveProperty('pairedItem', { item: 0 });
	});
});
