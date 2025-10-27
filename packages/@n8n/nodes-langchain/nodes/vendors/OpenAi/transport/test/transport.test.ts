import type { IExecuteFunctions } from 'n8n-workflow';

import { apiRequest } from '../index';

const mockedExecutionContext = {
	getCredentials: jest.fn(),
	helpers: {
		requestWithAuthentication: jest.fn(),
	},
};

describe('apiRequest', () => {
	beforeEach(() => {
		jest.resetAllMocks();
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
});
