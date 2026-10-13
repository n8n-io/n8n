import type { ILoadOptionsFunctions } from 'n8n-workflow';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import {
	audioModelSearch,
	imageEditModelSearch,
	imageGenerationModelSearch,
	modelSearch,
	videoGenerationModelSearch,
} from './listSearch';
import * as transport from '../transport';

const mockResponse = {
	models: [
		{
			name: 'models/gemini-pro-vision',
		},
		{
			name: 'models/gemini-2.5-flash',
		},
		{
			name: 'models/gemini-2.0-flash-exp-image-generation',
		},
		{
			name: 'models/gemini-2.5-pro-preview-tts',
		},
		{
			name: 'models/gemma-3-1b-it',
		},
		{
			name: 'models/embedding-001',
		},
		{
			name: 'models/imagen-3.0-generate-002',
		},
		{
			name: 'models/veo-2.0-generate-001',
		},
		{
			name: 'models/gemini-2.5-flash-preview-native-audio-dialog',
		},
		{
			name: 'models/gemini-2.5-flash-image',
		},
		{
			name: 'models/gemini-3-pro-image',
		},
		{
			name: 'models/gemini-3.1-flash-image-preview',
		},
		{
			name: 'models/gemini-nano-banana-2.1',
		},
		{
			name: 'models/gemini-3.1-flash-lite-image',
		},
	],
};

describe('GoogleGemini -> listSearch', () => {
	const mockExecuteFunctions = mock<ILoadOptionsFunctions>();
	let apiRequestMock: MockInstance;

	beforeEach(() => {
		vi.clearAllMocks();
		apiRequestMock = vi.spyOn(transport, 'apiRequest');
	});

	describe('modelSearch', () => {
		it('should return regular models', async () => {
			apiRequestMock.mockResolvedValue(mockResponse);

			const result = await modelSearch.call(mockExecuteFunctions);

			expect(result).toEqual({
				results: [
					{
						name: 'models/gemini-2.5-flash',
						value: 'models/gemini-2.5-flash',
					},
					{
						name: 'models/gemma-3-1b-it',
						value: 'models/gemma-3-1b-it',
					},
				],
			});
		});

		it('should return regular models with filter', async () => {
			apiRequestMock.mockResolvedValue(mockResponse);

			const result = await modelSearch.call(mockExecuteFunctions, 'Gemma');

			expect(result).toEqual({
				results: [
					{
						name: 'models/gemma-3-1b-it',
						value: 'models/gemma-3-1b-it',
					},
				],
			});
		});

		it('should label, sort and pin models', async () => {
			apiRequestMock.mockResolvedValue({
				models: [
					{ name: 'models/gemini-zeta' },
					{ name: 'models/gemini-featured', displayName: 'Gemini Featured', priority: 10 },
					{ name: 'models/gemini-2.5-pro' },
					{ name: 'models/gemini-api-named', displayName: 'Gemini Api Named' },
				],
			});

			const result = await modelSearch.call(mockExecuteFunctions);

			// The API's displayName labels a model, else its id. A priority pins a model.
			expect(result).toEqual({
				results: [
					{ name: 'Gemini Featured', value: 'models/gemini-featured' },
					{ name: 'Gemini Api Named', value: 'models/gemini-api-named' },
					{ name: 'models/gemini-2.5-pro', value: 'models/gemini-2.5-pro' },
					{ name: 'models/gemini-zeta', value: 'models/gemini-zeta' },
				],
			});
		});

		it('should match the filter against the label and the id', async () => {
			apiRequestMock.mockResolvedValue({
				models: [
					{ name: 'models/gemini-zeta' },
					{ name: 'models/gemini-2.5-pro', displayName: 'Gemini 2.5 Pro' },
				],
			});

			const byName = await modelSearch.call(mockExecuteFunctions, '2.5 Pro');
			const byId = await modelSearch.call(mockExecuteFunctions, 'gemini-zeta');

			expect(byName.results).toEqual([{ name: 'Gemini 2.5 Pro', value: 'models/gemini-2.5-pro' }]);
			expect(byId.results).toEqual([{ name: 'models/gemini-zeta', value: 'models/gemini-zeta' }]);
		});
	});

	describe('audioModelSearch', () => {
		it('should return audio models', async () => {
			apiRequestMock.mockResolvedValue(mockResponse);

			const result = await audioModelSearch.call(mockExecuteFunctions);

			expect(result).toEqual({
				results: [
					{
						name: 'models/gemini-2.5-flash',
						value: 'models/gemini-2.5-flash',
					},
					{
						name: 'models/gemini-2.5-flash-preview-native-audio-dialog',
						value: 'models/gemini-2.5-flash-preview-native-audio-dialog',
					},
					{
						name: 'models/gemma-3-1b-it',
						value: 'models/gemma-3-1b-it',
					},
				],
			});
		});
	});

	describe('imageModelSearch', () => {
		it('should return image models', async () => {
			apiRequestMock.mockResolvedValue(mockResponse);

			const result = await imageGenerationModelSearch.call(mockExecuteFunctions);

			expect(result).toEqual({
				results: [
					{
						name: 'models/gemini-2.0-flash-exp-image-generation',
						value: 'models/gemini-2.0-flash-exp-image-generation',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'models/gemini-2.5-flash-image (Nano Banana)',
						value: 'models/gemini-2.5-flash-image',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'models/gemini-3-pro-image (Nano Banana Pro)',
						value: 'models/gemini-3-pro-image',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'models/gemini-3.1-flash-image-preview (Nano Banana 2)',
						value: 'models/gemini-3.1-flash-image-preview',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'models/gemini-3.1-flash-lite-image (Nano Banana 2 Lite)',
						value: 'models/gemini-3.1-flash-lite-image',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'models/gemini-nano-banana-2.1 (Nano Banana 2.1)',
						value: 'models/gemini-nano-banana-2.1',
					},
					{
						name: 'models/imagen-3.0-generate-002',
						value: 'models/imagen-3.0-generate-002',
					},
				],
			});
		});

		it('should filter out image models', async () => {
			apiRequestMock.mockResolvedValue(mockResponse);

			const result = await imageGenerationModelSearch.call(mockExecuteFunctions, 'Exp');

			expect(result).toEqual({
				results: [
					{
						name: 'models/gemini-2.0-flash-exp-image-generation',
						value: 'models/gemini-2.0-flash-exp-image-generation',
					},
				],
			});
		});
	});

	describe('imageModelSearch with names from the API', () => {
		it('should match the filter against the id when the API names the model', async () => {
			apiRequestMock.mockResolvedValue({
				models: [{ name: 'models/gemini-2.5-flash-image', displayName: 'Gemini 2.5 Flash Image' }],
			});

			const result = await imageGenerationModelSearch.call(
				mockExecuteFunctions,
				'gemini-2.5-flash-image',
			);

			expect(result.results).toEqual([
				{
					name: 'Gemini 2.5 Flash Image (Nano Banana)',
					value: 'models/gemini-2.5-flash-image',
				},
			]);
		});
	});

	describe('imageEditModelSearch', () => {
		it('should return image edit models', async () => {
			apiRequestMock.mockResolvedValue(mockResponse);

			const result = await imageEditModelSearch.call(mockExecuteFunctions);

			expect(result).toEqual({
				results: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'models/gemini-2.5-flash-image (Nano Banana)',
						value: 'models/gemini-2.5-flash-image',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'models/gemini-3-pro-image (Nano Banana Pro)',
						value: 'models/gemini-3-pro-image',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'models/gemini-3.1-flash-image-preview (Nano Banana 2)',
						value: 'models/gemini-3.1-flash-image-preview',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'models/gemini-3.1-flash-lite-image (Nano Banana 2 Lite)',
						value: 'models/gemini-3.1-flash-lite-image',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'models/gemini-nano-banana-2.1 (Nano Banana 2.1)',
						value: 'models/gemini-nano-banana-2.1',
					},
				],
			});
		});

		it('should filter out image edit models', async () => {
			apiRequestMock.mockResolvedValue(mockResponse);

			const result = await imageEditModelSearch.call(mockExecuteFunctions, 'banana pro');

			expect(result).toEqual({
				results: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'models/gemini-3-pro-image (Nano Banana Pro)',
						value: 'models/gemini-3-pro-image',
					},
				],
			});
		});
	});

	describe('videoModelSearch', () => {
		it('should return video models', async () => {
			apiRequestMock.mockResolvedValue(mockResponse);

			const result = await videoGenerationModelSearch.call(mockExecuteFunctions);

			expect(result).toEqual({
				results: [
					{
						name: 'models/veo-2.0-generate-001',
						value: 'models/veo-2.0-generate-001',
					},
				],
			});
		});
	});
});
