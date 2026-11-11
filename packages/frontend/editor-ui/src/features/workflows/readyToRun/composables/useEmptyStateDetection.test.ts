import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RouteLocationNormalized } from 'vue-router';
import { useEmptyStateDetection } from './useEmptyStateDetection';

const mockRoute = (overrides: Partial<RouteLocationNormalized> = {}) =>
	({
		params: {},
		query: {},
		...overrides,
	}) as RouteLocationNormalized;

const foldersStoreState = {
	totalWorkflowCount: 0,
	workflowsCountLoaded: true,
};

const credentialsStoreState = {
	allCredentials: [] as unknown[],
};

const environmentsStoreState = {
	variables: [] as unknown[],
};

const dataTableStoreState = {
	totalCount: 0,
};

const agentListStoreState = {
	totalCount: 0 as number | undefined,
};

const settingsStoreState = {
	isAgentsEnabled: true,
};

vi.mock('@/features/agents/agentList.store', () => ({
	useAgentListStore: () => agentListStoreState,
}));

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => settingsStoreState,
}));

vi.mock('@/features/core/folders/folders.store', () => ({
	useFoldersStore: () => foldersStoreState,
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => credentialsStoreState,
}));

vi.mock('@/features/settings/environments.ee/environments.store', () => ({
	useEnvironmentsStore: () => environmentsStoreState,
}));

vi.mock('@/features/core/dataTable/dataTable.store', () => ({
	useDataTableStore: () => dataTableStoreState,
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

beforeEach(() => {
	foldersStoreState.totalWorkflowCount = 0;
	foldersStoreState.workflowsCountLoaded = true;
	credentialsStoreState.allCredentials = [];
	environmentsStoreState.variables = [];
	dataTableStoreState.totalCount = 0;
	agentListStoreState.totalCount = 0;
	settingsStoreState.isAgentsEnabled = true;
});

describe('useEmptyStateDetection', () => {
	describe('isTrulyEmpty', () => {
		it('keeps the overview when only agents exist', () => {
			agentListStoreState.totalCount = 2;
			const { isTrulyEmpty, hasKnownInstanceContent } = useEmptyStateDetection();

			expect(isTrulyEmpty()).toBe(false);
			expect(hasKnownInstanceContent.value).toBe(true);
		});

		it('keeps the overview until the agent count is known', () => {
			agentListStoreState.totalCount = undefined;
			const { isTrulyEmpty, hasKnownInstanceContent } = useEmptyStateDetection();

			expect(isTrulyEmpty()).toBe(false);
			expect(hasKnownInstanceContent.value).toBe(false);
		});

		it('allows the empty state when agents are disabled', () => {
			settingsStoreState.isAgentsEnabled = false;
			agentListStoreState.totalCount = 2;
			const { isTrulyEmpty, hasKnownInstanceContent } = useEmptyStateDetection();

			expect(isTrulyEmpty()).toBe(true);
			expect(hasKnownInstanceContent.value).toBe(false);
		});

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

		it('should return false when credentials exist', () => {
			credentialsStoreState.allCredentials = [{ id: '1' }];
			const { isTrulyEmpty } = useEmptyStateDetection();
			const route = mockRoute();

			expect(isTrulyEmpty(route)).toBe(false);
		});

		it('should return false when variables exist', () => {
			environmentsStoreState.variables = [{ id: '1' }];
			const { isTrulyEmpty } = useEmptyStateDetection();
			const route = mockRoute();

			expect(isTrulyEmpty(route)).toBe(false);
		});

		it('should return false when data tables exist', () => {
			dataTableStoreState.totalCount = 1;
			const { isTrulyEmpty } = useEmptyStateDetection();
			const route = mockRoute();

			expect(isTrulyEmpty(route)).toBe(false);
		});
	});
});
