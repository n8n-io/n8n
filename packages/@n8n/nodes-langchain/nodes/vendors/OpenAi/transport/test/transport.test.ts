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

	it('should add TLS agent options when SSL certificates are configured', async () => {
		mockedExecutionContext.getCredentials.mockResolvedValue({
			sslCertificatesEnabled: true,
			ca: 'ca\\ncert',
			cert: 'client\\ncert',
			key: 'client\\nkey',
			passphrase: 'secret',
		});

		await apiRequest.call(mockedExecutionContext as unknown as IExecuteFunctions, 'GET', '/test');

		expect(mockedExecutionContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'openAiApi',
			expect.objectContaining({
				agentOptions: {
					ca: 'ca\ncert',
					cert: 'client\ncert',
					key: 'client\nkey',
					passphrase: 'secret',
				},
			}),
		);
	});

	it('should not add TLS agent options when SSL certificates are disabled', async () => {
		mockedExecutionContext.getCredentials.mockResolvedValue({
			sslCertificatesEnabled: false,
			ca: 'ca',
			cert: 'client-cert',
			key: 'client-key',
		});

		await apiRequest.call(mockedExecutionContext as unknown as IExecuteFunctions, 'GET', '/test');

		expect(mockedExecutionContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'openAiApi',
			expect.not.objectContaining({ agentOptions: expect.anything() }),
		);
	});
});
