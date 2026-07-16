import { createPinia, setActivePinia } from 'pinia';
import { useRecommendedTemplatesStore } from './recommendedTemplates.store';
import { VIEWS } from '@/app/constants';

const { mockTelemetry } = vi.hoisted(() => {
	return {
		mockTelemetry: {
			track: vi.fn(),
		},
	};
});

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => mockTelemetry,
}));

describe('useRecommendedTemplatesStore', () => {
	let store: ReturnType<typeof useRecommendedTemplatesStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
		store = useRecommendedTemplatesStore();
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
});
