import type { IExecuteFunctions } from 'n8n-workflow';
import { Readable } from 'node:stream';

import { apiRequest, apiRequestStream } from '../index';

const mockedExecutionContext = {
	getCredentials: vi.fn(),
	getNode: vi.fn(),
	helpers: {
		requestWithAuthentication: vi.fn(),
		httpRequestWithAuthentication: vi.fn(),
	},
};

describe('apiRequest', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('should call requestWithAuthentication with credentials URL if one is provided', async () => {
		mockedExecutionContext.getCredentials.mockResolvedValue({
			url: 'http://www.test/url/v1',
		});

		// Act
		await apiRequest.call(mockedExecutionContext as unknown as IExecuteFunctions, 'GET', '/test', {
			headers: { 'Content-Type': 'application/json' },
		});

		// Assert

		expect(mockedExecutionContext.getCredentials).toHaveBeenCalledWith('openAiApi');
		expect(mockedExecutionContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'openAiApi',
			{
				headers: { 'Content-Type': 'application/json' },
				method: 'GET',
				uri: 'http://www.test/url/v1/test',
				json: true,
			},
		);
	});

	it('should call requestWithAuthentication with default URL if credentials URL is not provided', async () => {
		mockedExecutionContext.getCredentials.mockResolvedValue({});

		// Act
		await apiRequest.call(mockedExecutionContext as unknown as IExecuteFunctions, 'GET', '/test', {
			headers: { 'Content-Type': 'application/json' },
		});

		// Assert

		expect(mockedExecutionContext.getCredentials).toHaveBeenCalledWith('openAiApi');
		expect(mockedExecutionContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'openAiApi',
			{
				headers: { 'Content-Type': 'application/json' },
				method: 'GET',
				uri: 'https://api.openai.com/v1/test',
				json: true,
			},
		);
	});

	it('should normalize error: null to error: undefined', async () => {
		// Arrange
		mockedExecutionContext.getCredentials.mockResolvedValue({});
		mockedExecutionContext.helpers.requestWithAuthentication.mockResolvedValue({
			id: 'test',
			error: null,
		});

		// Act
		const response = await apiRequest.call(
			mockedExecutionContext as unknown as IExecuteFunctions,
			'GET',
			'/test',
		);

		// Assert
		expect(response.error).toBeUndefined();
	});
});

describe('apiRequestStream', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockedExecutionContext.getNode.mockReturnValue({
			id: 'test-node',
			name: 'Test Node',
			type: 'n8n-nodes-langchain.openAi',
			typeVersion: 2.4,
			position: [0, 0],
			parameters: {},
		});
	});

	it('should ask for a stream and return the response body', async () => {
		mockedExecutionContext.getCredentials.mockResolvedValue({});
		const body = Readable.from([Buffer.from('data: {}\n\n')]);
		mockedExecutionContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
			statusCode: 200,
			body,
		});

		const response = await apiRequestStream.call(
			mockedExecutionContext as unknown as IExecuteFunctions,
			'POST',
			'/responses',
			{ body: { model: 'gpt-4o', stream: true } },
		);

		expect(response).toBe(body);
		expect(mockedExecutionContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'openAiApi',
			expect.objectContaining({
				method: 'POST',
				url: 'https://api.openai.com/v1/responses',
				headers: expect.objectContaining({ Accept: 'text/event-stream' }),
				encoding: 'stream',
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
			}),
		);
	});

	it('should report the error payload of a failed request', async () => {
		mockedExecutionContext.getCredentials.mockResolvedValue({});
		mockedExecutionContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
			statusCode: 400,
			body: Readable.from([
				Buffer.from(JSON.stringify({ error: { message: 'Unsupported parameter: stream' } })),
			]),
		});

		await expect(
			apiRequestStream.call(
				mockedExecutionContext as unknown as IExecuteFunctions,
				'POST',
				'/responses',
				{ body: { model: 'gpt-4o' } },
			),
		).rejects.toMatchObject({
			httpCode: '400',
			description: 'Unsupported parameter: stream',
		});
	});

	it('should use the credentials URL and custom header', async () => {
		mockedExecutionContext.getCredentials.mockResolvedValue({
			url: 'http://www.test/url/v1',
			header: true,
			headerName: 'X-Custom',
			headerValue: 'value',
		});
		mockedExecutionContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
			statusCode: 200,
			body: Readable.from([]),
		});

		await apiRequestStream.call(
			mockedExecutionContext as unknown as IExecuteFunctions,
			'POST',
			'/responses',
			{ body: {} },
		);

		expect(mockedExecutionContext.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'openAiApi',
			expect.objectContaining({
				url: 'http://www.test/url/v1/responses',
				headers: { Accept: 'text/event-stream', 'X-Custom': 'value' },
			}),
		);
	});
});
