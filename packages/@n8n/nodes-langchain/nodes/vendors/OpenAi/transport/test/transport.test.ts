import type { AiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { IExecuteFunctions } from 'n8n-workflow';

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
		// Default: AiConfig resolves with the built-in one hour timeout.
		vi.spyOn(Container, 'get').mockReturnValue({ timeout: 3600000 } as AiConfig);
	});

	afterEach(() => {
		vi.restoreAllMocks();
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
				timeout: 3600000,
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
				timeout: 3600000,
			},
		);
	});

	it('should use the configured AI timeout for the request', async () => {
		vi.spyOn(Container, 'get').mockReturnValue({ timeout: 7200000 } as AiConfig);
		mockedExecutionContext.getCredentials.mockResolvedValue({});

		// Act
		await apiRequest.call(mockedExecutionContext as unknown as IExecuteFunctions, 'GET', '/test');

		// Assert
		expect(mockedExecutionContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'openAiApi',
			expect.objectContaining({ timeout: 7200000 }),
		);
	});

	it('should fall back to a one hour timeout when AiConfig cannot be resolved', async () => {
		vi.spyOn(Container, 'get').mockReturnValue(undefined as unknown as AiConfig);
		mockedExecutionContext.getCredentials.mockResolvedValue({});

		// Act
		await apiRequest.call(mockedExecutionContext as unknown as IExecuteFunctions, 'GET', '/test');

		// Assert
		expect(mockedExecutionContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'openAiApi',
			expect.objectContaining({ timeout: 3600000 }),
		);
	});

	it('should let an explicit option.timeout override the configured timeout', async () => {
		mockedExecutionContext.getCredentials.mockResolvedValue({});

		// Act
		await apiRequest.call(mockedExecutionContext as unknown as IExecuteFunctions, 'GET', '/test', {
			option: { timeout: 1000 },
		});

		// Assert
		expect(mockedExecutionContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'openAiApi',
			expect.objectContaining({ timeout: 1000 }),
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
