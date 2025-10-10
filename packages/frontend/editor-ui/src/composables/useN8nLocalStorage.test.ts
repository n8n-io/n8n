import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useN8nLocalStorage } from './useN8nLocalStorage';

const mockOverview = {
	isOverviewSubPage: false,
};

// Create a shared storage object that persists between calls
let mockLocalStorageValue: Record<string, unknown> = {};

vi.mock('@/features/projects/composables/useProjectPages', () => ({
	useProjectPages: vi.fn(() => mockOverview),
}));

vi.mock('@vueuse/core', () => ({
	useLocalStorage: vi.fn((_key, defaultValue) => {
		// Only initialize with default value if the mock is empty
		if (Object.keys(mockLocalStorageValue).length === 0) {
			Object.assign(mockLocalStorageValue, structuredClone(defaultValue));
		}

		return {
			value: mockLocalStorageValue,
		};
	}),
}));

describe('useN8nLocalStorage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockOverview.isOverviewSubPage = false;
		mockLocalStorageValue = {};
	});

	describe('getProjectKey', () => {
		it('returns the projectId when not on overview page', () => {
			const { getProjectKey } = useN8nLocalStorage();
			const projectId = 'test-project';

			expect(getProjectKey(projectId)).toBe(projectId);
		});

		it('returns "home" when on overview page', () => {
			// Override the mock for this specific test
			mockOverview.isOverviewSubPage = true;

			const { getProjectKey } = useN8nLocalStorage();
			const projectId = 'test-project';

			expect(getProjectKey(projectId)).toBe('home');

			// Reset for subsequent tests
			mockOverview.isOverviewSubPage = false;
		});

		it('returns the provided projectId when it is an empty string', () => {
			const { getProjectKey } = useN8nLocalStorage();
			const projectId = '';

			expect(getProjectKey(projectId)).toBe('');
		});

		it('returns undefined when projectId is undefined', () => {
			const { getProjectKey } = useN8nLocalStorage();

			expect(getProjectKey(undefined)).toBeUndefined();
		});
	});

	describe('saveProjectPreferencesToLocalStorage', () => {
		it('saves new preferences to localStorage', () => {
			const { saveProjectPreferencesToLocalStorage } = useN8nLocalStorage();
			const projectId = 'test-project';
			const tabKey = 'workflows';
			const preferences = { sort: 'name', pageSize: 25 };

			saveProjectPreferencesToLocalStorage(projectId, tabKey, preferences);

			expect(mockLocalStorageValue).toEqual({
				'test-project': {
					workflows: { sort: 'name', pageSize: 25 },
				},
			});
		});

		it('merges new preferences with existing ones', () => {
			const { saveProjectPreferencesToLocalStorage } = useN8nLocalStorage();
			const projectId = 'test-project';
			const tabKey = 'workflows';

			// First save
			saveProjectPreferencesToLocalStorage(projectId, tabKey, { sort: 'name' });
			// Second save with different preference
			saveProjectPreferencesToLocalStorage(projectId, tabKey, { pageSize: 25 });

			expect(mockLocalStorageValue).toEqual({
				'test-project': {
					workflows: { sort: 'name', pageSize: 25 },
				},
			});
		});

		it('does nothing when projectKey is falsy', () => {
			mockOverview.isOverviewSubPage = false;

			const { saveProjectPreferencesToLocalStorage } = useN8nLocalStorage();
			const projectId = ''; // This will result in a falsy projectKey
			const tabKey = 'workflows';
			const preferences = { sort: 'name', pageSize: 25 };

			saveProjectPreferencesToLocalStorage(projectId, tabKey, preferences);

			expect(mockLocalStorageValue).toEqual({});
		});

		it('supports saving credentials tab preferences', () => {
			const { saveProjectPreferencesToLocalStorage } = useN8nLocalStorage();
			const projectId = 'test-project';
			const tabKey = 'credentials';
			const preferences = { sort: 'type', pageSize: 50 };

			saveProjectPreferencesToLocalStorage(projectId, tabKey, preferences);

			expect(mockLocalStorageValue).toEqual({
				'test-project': {
					credentials: { sort: 'type', pageSize: 50 },
				},
			});
		});
	});

	describe('loadProjectPreferencesFromLocalStorage', () => {
		it('loads preferences from localStorage', () => {
			mockLocalStorageValue['test-project'] = {
				workflows: { sort: 'name', pageSize: 25 },
			};

			const { loadProjectPreferencesFromLocalStorage } = useN8nLocalStorage();
			const projectId = 'test-project';
			const tabKey = 'workflows';

			const result = loadProjectPreferencesFromLocalStorage(projectId, tabKey);

			expect(result).toEqual({ sort: 'name', pageSize: 25 });
		});

		it('returns empty object when preferences do not exist', () => {
			const { loadProjectPreferencesFromLocalStorage } = useN8nLocalStorage();
			const projectId = 'non-existent-project';
			const tabKey = 'workflows';

			const result = loadProjectPreferencesFromLocalStorage(projectId, tabKey);

			expect(result).toEqual({});
		});

		it('returns empty object when projectKey is falsy', () => {
			const { loadProjectPreferencesFromLocalStorage } = useN8nLocalStorage();
			const projectId = ''; // This will result in a falsy projectKey
			const tabKey = 'workflows';

			const result = loadProjectPreferencesFromLocalStorage(projectId, tabKey);

			expect(result).toEqual({});
		});

		it('returns empty object when tab does not exist', () => {
			mockLocalStorageValue['test-project'] = {
				workflows: { sort: 'name', pageSize: 25 },
			};

			const { loadProjectPreferencesFromLocalStorage } = useN8nLocalStorage();
			const projectId = 'test-project';
			const tabKey = 'credentials';

			const result = loadProjectPreferencesFromLocalStorage(projectId, tabKey);

			expect(result).toEqual({});
		});
	});
});
