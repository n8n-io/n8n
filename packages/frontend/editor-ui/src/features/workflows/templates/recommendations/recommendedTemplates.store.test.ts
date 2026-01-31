import { createPinia, setActivePinia } from 'pinia';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import { mock } from 'vitest-mock-extended';
import { useRecommendedTemplatesStore, NUMBER_OF_TEMPLATES } from './recommendedTemplates.store';
import { VIEWS } from '@/app/constants';

const { getDynamicRecommendedTemplates, mockTelemetry, mockPostHog, mockFetchTemplateById } =
	vi.hoisted(() => {
		return {
			getDynamicRecommendedTemplates: vi.fn(),
			mockTelemetry: {
				track: vi.fn(),
			},
			mockPostHog: {
				isVariantEnabled: vi.fn(),
			},
			mockFetchTemplateById: vi.fn(),
		};
	});

vi.mock('./dynamicTemplates.api', () => ({
	getDynamicRecommendedTemplates,
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => mockTelemetry,
}));

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({
		isTemplatesEnabled: true,
	})),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		loadNodeTypesIfNotLoaded: vi.fn(),
	})),
}));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => mockPostHog,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: { baseUrl: '/rest' },
	})),
}));

vi.mock('@/features/workflows/templates/templates.store', () => ({
	useTemplatesStore: vi.fn(() => ({
		hasCustomTemplatesHost: false,
		fetchTemplateById: mockFetchTemplateById,
	})),
}));

const createMockTemplate = (id: number): ITemplatesWorkflowFull =>
	mock<ITemplatesWorkflowFull>({
		id,
		name: `Template ${id}`,
		full: true,
	});

describe('useRecommendedTemplatesStore', () => {
	let store: ReturnType<typeof useRecommendedTemplatesStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
		store = useRecommendedTemplatesStore();
	});

	describe('isFeatureEnabled', () => {
		it('should return true when templates are enabled and no custom host', () => {
			expect(store.isFeatureEnabled()).toBe(true);
		});
	});

	describe('getRandomTemplateIds', () => {
		it('should return the correct number of template IDs', () => {
			const ids = store.getRandomTemplateIds();
			expect(ids).toHaveLength(NUMBER_OF_TEMPLATES);
		});

		it('should return unique IDs', () => {
			const ids = store.getRandomTemplateIds();
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length);
		});
	});

	describe('getTemplateRoute', () => {
		it('should return the correct route object', () => {
			const route = store.getTemplateRoute(123);
			expect(route).toEqual({
				name: VIEWS.TEMPLATE,
				params: { id: 123 },
			});
		});
	});

	describe('getTemplateData', () => {
		it('should fetch template by ID', async () => {
			const mockTemplate = createMockTemplate(123);
			mockFetchTemplateById.mockResolvedValue(mockTemplate);

			const result = await store.getTemplateData(123);

			expect(mockFetchTemplateById).toHaveBeenCalledWith('123');
			expect(result).toBe(mockTemplate);
		});

		it('should return null when template not found', async () => {
			mockFetchTemplateById.mockResolvedValue(null);

			const result = await store.getTemplateData(999);

			expect(result).toBeNull();
		});
	});

	describe('trackTemplateTileClick', () => {
		it('should track template detail view', () => {
			store.trackTemplateTileClick(123);

			expect(mockTelemetry.track).toHaveBeenCalledWith('User viewed template detail', {
				templateId: 123,
			});
		});
	});

	describe('trackTemplateShown', () => {
		it('should track template cell view', () => {
			store.trackTemplateShown(123, 2);

			expect(mockTelemetry.track).toHaveBeenCalledWith('User viewed template cell', {
				tileNumber: 2,
				templateId: 123,
			});
		});
	});

	describe('loadRecommendedTemplates', () => {
		describe('when dynamic templates experiment is enabled', () => {
			beforeEach(() => {
				mockPostHog.isVariantEnabled.mockReturnValue(true);
			});

			it('should fetch templates from dynamic API on success', async () => {
				const mockTemplates = [
					{ workflow: createMockTemplate(1) },
					{ workflow: createMockTemplate(2) },
					{ workflow: createMockTemplate(3) },
				];
				getDynamicRecommendedTemplates.mockResolvedValue({ templates: mockTemplates });

				const result = await store.loadRecommendedTemplates();

				expect(getDynamicRecommendedTemplates).toHaveBeenCalledWith({ baseUrl: '/rest' });
				expect(result).toHaveLength(3);
				expect(result[0].id).toBe(1);
				expect(result[1].id).toBe(2);
				expect(result[2].id).toBe(3);
			});

			it('should limit templates to NUMBER_OF_TEMPLATES', async () => {
				const mockTemplates = Array.from({ length: 10 }, (_, i) => ({
					workflow: createMockTemplate(i + 1),
				}));
				getDynamicRecommendedTemplates.mockResolvedValue({ templates: mockTemplates });

				const result = await store.loadRecommendedTemplates();

				expect(result).toHaveLength(NUMBER_OF_TEMPLATES);
			});

			it('should fallback to static IDs when API fails', async () => {
				const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
				getDynamicRecommendedTemplates.mockRejectedValue(new Error('API Error'));

				const mockTemplate = createMockTemplate(7607);
				mockFetchTemplateById.mockResolvedValue(mockTemplate);

				const result = await store.loadRecommendedTemplates();

				expect(consoleSpy).toHaveBeenCalledWith(
					'Dynamic templates failed, falling back to static IDs',
					expect.any(Error),
				);
				expect(mockFetchTemplateById).toHaveBeenCalled();
				expect(result.length).toBeGreaterThan(0);

				consoleSpy.mockRestore();
			});

			it('should return empty array when API returns empty templates', async () => {
				getDynamicRecommendedTemplates.mockResolvedValue({ templates: [] });

				const result = await store.loadRecommendedTemplates();

				expect(result).toEqual([]);
			});
		});

		describe('when dynamic templates experiment is disabled', () => {
			beforeEach(() => {
				mockPostHog.isVariantEnabled.mockReturnValue(false);
			});

			it('should fetch templates using static IDs', async () => {
				const mockTemplate = createMockTemplate(7607);
				mockFetchTemplateById.mockResolvedValue(mockTemplate);

				const result = await store.loadRecommendedTemplates();

				expect(getDynamicRecommendedTemplates).not.toHaveBeenCalled();
				expect(mockFetchTemplateById).toHaveBeenCalled();
				expect(result.length).toBeGreaterThan(0);
			});

			it('should filter out failed template fetches', async () => {
				// Setup: 4 successful, 1 null, 1 rejected
				mockFetchTemplateById
					.mockResolvedValueOnce(createMockTemplate(1))
					.mockResolvedValueOnce(null)
					.mockResolvedValueOnce(createMockTemplate(3))
					.mockRejectedValueOnce(new Error('Fetch error'))
					.mockResolvedValueOnce(createMockTemplate(5))
					.mockResolvedValueOnce(createMockTemplate(6));

				const result = await store.loadRecommendedTemplates();

				// Verify no null values in result
				expect(result.every((t) => t !== null)).toBe(true);

				// Verify only successfully fetched templates are included (4 out of 6)
				expect(result).toHaveLength(4);
				expect(result.map((t) => t.id)).toEqual([1, 3, 5, 6]);
			});
		});
	});
});
