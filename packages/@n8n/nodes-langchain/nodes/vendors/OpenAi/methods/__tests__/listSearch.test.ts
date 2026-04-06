import type { ILoadOptionsFunctions } from 'n8n-workflow';

import * as transport from '../../transport';
import { imageModelSearch, modelSearch } from '../listSearch';

jest.mock('../../transport');

describe('modelSearch', () => {
	let mockContext: jest.Mocked<ILoadOptionsFunctions>;

	beforeEach(() => {
		mockContext = {
			getCredentials: jest.fn(),
		} as unknown as jest.Mocked<ILoadOptionsFunctions>;

		jest.clearAllMocks();
	});

	describe('Official OpenAI API', () => {
		it('should return filtered models when using official OpenAI API', async () => {
			mockContext.getCredentials.mockResolvedValue({
				url: 'https://api.openai.com/v1',
			});

			(transport.apiRequest as jest.Mock).mockResolvedValue({
				data: [
					{ id: 'gpt-4' },
					{ id: 'gpt-3.5-turbo' },
					{ id: 'babbage-002' },
					{ id: 'whisper-1' },
					{ id: 'dall-e-3' },
					{ id: 'gpt-4o-realtime-preview' },
				],
			});

			const result = await modelSearch.call(mockContext);

			expect(result.results).toEqual([
				{ name: 'GPT-3.5-TURBO', value: 'gpt-3.5-turbo' },
				{ name: 'GPT-4', value: 'gpt-4' },
			]);
		});

		it('should treat ai-assistant.n8n.io as official API', async () => {
			mockContext.getCredentials.mockResolvedValue({
				url: 'https://ai-assistant.n8n.io/v1',
			});

			(transport.apiRequest as jest.Mock).mockResolvedValue({
				data: [{ id: 'gpt-4' }, { id: 'whisper-1' }, { id: 'dall-e-2' }],
			});

			const result = await modelSearch.call(mockContext);

			expect(result.results).toEqual([{ name: 'GPT-4', value: 'gpt-4' }]);
		});
	});

	describe('Custom API', () => {
		it('should include all models for custom API endpoints', async () => {
			mockContext.getCredentials.mockResolvedValue({
				url: 'https://custom-llm-provider.com/v1',
			});

			(transport.apiRequest as jest.Mock).mockResolvedValue({
				data: [
					{ id: 'llama-3-70b' },
					{ id: 'mistral-large' },
					{ id: 'babbage-002' },
					{ id: 'whisper-1' },
					{ id: 'custom-model' },
				],
			});

			const result = await modelSearch.call(mockContext);

			expect(result.results).toEqual([
				{ name: 'BABBAGE-002', value: 'babbage-002' },
				{ name: 'CUSTOM-MODEL', value: 'custom-model' },
				{ name: 'LLAMA-3-70B', value: 'llama-3-70b' },
				{ name: 'MISTRAL-LARGE', value: 'mistral-large' },
				{ name: 'WHISPER-1', value: 'whisper-1' },
			]);
		});
	});
});

describe('imageModelSearch', () => {
	let mockContext: jest.Mocked<ILoadOptionsFunctions>;

	beforeEach(() => {
		mockContext = {
			getCredentials: jest.fn(),
		} as unknown as jest.Mocked<ILoadOptionsFunctions>;

		jest.clearAllMocks();
	});

	describe('Official OpenAI API', () => {
		it('should return only vision-capable models', async () => {
			mockContext.getCredentials.mockResolvedValue({
				url: 'https://api.openai.com/v1',
			});

			(transport.apiRequest as jest.Mock).mockResolvedValue({
				data: [
					{ id: 'gpt-4o' },
					{ id: 'gpt-4.1' },
					{ id: 'gpt-4.1-mini' },
					{ id: 'o3' },
					{ id: 'o4-mini' },
					{ id: 'gpt-3.5-turbo' },
					{ id: 'o3-mini' },
					{ id: 'gpt-4o-audio-preview' },
					{ id: 'gpt-4o-search-preview' },
					{ id: 'gpt-4o-transcribe' },
					{ id: 'whisper-1' },
					{ id: 'dall-e-3' },
				],
			});

			const result = await imageModelSearch.call(mockContext);

			expect(result.results).toEqual([
				{ name: 'GPT-4.1', value: 'gpt-4.1' },
				{ name: 'GPT-4.1-MINI', value: 'gpt-4.1-mini' },
				{ name: 'GPT-4O', value: 'gpt-4o' },
				{ name: 'O3', value: 'o3' },
				{ name: 'O4-MINI', value: 'o4-mini' },
			]);
		});
	});

	describe('Custom API', () => {
		it('should include all models for custom API endpoints', async () => {
			mockContext.getCredentials.mockResolvedValue({
				url: 'https://openrouter.ai/api/v1',
			});

			(transport.apiRequest as jest.Mock).mockResolvedValue({
				data: [
					{ id: 'llava-v1.5' },
					{ id: 'custom-vision-model' },
					{ id: 'gpt-3.5-turbo' },
					{ id: 'o3-mini' },
					{ id: 'gpt-4o-audio-preview' },
				],
			});

			const result = await imageModelSearch.call(mockContext);

			expect(result.results).toEqual([
				{ name: 'CUSTOM-VISION-MODEL', value: 'custom-vision-model' },
				{ name: 'GPT-3.5-TURBO', value: 'gpt-3.5-turbo' },
				{ name: 'GPT-4O-AUDIO-PREVIEW', value: 'gpt-4o-audio-preview' },
				{ name: 'LLAVA-V1.5', value: 'llava-v1.5' },
				{ name: 'O3-MINI', value: 'o3-mini' },
			]);
		});
	});
});
