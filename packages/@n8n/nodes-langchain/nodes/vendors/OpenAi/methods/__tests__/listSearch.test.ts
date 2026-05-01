import type { ILoadOptionsFunctions } from 'n8n-workflow';

import * as transport from '../../transport';
import { imageGenerateModelSearch, imageModelSearch, modelSearch } from '../listSearch';

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
		mockContext = {} as unknown as jest.Mocked<ILoadOptionsFunctions>;
		jest.clearAllMocks();
	});

	it('should return models that support image analysis', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValue({
			data: [
				{ id: 'gpt-5' },
				{ id: 'gpt-4o' },
				{ id: 'gpt-4.1' },
				{ id: 'gpt-4-turbo' },
				{ id: 'o1' },
				{ id: 'o3' },
				{ id: 'o4-mini' },
				{ id: 'chatgpt-4o-latest' },
				{ id: 'gpt-4o-mini-vision' },
				{ id: 'dall-e-3' },
				{ id: 'whisper-1' },
				{ id: 'tts-1' },
			],
		});

		const result = await imageModelSearch.call(mockContext);

		expect(result.results).toEqual([
			{ name: 'CHATGPT-4O-LATEST', value: 'chatgpt-4o-latest' },
			{ name: 'GPT-4-TURBO', value: 'gpt-4-turbo' },
			{ name: 'GPT-4.1', value: 'gpt-4.1' },
			{ name: 'GPT-4O', value: 'gpt-4o' },
			{ name: 'GPT-4O-MINI-VISION', value: 'gpt-4o-mini-vision' },
			{ name: 'GPT-5', value: 'gpt-5' },
			{ name: 'O1', value: 'o1' },
			{ name: 'O3', value: 'o3' },
			{ name: 'O4-MINI', value: 'o4-mini' },
		]);
	});

	it('should exclude irrelevant model variants', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValue({
			data: [
				{ id: 'gpt-4o' },
				{ id: 'gpt-4o-transcribe' },
				{ id: 'gpt-4o-mini-diarize' },
				{ id: 'gpt-4o-search-preview' },
				{ id: 'gpt-4o-audio-preview' },
				{ id: 'gpt-4o-realtime-preview' },
			],
		});

		const result = await imageModelSearch.call(mockContext);

		expect(result.results).toEqual([{ name: 'GPT-4O', value: 'gpt-4o' }]);
	});
});

describe('imageGenerateModelSearch', () => {
	let mockContext: jest.Mocked<ILoadOptionsFunctions>;

	beforeEach(() => {
		mockContext = {} as unknown as jest.Mocked<ILoadOptionsFunctions>;
		jest.clearAllMocks();
	});

	it('should return only image generation models (dall-e and gpt-image)', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValue({
			data: [
				{ id: 'dall-e-2' },
				{ id: 'dall-e-3' },
				{ id: 'gpt-image-1' },
				{ id: 'gpt-image-1-mini' },
				{ id: 'gpt-4o' },
				{ id: 'whisper-1' },
				{ id: 'tts-1' },
			],
		});

		const result = await imageGenerateModelSearch.call(mockContext);

		expect(result.results).toEqual([
			{ name: 'DALL-E-2', value: 'dall-e-2' },
			{ name: 'DALL-E-3', value: 'dall-e-3' },
			{ name: 'GPT-IMAGE-1', value: 'gpt-image-1' },
			{ name: 'GPT-IMAGE-1-MINI', value: 'gpt-image-1-mini' },
		]);
	});

	it('should filter results by search term', async () => {
		(transport.apiRequest as jest.Mock).mockResolvedValue({
			data: [{ id: 'dall-e-2' }, { id: 'dall-e-3' }, { id: 'gpt-image-1' }],
		});

		const result = await imageGenerateModelSearch.call(mockContext, 'dall');

		expect(result.results).toEqual([
			{ name: 'DALL-E-2', value: 'dall-e-2' },
			{ name: 'DALL-E-3', value: 'dall-e-3' },
		]);
	});
});
