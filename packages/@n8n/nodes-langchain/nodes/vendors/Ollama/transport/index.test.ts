import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import { apiRequest } from './index';

describe('Ollama Transport', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();
	const loadOptionsFunctionsMock = mockDeep<ILoadOptionsFunctions>();

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('apiRequest', () => {
		it('should make API request with basic auth', async () => {
			executeFunctionsMock.getCredentials.mockResolvedValue({
				baseUrl: 'http://localhost:11434',
				apiKey: 'test-api-key',
			});
			executeFunctionsMock.helpers.httpRequestWithAuthentication.mockResolvedValue({
				model: 'test-model',
				response: 'test response',
			});

			const result = await apiRequest.call(executeFunctionsMock, 'POST', '/api/chat', {
				body: { model: 'test-model', messages: [] },
			});

			expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'ollamaApi',
				{
					headers: {
						'Content-Type': 'application/json',
						Authorization: 'Bearer test-api-key',
					},
					method: 'POST',
					body: { model: 'test-model', messages: [] },
					qs: undefined,
					url: 'http://localhost:11434/api/chat',
					json: true,
				},
			);
			expect(result).toEqual({ model: 'test-model', response: 'test response' });
		});

		it('should make API request without auth when no API key provided', async () => {
			executeFunctionsMock.getCredentials.mockResolvedValue({
				baseUrl: 'http://localhost:11434',
			});
			executeFunctionsMock.helpers.httpRequestWithAuthentication.mockResolvedValue({
				model: 'test-model',
				response: 'test response',
			});

			await apiRequest.call(executeFunctionsMock, 'GET', '/api/tags');

			expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'ollamaApi',
				{
					headers: {
						'Content-Type': 'application/json',
					},
					method: 'GET',
					body: undefined,
					qs: undefined,
					url: 'http://localhost:11434/api/tags',
					json: true,
				},
			);
		});

		it('should handle query parameters', async () => {
			executeFunctionsMock.getCredentials.mockResolvedValue({
				baseUrl: 'http://localhost:11434',
			});
			executeFunctionsMock.helpers.httpRequestWithAuthentication.mockResolvedValue([]);

			await apiRequest.call(executeFunctionsMock, 'GET', '/api/tags', {
				qs: { limit: 10, offset: 0 },
			});

			expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'ollamaApi',
				{
					headers: {
						'Content-Type': 'application/json',
					},
					method: 'GET',
					body: undefined,
					qs: { limit: 10, offset: 0 },
					url: 'http://localhost:11434/api/tags',
					json: true,
				},
			);
		});

		it('should handle custom headers', async () => {
			executeFunctionsMock.getCredentials.mockResolvedValue({
				baseUrl: 'http://localhost:11434',
				apiKey: 'test-key',
			});
			executeFunctionsMock.helpers.httpRequestWithAuthentication.mockResolvedValue({});

			await apiRequest.call(executeFunctionsMock, 'POST', '/api/generate', {
				headers: { 'X-Custom-Header': 'custom-value' },
				body: { model: 'test', prompt: 'hello' },
			});

			expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'ollamaApi',
				{
					headers: {
						'Content-Type': 'application/json',
						Authorization: 'Bearer test-key',
						'X-Custom-Header': 'custom-value',
					},
					method: 'POST',
					body: { model: 'test', prompt: 'hello' },
					qs: undefined,
					url: 'http://localhost:11434/api/generate',
					json: true,
				},
			);
		});

		it('should handle additional options', async () => {
			executeFunctionsMock.getCredentials.mockResolvedValue({
				baseUrl: 'http://localhost:11434',
			});
			executeFunctionsMock.helpers.httpRequestWithAuthentication.mockResolvedValue({});

			await apiRequest.call(executeFunctionsMock, 'POST', '/api/chat', {
				body: { model: 'test' },
				option: { timeout: 30000, encoding: 'utf8' },
			});

			expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'ollamaApi',
				{
					headers: {
						'Content-Type': 'application/json',
					},
					method: 'POST',
					body: { model: 'test' },
					qs: undefined,
					url: 'http://localhost:11434/api/chat',
					json: true,
					timeout: 30000,
					encoding: 'utf8',
				},
			);
		});

		it('should work with ILoadOptionsFunctions', async () => {
			loadOptionsFunctionsMock.getCredentials.mockResolvedValue({
				baseUrl: 'http://localhost:11434',
			});
			loadOptionsFunctionsMock.helpers.httpRequestWithAuthentication.mockResolvedValue({
				models: [{ name: 'llama3.2:latest' }],
			});

			const result = await apiRequest.call(loadOptionsFunctionsMock, 'GET', '/api/tags');

			expect(loadOptionsFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'ollamaApi',
				{
					headers: {
						'Content-Type': 'application/json',
					},
					method: 'GET',
					body: undefined,
					qs: undefined,
					url: 'http://localhost:11434/api/tags',
					json: true,
				},
			);
			expect(result).toEqual({ models: [{ name: 'llama3.2:latest' }] });
		});

		it('should handle baseUrl with trailing slash', async () => {
			executeFunctionsMock.getCredentials.mockResolvedValue({
				baseUrl: 'http://localhost:11434/',
				apiKey: 'test-key',
			});
			executeFunctionsMock.helpers.httpRequestWithAuthentication.mockResolvedValue({});

			await apiRequest.call(executeFunctionsMock, 'GET', '/api/tags');

			expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'ollamaApi',
				expect.objectContaining({
					url: 'http://localhost:11434/api/tags',
				}),
			);
		});

		it('should handle empty parameters object', async () => {
			executeFunctionsMock.getCredentials.mockResolvedValue({
				baseUrl: 'http://localhost:11434',
			});
			executeFunctionsMock.helpers.httpRequestWithAuthentication.mockResolvedValue({});

			await apiRequest.call(executeFunctionsMock, 'GET', '/api/tags', {});

			expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'ollamaApi',
				{
					headers: {
						'Content-Type': 'application/json',
					},
					method: 'GET',
					body: undefined,
					qs: undefined,
					url: 'http://localhost:11434/api/tags',
					json: true,
				},
			);
		});

		it('should handle undefined parameters', async () => {
			executeFunctionsMock.getCredentials.mockResolvedValue({
				baseUrl: 'http://localhost:11434',
			});
			executeFunctionsMock.helpers.httpRequestWithAuthentication.mockResolvedValue({});

			await apiRequest.call(executeFunctionsMock, 'GET', '/api/tags');

			expect(executeFunctionsMock.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'ollamaApi',
				{
					headers: {
						'Content-Type': 'application/json',
					},
					method: 'GET',
					body: undefined,
					qs: undefined,
					url: 'http://localhost:11434/api/tags',
					json: true,
				},
			);
		});
	});
});
