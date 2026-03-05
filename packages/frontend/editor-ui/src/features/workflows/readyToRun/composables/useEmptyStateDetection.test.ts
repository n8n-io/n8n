import { describe, expect, it, vi } from 'vitest';
import type { RouteLocationNormalized } from 'vue-router';
import { useEmptyStateDetection } from './useEmptyStateDetection';

const mockRoute = (overrides: Partial<RouteLocationNormalized> = {}) =>
	({
		params: {},
		query: {},
		...overrides,
	}) as RouteLocationNormalized;

vi.mock('@/features/core/folders/folders.store', () => ({
	useFoldersStore: () => ({
		totalWorkflowCount: 0,
		workflowsCountLoaded: true,
	}),
}));

vi.mock('@/features/collaboration/projects/composables/useProjectPages', () => ({
	useProjectPages: () => ({
		isOverviewSubPage: true,
		isSharedSubPage: false,
	}),
}));

vi.mock('vue-router', () => ({
	useRoute: () => mockRoute(),
}));

describe('useEmptyStateDetection', () => {
	describe('isTrulyEmpty', () => {
		it('should return true when state is truly empty', () => {
			const { isTrulyEmpty } = useEmptyStateDetection();
			const route = mockRoute();

			expect(isTrulyEmpty(route)).toBe(true);
		});

		it('should return false when in a specific folder', () => {
			const { isTrulyEmpty } = useEmptyStateDetection();
			const route = mockRoute({
				params: { folderId: 'folder-123' },
			});

			expect(isTrulyEmpty(route)).toBe(false);
		});

		it('should return false when search query is active', () => {
			const { isTrulyEmpty } = useEmptyStateDetection();
			const route = mockRoute({
				query: { search: 'test' },
			});

			expect(isTrulyEmpty(route)).toBe(false);
		});

		it('should return false when status filter is active', () => {
			const { isTrulyEmpty } = useEmptyStateDetection();
			const route = mockRoute({
				query: { status: 'active' },
			});

			expect(isTrulyEmpty(route)).toBe(false);
		});

		it('should return false when tags filter is active', () => {
			const { isTrulyEmpty } = useEmptyStateDetection();
			const route = mockRoute({
				query: { tags: 'production' },
			});

			expect(isTrulyEmpty(route)).toBe(false);
		});

		it('should return false when showArchived filter is active', () => {
			const { isTrulyEmpty } = useEmptyStateDetection();
			const route = mockRoute({
				query: { showArchived: 'true' },
			});

			expect(isTrulyEmpty(route)).toBe(false);
		});

		it('should return false when homeProject filter is active', () => {
			const { isTrulyEmpty } = useEmptyStateDetection();
			const route = mockRoute({
				query: { homeProject: 'true' },
			});

			expect(isTrulyEmpty(route)).toBe(false);
		});
	});
});
