import { mockDeep } from 'jest-mock-extended';
import type { ILoadOptionsFunctions } from 'n8n-workflow';

import * as transport from '../transport';
import { modelSearch } from './listSearch';

describe('Ollama List Search Methods', () => {
	const loadOptionsFunctionsMock = mockDeep<ILoadOptionsFunctions>();
	const apiRequestMock = jest.spyOn(transport, 'apiRequest');

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('modelSearch', () => {
		it('should return all models when no filter is provided', async () => {
			apiRequestMock.mockResolvedValue({
				models: [
					{ name: 'llama3.2:latest' },
					{ name: 'llama3.2:3b' },
					{ name: 'codellama:latest' },
					{ name: 'mistral:7b' },
					{ name: 'phi3:latest' },
				],
			});

			const result = await modelSearch.call(loadOptionsFunctionsMock);

			expect(result).toEqual({
				results: [
					{ name: 'llama3.2:latest', value: 'llama3.2:latest' },
					{ name: 'llama3.2:3b', value: 'llama3.2:3b' },
					{ name: 'codellama:latest', value: 'codellama:latest' },
					{ name: 'mistral:7b', value: 'mistral:7b' },
					{ name: 'phi3:latest', value: 'phi3:latest' },
				],
			});
			expect(apiRequestMock).toHaveBeenCalledWith('GET', '/api/tags');
		});

		it('should filter models by name (case insensitive)', async () => {
			apiRequestMock.mockResolvedValue({
				models: [
					{ name: 'llama3.2:latest' },
					{ name: 'llama3.2:3b' },
					{ name: 'codellama:latest' },
					{ name: 'mistral:7b' },
					{ name: 'phi3:latest' },
				],
			});

			const result = await modelSearch.call(loadOptionsFunctionsMock, 'llama');

			expect(result).toEqual({
				results: [
					{ name: 'llama3.2:latest', value: 'llama3.2:latest' },
					{ name: 'llama3.2:3b', value: 'llama3.2:3b' },
					{ name: 'codellama:latest', value: 'codellama:latest' },
				],
			});
		});

		it('should handle case insensitive filtering', async () => {
			apiRequestMock.mockResolvedValue({
				models: [{ name: 'Llama3.2:latest' }, { name: 'CODELLAMA:latest' }, { name: 'mistral:7b' }],
			});

			const result = await modelSearch.call(loadOptionsFunctionsMock, 'LLAMA');

			expect(result).toEqual({
				results: [
					{ name: 'Llama3.2:latest', value: 'Llama3.2:latest' },
					{ name: 'CODELLAMA:latest', value: 'CODELLAMA:latest' },
				],
			});
		});

		it('should return empty results when filter matches no models', async () => {
			apiRequestMock.mockResolvedValue({
				models: [{ name: 'llama3.2:latest' }, { name: 'mistral:7b' }],
			});

			const result = await modelSearch.call(loadOptionsFunctionsMock, 'gpt');

			expect(result).toEqual({
				results: [],
			});
		});

		it('should handle empty model list', async () => {
			apiRequestMock.mockResolvedValue({
				models: [],
			});

			const result = await modelSearch.call(loadOptionsFunctionsMock);

			expect(result).toEqual({
				results: [],
			});
		});

		it('should handle partial string matching', async () => {
			apiRequestMock.mockResolvedValue({
				models: [
					{ name: 'llama3.2:3b-instruct' },
					{ name: 'llama3.2:7b' },
					{ name: 'mistral:3b-instruct' },
					{ name: 'phi3:3b' },
				],
			});

			const result = await modelSearch.call(loadOptionsFunctionsMock, '3b');

			expect(result).toEqual({
				results: [
					{ name: 'llama3.2:3b-instruct', value: 'llama3.2:3b-instruct' },
					{ name: 'mistral:3b-instruct', value: 'mistral:3b-instruct' },
					{ name: 'phi3:3b', value: 'phi3:3b' },
				],
			});
		});

		it('should filter by tag', async () => {
			apiRequestMock.mockResolvedValue({
				models: [
					{ name: 'llama3.2:latest' },
					{ name: 'llama3.2:3b' },
					{ name: 'mistral:latest' },
					{ name: 'codellama:7b' },
				],
			});

			const result = await modelSearch.call(loadOptionsFunctionsMock, 'latest');

			expect(result).toEqual({
				results: [
					{ name: 'llama3.2:latest', value: 'llama3.2:latest' },
					{ name: 'mistral:latest', value: 'mistral:latest' },
				],
			});
		});

		it('should handle special characters in filter', async () => {
			apiRequestMock.mockResolvedValue({
				models: [
					{ name: 'llama3.2:latest' },
					{ name: 'model-with-dash:1.0' },
					{ name: 'model_with_underscore:2.0' },
				],
			});

			const result = await modelSearch.call(loadOptionsFunctionsMock, 'with-dash');

			expect(result).toEqual({
				results: [{ name: 'model-with-dash:1.0', value: 'model-with-dash:1.0' }],
			});
		});

		it('should handle undefined filter as no filter', async () => {
			apiRequestMock.mockResolvedValue({
				models: [{ name: 'llama3.2:latest' }, { name: 'mistral:7b' }],
			});

			const result = await modelSearch.call(loadOptionsFunctionsMock, undefined);

			expect(result).toEqual({
				results: [
					{ name: 'llama3.2:latest', value: 'llama3.2:latest' },
					{ name: 'mistral:7b', value: 'mistral:7b' },
				],
			});
		});

		it('should handle empty string filter as no filter', async () => {
			apiRequestMock.mockResolvedValue({
				models: [{ name: 'llama3.2:latest' }, { name: 'mistral:7b' }],
			});

			const result = await modelSearch.call(loadOptionsFunctionsMock, '');

			expect(result).toEqual({
				results: [
					{ name: 'llama3.2:latest', value: 'llama3.2:latest' },
					{ name: 'mistral:7b', value: 'mistral:7b' },
				],
			});
		});
	});
});
