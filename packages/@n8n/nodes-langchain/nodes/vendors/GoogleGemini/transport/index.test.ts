import type { IExecuteFunctions } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';
import { apiRequest } from '.';

describe('GoogleGemini transport', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should call httpRequestWithAuthentication with correct parameters', async () => {
		executeFunctionsMock.getCredentials.mockResolvedValue({
			url: 'https://custom-url.com',
		});

		await apiRequest.call(executeFunctionsMock, 'GET', '/v1beta/models', {
			headers: {
				'Content-Type': 'application/json',
			},
			body: {
				foo: 'bar',
			},
			qs: {
				test: 123,
			},
		});

		expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'googlePalmApi',
			{
				method: 'GET',
				url: 'https://custom-url.com/v1beta/models',
				json: true,
				body: {
					foo: 'bar',
				},
				qs: {
					test: 123,
				},
				headers: {
					'Content-Type': 'application/json',
				},
			},
		);
	});

	it('should use the default url if no custom url is provided', async () => {
		executeFunctionsMock.getCredentials.mockResolvedValue({});

		await apiRequest.call(executeFunctionsMock, 'GET', '/v1beta/models');

		expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'googlePalmApi',
			{
				method: 'GET',
				url: 'https://generativelanguage.googleapis.com/v1beta/models',
				json: true,
			},
		);
	});

	it('should override the values with `option`', async () => {
		executeFunctionsMock.getCredentials.mockResolvedValue({});

		await apiRequest.call(executeFunctionsMock, 'GET', '', {
			option: {
				url: 'https://custom-url.com',
				returnFullResponse: true,
			},
		});

		expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'googlePalmApi',
			{
				method: 'GET',
				url: 'https://custom-url.com',
				json: true,
				returnFullResponse: true,
			},
		);
	});
});
