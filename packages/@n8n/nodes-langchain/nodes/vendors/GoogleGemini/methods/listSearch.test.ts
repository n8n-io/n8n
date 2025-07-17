import { mock } from 'jest-mock-extended';
import type { ILoadOptionsFunctions } from 'n8n-workflow';

import {
	audioModelSearch,
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
	],
};

describe('GoogleGemini -> listSearch', () => {
	const mockExecuteFunctions = mock<ILoadOptionsFunctions>();
	const apiRequestMock = jest.spyOn(transport, 'apiRequest');

	beforeEach(() => {
		jest.clearAllMocks();
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
						name: 'models/gemma-3-1b-it',
						value: 'models/gemma-3-1b-it',
					},
					{
						name: 'models/gemini-2.5-flash-preview-native-audio-dialog',
						value: 'models/gemini-2.5-flash-preview-native-audio-dialog',
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
						name: 'models/imagen-3.0-generate-002',
						value: 'models/imagen-3.0-generate-002',
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
