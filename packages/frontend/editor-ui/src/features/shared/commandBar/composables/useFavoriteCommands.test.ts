import { ref } from 'vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { VIEWS } from '@/app/constants';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import type { FavoriteGroup } from '@/features/collaboration/projects/composables/useFavoriteNavItems';
import { useFavoriteCommands } from './useFavoriteCommands';

const routerPushMock = vi.fn();
const routerResolveMock = vi.fn((location: { params?: { workflowId?: string } }) => ({
	href: `/workflow/${location.params?.workflowId}`,
}));
const favoriteGroups = ref<FavoriteGroup[]>([]);

vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: routerPushMock,
		resolve: routerResolveMock,
	}),
	useRoute: () => ({ params: {} }),
	RouterLink: vi.fn(),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@/features/collaboration/projects/composables/useFavoriteNavItems', () => ({
	useFavoriteNavItems: () => ({ favoriteGroups }),
}));

const workflowLocation = { name: VIEWS.WORKFLOW, params: { workflowId: 'w1' } };

describe('useFavoriteCommands', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		vi.clearAllMocks();

		favoriteGroups.value = [
			{
				type: 'project',
				items: [
					{
						menuItem: {
							id: 'project-1',
							label: 'Marketing',
							icon: { type: 'emoji', value: '🚀' },
						},
						resourceId: 'project-1',
						resourceType: 'project',
					},
				],
			},
			{
				type: 'workflow',
				items: [
					{
						menuItem: {
							id: 'favorite-workflow-w1',
							label: 'Alpha',
							icon: 'log-in',
							route: { to: workflowLocation },
						},
						resourceId: 'w1',
						resourceType: 'workflow',
					},
				],
			},
		];
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('maps favorite items with a route to commands in the favorites section', () => {
		expect(useFavoriteCommands().commands.value).toEqual([
			{
				id: 'favorite-workflow-w1',
				title: 'Alpha',
				section: 'favorites.menu.title',
				icon: { type: 'icon', value: 'log-in' },
				href: '/workflow/w1',
				handler: expect.any(Function),
			},
		]);
		expect(routerResolveMock).toHaveBeenCalledWith(workflowLocation);
	});

	it('flattens items from every favorite group', () => {
		favoriteGroups.value[0].items[0].menuItem.route = {
			to: { name: VIEWS.PROJECTS_WORKFLOWS, params: { projectId: 'project-1' } },
		};

		expect(useFavoriteCommands().commands.value.map((command) => command.title)).toEqual([
			'Marketing',
			'Alpha',
		]);
	});

	it('returns no commands when there are no favorites', () => {
		favoriteGroups.value = [];

		expect(useFavoriteCommands().commands.value).toEqual([]);
	});

	it('opens a favorite workflow with a full page load', async () => {
		vi.stubGlobal('location', { href: '' });

		await useFavoriteCommands().commands.value[0].handler?.();

		expect(window.location.href).toBe('/workflow/w1');
		expect(routerPushMock).not.toHaveBeenCalled();
	});

	it('navigates to other favorites with the router', async () => {
		const projectLocation = { name: VIEWS.PROJECTS_WORKFLOWS, params: { projectId: 'project-1' } };
		favoriteGroups.value[0].items[0].menuItem.route = { to: projectLocation };

		await useFavoriteCommands().commands.value[0].handler?.();

		expect(routerPushMock).toHaveBeenCalledWith(projectLocation);
	});

	it('fetches favorites on initialize', async () => {
		await useFavoriteCommands().initialize?.();

		expect(useFavoritesStore().fetchFavorites).toHaveBeenCalled();
	});
});
