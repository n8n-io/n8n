import { mock } from 'jest-mock-extended';
import type { ILoadOptionsFunctions } from 'n8n-workflow';

jest.mock('../transport', () => ({
	apiRequest: jest.fn(),
}));

import {
	textModelSearch,
	visionModelSearch,
	imageGenerationModelSearch,
	textToVideoModelSearch,
	imageToVideoModelSearch,
} from '../methods/listSearch';
import { apiRequest } from '../transport';

const mockApiRequest = apiRequest as jest.Mock;

describe('AlibabaCloud listSearch', () => {
	let mockLoadOptionsFunctions: ReturnType<typeof mock<ILoadOptionsFunctions>>;

	beforeEach(() => {
		mockLoadOptionsFunctions = mock<ILoadOptionsFunctions>();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	const setupMockModels = (models: string[]) => {
		mockApiRequest.mockResolvedValue({
			data: models.map((m) => ({ id: m })),
		});
	};

	const allModels = [
		'qwen3.5-flash',
		'qwen3.5-plus',
		'qwen3-max',
		'qwen3-vl-flash',
		'qwen3-vl-plus',
		'qvq-72b-preview',
		'qwen-image',
		'qwen-image-plus',
		'wan2.6-t2i',
		'z-image-turbo',
		'wan2.6-t2v',
		'wan2.6-i2v',
		'wan2.6-i2v-flash',
		'qwen-coder-turbo',
		'deepseek-v3',
	];

	describe('textModelSearch', () => {
		it('should return only text models (excluding media models)', async () => {
			setupMockModels(allModels);

			const result = await textModelSearch.call(mockLoadOptionsFunctions);

			const values = result.results.map((r) => r.value);
			expect(values).toContain('qwen3.5-flash');
			expect(values).toContain('qwen3.5-plus');
			expect(values).toContain('qwen3-max');
			expect(values).toContain('qwen-coder-turbo');
			expect(values).toContain('deepseek-v3');
			expect(values).not.toContain('qwen3-vl-flash');
			expect(values).not.toContain('qwen-image');
			expect(values).not.toContain('wan2.6-t2v');
			expect(values).not.toContain('wan2.6-i2v');
		});

		it('should apply search filter', async () => {
			setupMockModels(allModels);

			const result = await textModelSearch.call(mockLoadOptionsFunctions, 'flash');

			const values = result.results.map((r) => r.value);
			expect(values).toContain('qwen3.5-flash');
			expect(values).not.toContain('qwen3.5-plus');
		});
	});

	describe('visionModelSearch', () => {
		it('should return only vision models', async () => {
			setupMockModels(allModels);

			const result = await visionModelSearch.call(mockLoadOptionsFunctions);

			const values = result.results.map((r) => r.value);
			expect(values).toContain('qwen3-vl-flash');
			expect(values).toContain('qwen3-vl-plus');
			expect(values).toContain('qvq-72b-preview');
			expect(values).not.toContain('qwen3.5-flash');
			expect(values).not.toContain('qwen-image');
		});
	});

	describe('imageGenerationModelSearch', () => {
		it('should return only image generation models', async () => {
			setupMockModels(allModels);

			const result = await imageGenerationModelSearch.call(mockLoadOptionsFunctions);

			const values = result.results.map((r) => r.value);
			expect(values).toContain('qwen-image');
			expect(values).toContain('qwen-image-plus');
			expect(values).toContain('wan2.6-t2i');
			expect(values).not.toContain('qwen3.5-flash');
			expect(values).not.toContain('wan2.6-t2v');
		});
	});

	describe('textToVideoModelSearch', () => {
		it('should return only text-to-video models', async () => {
			setupMockModels(allModels);

			const result = await textToVideoModelSearch.call(mockLoadOptionsFunctions);

			const values = result.results.map((r) => r.value);
			expect(values).toContain('wan2.6-t2v');
			expect(values).not.toContain('wan2.6-i2v');
			expect(values).not.toContain('qwen3.5-flash');
		});
	});

	describe('imageToVideoModelSearch', () => {
		it('should return only image-to-video models', async () => {
			setupMockModels(allModels);

			const result = await imageToVideoModelSearch.call(mockLoadOptionsFunctions);

			const values = result.results.map((r) => r.value);
			expect(values).toContain('wan2.6-i2v');
			expect(values).toContain('wan2.6-i2v-flash');
			expect(values).not.toContain('wan2.6-t2v');
			expect(values).not.toContain('qwen3.5-flash');
		});
	});

	describe('pagination', () => {
		it('should paginate through multiple pages', async () => {
			const page1Models = Array.from({ length: 100 }, (_, i) => `model-${i}`);
			const page2Models = ['qwen3.5-flash', 'qwen3-vl-plus'];

			mockApiRequest
				.mockResolvedValueOnce({
					data: page1Models.map((m) => ({ id: m })),
				})
				.mockResolvedValueOnce({
					data: page2Models.map((m) => ({ id: m })),
				});

			const result = await textModelSearch.call(mockLoadOptionsFunctions);

			expect(mockApiRequest).toHaveBeenCalledTimes(2);
			expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/v1/models', {
				qs: { page_no: 1, page_size: 100 },
			});
			expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/v1/models', {
				qs: { page_no: 2, page_size: 100 },
			});

			const values = result.results.map((r) => r.value);
			expect(values).toContain('qwen3.5-flash');
		});

		it('should stop paginating when a page returns fewer items than page size', async () => {
			setupMockModels(['qwen3.5-flash']);

			await textModelSearch.call(mockLoadOptionsFunctions);

			expect(mockApiRequest).toHaveBeenCalledTimes(1);
		});
	});
});
