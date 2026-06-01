import type { ILoadOptionsFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

vi.mock('../transport', () => ({
	apiRequest: vi.fn(),
}));

import { clearModelCatalogCache } from '../helpers/modelCatalog';
import {
	textModelSearch,
	visionModelSearch,
	imageGenerationModelSearch,
	textToVideoModelSearch,
	imageToVideoModelSearch,
} from '../methods/listSearch';
import { apiRequest } from '../transport';

const mockApiRequest = apiRequest as Mock;

interface ModelFixture {
	model: string;
	name?: string;
	request: string[];
	response: string[];
}

const m = (model: string, request: string[], response: string[], name?: string): ModelFixture => ({
	model,
	request,
	response,
	name,
});

// A representative slice of the Model Studio catalogue, classified purely by the
// input (request) and output (response) modalities the API reports.
const TEXT_ONLY = m('qwen3.7-max', ['Text'], ['Text']);
const TEXT_CODER = m('qwen-coder-turbo', ['Text'], ['Text']);
const TEXT_DEEPSEEK = m('deepseek-v3', ['Text'], ['Text']);
// Multimodal flagship: accepts images but still returns text-only output.
const VL_FLASH = m('qwen3.5-flash', ['Text', 'Image', 'Video'], ['Text']);
const VL_PLUS = m('qwen3-vl-plus', ['Image', 'Text', 'Video'], ['Text']);
const VL_REASONING = m('qvq-72b-preview', ['Image'], ['Text']);
// Omni model: returns text *and* audio, so it fits no single-modality action.
const OMNI = m('qwen3.5-omni-plus', ['Text', 'Image', 'Video', 'Audio'], ['Text', 'Audio']);
const IMAGE_GEN = m('qwen-image', ['Text'], ['Image']);
const IMAGE_TURBO = m('z-image-turbo', ['Text'], ['Image']);
const IMAGE_EDIT = m('qwen-image-edit', ['Text', 'Image'], ['Image']);
// Pure text-to-video.
const T2V_HAPPY = m('happyhorse-1.0-t2v', ['Text'], ['Video']);
// Text-to-video that also accepts an optional audio track (real wan modalities).
const T2V_AUDIO = m('wan2.6-t2v', ['Audio', 'Text'], ['Audio', 'Video']);
const T2V_WAN27 = m('wan2.7-t2v', ['Audio', 'Text'], ['Video']);
// Image-to-video, with an optional audio track.
const I2V = m('wan2.6-i2v', ['Audio', 'Image', 'Text'], ['Audio', 'Video']);
const I2V_REF = m('happyhorse-1.0-r2v', ['Image', 'Text'], ['Video']);
// Video editing: requires video input, so it is neither text- nor image-to-video.
const VIDEO_EDIT = m('happyhorse-1.0-video-edit', ['Image', 'Video'], ['Video']);

const allModels = [
	TEXT_ONLY,
	TEXT_CODER,
	TEXT_DEEPSEEK,
	VL_FLASH,
	VL_PLUS,
	VL_REASONING,
	OMNI,
	IMAGE_GEN,
	IMAGE_TURBO,
	IMAGE_EDIT,
	T2V_HAPPY,
	T2V_AUDIO,
	T2V_WAN27,
	I2V,
	I2V_REF,
	VIDEO_EDIT,
];

/**
 * Mocks the paginated `/api/v1/models` endpoint. `pageSize` controls how many
 * models each simulated page returns, independent of the size the production
 * code requests — letting us exercise multi-page fetching with small fixtures.
 */
const setupMockModels = (models: ModelFixture[], pageSize = 100) => {
	mockApiRequest.mockImplementation(
		(_method: string, _endpoint: string, opts?: { qs?: { page_no?: number } }) => {
			const pageNo = opts?.qs?.page_no ?? 1;
			const start = (pageNo - 1) * pageSize;
			const pageModels = models.slice(start, start + pageSize).map((model) => ({
				model: model.model,
				name: model.name ?? model.model,
				inference_metadata: {
					request_modality: model.request,
					response_modality: model.response,
				},
			}));
			return {
				output: {
					total: models.length,
					page_no: pageNo,
					page_size: pageSize,
					models: pageModels,
				},
			};
		},
	);
};

describe('AlibabaCloud listSearch', () => {
	let mockLoadOptionsFunctions: ReturnType<typeof mock<ILoadOptionsFunctions>>;

	beforeEach(() => {
		clearModelCatalogCache();
		mockLoadOptionsFunctions = mock<ILoadOptionsFunctions>();
		mockLoadOptionsFunctions.getCredentials.mockResolvedValue({
			url: 'https://dashscope-intl.aliyuncs.com',
			apiKey: 'test-key',
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('textModelSearch', () => {
		it('should return models with text-only output, including multimodal flagships', async () => {
			setupMockModels(allModels);

			const result = await textModelSearch.call(mockLoadOptionsFunctions);

			const values = result.results.map((r) => r.value);
			expect(values).toContain('qwen3.7-max');
			expect(values).toContain('qwen-coder-turbo');
			expect(values).toContain('deepseek-v3');
			// Multimodal models that still return text-only output are valid for chat.
			expect(values).toContain('qwen3.5-flash');
			expect(values).toContain('qwen3-vl-plus');
			// Excluded: media generators and mixed-output (omni) models.
			expect(values).not.toContain('qwen-image');
			expect(values).not.toContain('wan2.6-t2v');
			expect(values).not.toContain('wan2.6-i2v');
			expect(values).not.toContain('qwen3.5-omni-plus');
		});

		it('should apply the search filter to names and ids', async () => {
			setupMockModels(allModels);

			const result = await textModelSearch.call(mockLoadOptionsFunctions, 'coder');

			const values = result.results.map((r) => r.value);
			expect(values).toEqual(['qwen-coder-turbo']);
		});

		it('should return results sorted by name', async () => {
			setupMockModels(allModels);

			const result = await textModelSearch.call(mockLoadOptionsFunctions);

			const names = result.results.map((r) => r.name);
			expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
		});
	});

	describe('visionModelSearch', () => {
		it('should return only models that accept image input and return text', async () => {
			setupMockModels(allModels);

			const result = await visionModelSearch.call(mockLoadOptionsFunctions);

			const values = result.results.map((r) => r.value);
			expect(values).toContain('qwen3.5-flash');
			expect(values).toContain('qwen3-vl-plus');
			expect(values).toContain('qvq-72b-preview');
			// Text-only models cannot analyse images.
			expect(values).not.toContain('qwen3.7-max');
			expect(values).not.toContain('deepseek-v3');
			// Image generators output images, not text.
			expect(values).not.toContain('qwen-image');
			// Omni output is not text-only.
			expect(values).not.toContain('qwen3.5-omni-plus');
		});
	});

	describe('imageGenerationModelSearch', () => {
		it('should return only models that output images', async () => {
			setupMockModels(allModels);

			const result = await imageGenerationModelSearch.call(mockLoadOptionsFunctions);

			const values = result.results.map((r) => r.value);
			expect(values).toContain('qwen-image');
			expect(values).toContain('z-image-turbo');
			expect(values).toContain('qwen-image-edit');
			expect(values).not.toContain('qwen3.5-flash');
			expect(values).not.toContain('wan2.6-t2v');
		});
	});

	describe('textToVideoModelSearch', () => {
		it('should return video models drivable by text, allowing optional extras like audio', async () => {
			setupMockModels(allModels);

			const result = await textToVideoModelSearch.call(mockLoadOptionsFunctions);

			const values = result.results.map((r) => r.value);
			expect(values).toContain('happyhorse-1.0-t2v');
			// Text-to-video models that also accept an optional audio track still qualify.
			expect(values).toContain('wan2.6-t2v');
			expect(values).toContain('wan2.7-t2v');
			// Image- and video-conditioned generators require image/video input.
			expect(values).not.toContain('wan2.6-i2v');
			expect(values).not.toContain('happyhorse-1.0-r2v');
			expect(values).not.toContain('happyhorse-1.0-video-edit');
			expect(values).not.toContain('qwen3.5-flash');
		});
	});

	describe('imageToVideoModelSearch', () => {
		it('should return models that take image input and output video, excluding video editors', async () => {
			setupMockModels(allModels);

			const result = await imageToVideoModelSearch.call(mockLoadOptionsFunctions);

			const values = result.results.map((r) => r.value);
			expect(values).toContain('wan2.6-i2v');
			expect(values).toContain('happyhorse-1.0-r2v');
			// Text-to-video models do not accept an image (audio extra is not enough).
			expect(values).not.toContain('wan2.6-t2v');
			expect(values).not.toContain('wan2.7-t2v');
			// Video editing requires video input, which this operation cannot supply.
			expect(values).not.toContain('happyhorse-1.0-video-edit');
			expect(values).not.toContain('qwen3.5-flash');
		});
	});

	describe('pagination', () => {
		it('should fetch every page and aggregate all models', async () => {
			// Force 2 models per page so the 15-model fixture spans 8 pages.
			setupMockModels(allModels, 2);

			const result = await visionModelSearch.call(mockLoadOptionsFunctions);

			const values = result.results.map((r) => r.value);
			// Vision models appear across several pages; all must be collected.
			expect(values).toContain('qwen3.5-flash');
			expect(values).toContain('qwen3-vl-plus');
			expect(values).toContain('qvq-72b-preview');
			expect(mockApiRequest).toHaveBeenCalledTimes(Math.ceil(allModels.length / 2));
		});

		it('should stop requesting once the reported total is reached', async () => {
			setupMockModels(allModels, 100);

			await textModelSearch.call(mockLoadOptionsFunctions);

			expect(mockApiRequest).toHaveBeenCalledTimes(1);
			expect(mockApiRequest).toHaveBeenCalledWith('GET', '/api/v1/models', {
				qs: { page_size: 100, page_no: 1 },
			});
		});
	});

	describe('caching', () => {
		it('should reuse the cached catalogue across searches instead of refetching', async () => {
			setupMockModels(allModels, 100);

			await textModelSearch.call(mockLoadOptionsFunctions);
			await visionModelSearch.call(mockLoadOptionsFunctions);
			await imageGenerationModelSearch.call(mockLoadOptionsFunctions, 'qwen');

			// One fetch total, despite three separate dropdown searches.
			expect(mockApiRequest).toHaveBeenCalledTimes(1);
		});

		it('should refetch once the cache has been cleared', async () => {
			setupMockModels(allModels, 100);

			await textModelSearch.call(mockLoadOptionsFunctions);
			clearModelCatalogCache();
			await textModelSearch.call(mockLoadOptionsFunctions);

			expect(mockApiRequest).toHaveBeenCalledTimes(2);
		});
	});
});
