import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath, requestUrl } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { apiRequest } from '.';

describe('Moonshot transport', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should call httpRequestWithAuthentication with correct parameters', async () => {
		executeFunctionsMock.getCredentials.mockResolvedValue({
			url: 'https://api.moonshot.ai/v1',
		});

		await apiRequest.call(executeFunctionsMock, 'POST', requestPath`/chat/completions`, {
			body: {
				model: 'kimi-k2.6',
				messages: [{ role: 'user', content: 'Hello' }],
			},
		});

		expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'moonshotApi',
			{
				method: 'POST',
				url: requestUrl`https://api.moonshot.ai/v1/chat/completions`,
				json: true,
				body: {
					model: 'kimi-k2.6',
					messages: [{ role: 'user', content: 'Hello' }],
				},
				headers: {},
			},
		);
	});

	it('should use the default url if no custom url is provided', async () => {
		executeFunctionsMock.getCredentials.mockResolvedValue({});

		await apiRequest.call(executeFunctionsMock, 'GET', requestPath`/models`);

		expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'moonshotApi',
			{
				method: 'GET',
				url: requestUrl`https://api.moonshot.ai/v1/models`,
				json: true,
				headers: {},
			},
		);
	});

	it('should encode path values that contain a slash', async () => {
		executeFunctionsMock.getCredentials.mockResolvedValue({});

		await apiRequest.call(
			executeFunctionsMock,
			'GET',
			requestPath`/files/${'file_1/models'}/content`,
		);

		expect(
			String(executeFunctionsMock.helpers.httpRequestWithAuthentication.mock.calls[0][1].url),
		).toBe('https://api.moonshot.ai/v1/files/file_1%2Fmodels/content');
	});
});
