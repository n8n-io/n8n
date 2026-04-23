import type { IExecuteFunctions } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';
import { apiRequest } from '.';

describe('Moonshot transport', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should call httpRequestWithAuthentication with correct parameters', async () => {
		executeFunctionsMock.getCredentials.mockResolvedValue({
			url: 'https://api.moonshot.ai/v1',
		});

		await apiRequest.call(executeFunctionsMock, 'POST', '/chat/completions', {
			body: {
				model: 'kimi-k2.5',
				messages: [{ role: 'user', content: 'Hello' }],
			},
		});

		expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'moonshotApi',
			{
				method: 'POST',
				url: 'https://api.moonshot.ai/v1/chat/completions',
				json: true,
				body: {
					model: 'kimi-k2.5',
					messages: [{ role: 'user', content: 'Hello' }],
				},
				headers: {},
			},
		);
	});

	it('should use the default url if no custom url is provided', async () => {
		executeFunctionsMock.getCredentials.mockResolvedValue({});

		await apiRequest.call(executeFunctionsMock, 'GET', '/models');

		expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'moonshotApi',
			{
				method: 'GET',
				url: 'https://api.moonshot.ai/v1/models',
				json: true,
				headers: {},
			},
		);
	});

	it('should override the values with option', async () => {
		executeFunctionsMock.getCredentials.mockResolvedValue({
			url: 'https://api.moonshot.ai/v1',
		});

		await apiRequest.call(executeFunctionsMock, 'GET', '', {
			option: {
				url: 'https://override-url.com',
				returnFullResponse: true,
			},
		});

		expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'moonshotApi',
			{
				method: 'GET',
				url: 'https://override-url.com',
				json: true,
				returnFullResponse: true,
				headers: {},
			},
		);
	});
});
