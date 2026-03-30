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

	it('should include agentOptions with TLS fields when sslCertificatesEnabled is true', async () => {
		mockedExecutionContext.getCredentials.mockResolvedValue({
			sslCertificatesEnabled: true,
			ca: '-----BEGIN CERTIFICATE-----\nCA\n-----END CERTIFICATE-----',
			cert: '-----BEGIN CERTIFICATE-----\nCERT\n-----END CERTIFICATE-----',
			key: '-----BEGIN PRIVATE KEY-----\nKEY\n-----END PRIVATE KEY-----',
			passphrase: 'secret',
		});

		await apiRequest.call(mockedExecutionContext as unknown as IExecuteFunctions, 'GET', '/test');

		expect(mockedExecutionContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'openAiApi',
			expect.objectContaining({
				agentOptions: {
					ca: '-----BEGIN CERTIFICATE-----\nCA\n-----END CERTIFICATE-----',
					cert: '-----BEGIN CERTIFICATE-----\nCERT\n-----END CERTIFICATE-----',
					key: '-----BEGIN PRIVATE KEY-----\nKEY\n-----END PRIVATE KEY-----',
					passphrase: 'secret',
				},
			}),
		);
	});

	it('should not include agentOptions when sslCertificatesEnabled is false', async () => {
		mockedExecutionContext.getCredentials.mockResolvedValue({
			sslCertificatesEnabled: false,
			cert: '-----BEGIN CERTIFICATE-----\nCERT\n-----END CERTIFICATE-----',
			key: '-----BEGIN PRIVATE KEY-----\nKEY\n-----END PRIVATE KEY-----',
		});

		await apiRequest.call(mockedExecutionContext as unknown as IExecuteFunctions, 'GET', '/test');

		expect(mockedExecutionContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'openAiApi',
			expect.not.objectContaining({ agentOptions: expect.anything() }),
		);
	});

	it('should not include agentOptions when sslCertificatesEnabled is true but all cert fields are empty', async () => {
		mockedExecutionContext.getCredentials.mockResolvedValue({
			sslCertificatesEnabled: true,
			ca: '',
			cert: '',
			key: '',
			passphrase: '',
		});

		await apiRequest.call(mockedExecutionContext as unknown as IExecuteFunctions, 'GET', '/test');

		expect(mockedExecutionContext.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'openAiApi',
			expect.not.objectContaining({ agentOptions: expect.anything() }),
		);
	});
});
