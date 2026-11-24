import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath, requestUrl } from 'n8n-workflow';

import { apiRequest } from '../index';

const mockedExecutionContext = {
	getCredentials: vi.fn(),
	helpers: {
		requestWithAuthentication: vi.fn(),
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
		await apiRequest.call(
			mockedExecutionContext as unknown as IExecuteFunctions,
			'GET',
			requestPath`/test`,
			{
				headers: { 'Content-Type': 'application/json' },
			},
		);

		// Assert

		expect(mockedExecutionContext.getCredentials).toHaveBeenCalledWith('openAiApi');
		expect(mockedExecutionContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'openAiApi',
			{
				headers: { 'Content-Type': 'application/json' },
				method: 'GET',
				uri: requestUrl`http://www.test/url/v1/test`,
				json: true,
			},
		);
	});

	it('should call requestWithAuthentication with default URL if credentials URL is not provided', async () => {
		mockedExecutionContext.getCredentials.mockResolvedValue({});

		// Act
		await apiRequest.call(
			mockedExecutionContext as unknown as IExecuteFunctions,
			'GET',
			requestPath`/test`,
			{
				headers: { 'Content-Type': 'application/json' },
			},
		);

		// Assert

		expect(mockedExecutionContext.getCredentials).toHaveBeenCalledWith('openAiApi');
		expect(mockedExecutionContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'openAiApi',
			{
				headers: { 'Content-Type': 'application/json' },
				method: 'GET',
				uri: requestUrl`https://api.openai.com/v1/test`,
				json: true,
			},
		);
	});

	it('should encode path values that contain a slash', async () => {
		mockedExecutionContext.getCredentials.mockResolvedValue({});

		await apiRequest.call(
			mockedExecutionContext as unknown as IExecuteFunctions,
			'DELETE',
			requestPath`/files/${'file-abc123/models'}`,
		);

		expect(
			String(mockedExecutionContext.helpers.requestWithAuthentication.mock.calls[0][1].uri),
		).toBe('https://api.openai.com/v1/files/file-abc123%2Fmodels');
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
			requestPath`/test`,
		);

		// Assert
		expect(response.error).toBeUndefined();
	});
});
