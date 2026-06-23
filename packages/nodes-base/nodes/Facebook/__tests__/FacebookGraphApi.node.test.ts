import type { IDataObject, IExecuteFunctions, IGetNodeParameterOptions } from 'n8n-workflow';

import { FacebookGraphApi } from '../FacebookGraphApi.node';

describe('FacebookGraphApi Node', () => {
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
			getCredentials: jest.fn().mockResolvedValue({
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
			getNode: jest.fn().mockReturnValue({
				name: 'Facebook Graph API',
				typeVersion: 1,
			}),
			continueOnFail: () => continueOnFail,
			getInputData: () => [{ json: {} }],
			helpers: {
				request: jest.fn(),
			},
		} as unknown as IExecuteFunctions;

		return fakeExecuteFunction;
	};

	describe('continueOnFail error handling', () => {
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

			(fakeExecuteFunction.helpers.request as jest.Mock).mockRejectedValue(requestError);

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

			(fakeExecuteFunction.helpers.request as jest.Mock).mockRejectedValue(requestError);

			await expect(node.execute.call(fakeExecuteFunction)).rejects.toThrow();
		});

		it('should handle errors without a response property when continueOnFail is enabled', async () => {
			const networkError = new Error('ECONNREFUSED');

			const fakeExecuteFunction = createMockExecuteFunction({}, { continueOnFail: true });

			(fakeExecuteFunction.helpers.request as jest.Mock).mockRejectedValue(networkError);

			const result = await node.execute.call(fakeExecuteFunction);

			expect(result).toHaveLength(1);

			const returnItems = result[0];
			expect(returnItems).toHaveLength(1);

			const item = returnItems[0];
			expect(item).toHaveProperty('json.error');

			// When there's no response property, the raw error object is used
			expect((item.json.error as Error).message).toBe('ECONNREFUSED');
		});
	});
});
