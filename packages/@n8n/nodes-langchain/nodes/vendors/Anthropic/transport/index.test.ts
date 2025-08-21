import type { IExecuteFunctions } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';
import { apiRequest } from '.';

describe('Anthropic transport', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should call httpRequestWithAuthentication with correct parameters', async () => {
		executeFunctionsMock.getCredentials.mockResolvedValue({
			url: 'https://custom-url.com',
		});

		await apiRequest.call(executeFunctionsMock, 'GET', '/v1/messages', {
			headers: {
				'Content-Type': 'application/json',
			},
			body: {
				model: 'claude-sonnet-4-20250514',
				messages: [{ role: 'user', content: 'Hello' }],
			},
			qs: {
				test: 123,
			},
		});

		expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'anthropicApi',
			{
				method: 'GET',
				url: 'https://custom-url.com/v1/messages',
				json: true,
				body: {
					model: 'claude-sonnet-4-20250514',
					messages: [{ role: 'user', content: 'Hello' }],
				},
				qs: {
					test: 123,
				},
				headers: {
					'anthropic-version': '2023-06-01',
					'anthropic-beta': 'files-api-2025-04-14',
					'Content-Type': 'application/json',
				},
			},
		);
	});

	it('should use the default url if no custom url is provided', async () => {
		executeFunctionsMock.getCredentials.mockResolvedValue({});

		await apiRequest.call(executeFunctionsMock, 'GET', '/v1/messages');

		expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'anthropicApi',
			{
				method: 'GET',
				url: 'https://api.anthropic.com/v1/messages',
				json: true,
				headers: {
					'anthropic-version': '2023-06-01',
					'anthropic-beta': 'files-api-2025-04-14',
				},
			},
		);
	});

	it('should override the values with `option`', async () => {
		executeFunctionsMock.getCredentials.mockResolvedValue({});

		await apiRequest.call(executeFunctionsMock, 'GET', '', {
			option: {
				url: 'https://override-url.com',
				returnFullResponse: true,
			},
		});

		expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'anthropicApi',
			{
				method: 'GET',
				url: 'https://override-url.com',
				json: true,
				returnFullResponse: true,
				headers: {
					'anthropic-version': '2023-06-01',
					'anthropic-beta': 'files-api-2025-04-14',
				},
			},
		);
	});

	it('should include prompt-tools beta when enableAnthropicBetas.promptTools is true', async () => {
		executeFunctionsMock.getCredentials.mockResolvedValue({});

		await apiRequest.call(executeFunctionsMock, 'POST', '/v1/messages', {
			enableAnthropicBetas: {
				promptTools: true,
			},
		});

		expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'anthropicApi',
			{
				method: 'POST',
				url: 'https://api.anthropic.com/v1/messages',
				json: true,
				headers: {
					'anthropic-version': '2023-06-01',
					'anthropic-beta': 'files-api-2025-04-14,prompt-tools-2025-04-02',
				},
			},
		);
	});

	it('should include code-execution beta when enableAnthropicBetas.codeExecution is true', async () => {
		executeFunctionsMock.getCredentials.mockResolvedValue({});

		await apiRequest.call(executeFunctionsMock, 'POST', '/v1/messages', {
			enableAnthropicBetas: {
				codeExecution: true,
			},
		});

		expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'anthropicApi',
			{
				method: 'POST',
				url: 'https://api.anthropic.com/v1/messages',
				json: true,
				headers: {
					'anthropic-version': '2023-06-01',
					'anthropic-beta': 'files-api-2025-04-14,code-execution-2025-05-22',
				},
			},
		);
	});

	it('should include both beta features when both are enabled', async () => {
		executeFunctionsMock.getCredentials.mockResolvedValue({});

		await apiRequest.call(executeFunctionsMock, 'POST', '/v1/messages', {
			enableAnthropicBetas: {
				promptTools: true,
				codeExecution: true,
			},
		});

		expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'anthropicApi',
			{
				method: 'POST',
				url: 'https://api.anthropic.com/v1/messages',
				json: true,
				headers: {
					'anthropic-version': '2023-06-01',
					'anthropic-beta':
						'files-api-2025-04-14,prompt-tools-2025-04-02,code-execution-2025-05-22',
				},
			},
		);
	});
});
