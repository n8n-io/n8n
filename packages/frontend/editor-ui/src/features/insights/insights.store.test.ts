import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { useInsightsStore } from '@/features/insights/insights.store';
import * as insightsApi from '@/features/insights/insights.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@/stores/users.store';
import { useSettingsStore } from '@/stores/settings.store';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { reactive } from 'vue';
import type { FrontendModuleSettings } from '@n8n/api-types';

vi.mock('vue-router', () => ({
	useRoute: () => reactive({}),
}));
vi.mock('@/features/insights/insights.api');

const mockFilter = { dateRange: 'week' as const };
const mockData = [
	{
		date: '2023-01-01',
		values: {
			total: 100,
			failed: 10,
			failureRate: 10,
			timeSaved: 50,
			averageRunTime: 5,
			succeeded: 90,
		},
	},
];

describe('useInsightsStore', () => {
	let insightsStore: ReturnType<typeof useInsightsStore>;
	let settingsStore: MockedStore<typeof useSettingsStore>;
	let rootStore: MockedStore<typeof useRootStore>;
	let usersStore: MockedStore<typeof useUsersStore>;

	beforeEach(() => {
		createTestingPinia();

		settingsStore = mockedStore(useSettingsStore);
		rootStore = mockedStore(useRootStore);
		usersStore = mockedStore(useUsersStore);

		rootStore.restApiContext = {
			baseUrl: 'http://localhost',
			pushRef: 'pushRef',
		};

		usersStore.currentUser = { globalScopes: ['insights:list'] } as IUser;

		insightsStore = useInsightsStore();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('charts data fetcher', () => {
		it('should use fetchInsightsTimeSaved when dashboard is disabled', async () => {
			settingsStore.moduleSettings = { insights: { dashboard: false } } as FrontendModuleSettings;

			vi.mocked(insightsApi.fetchInsightsTimeSaved).mockResolvedValue(mockData);

			await insightsStore.charts.execute(0, mockFilter);

			expect(insightsApi.fetchInsightsTimeSaved).toHaveBeenCalledWith(
				rootStore.restApiContext,
				mockFilter,
			);
			expect(insightsApi.fetchInsightsByTime).not.toHaveBeenCalled();
		});

		it('should use fetchInsightsByTime when dashboard is enabled', async () => {
			settingsStore.moduleSettings = { insights: { dashboard: true } } as FrontendModuleSettings;

			vi.mocked(insightsApi.fetchInsightsByTime).mockResolvedValue(mockData);

			await insightsStore.charts.execute(0, mockFilter);

			expect(insightsApi.fetchInsightsByTime).toHaveBeenCalledWith(
				rootStore.restApiContext,
				mockFilter,
			);
			expect(insightsApi.fetchInsightsTimeSaved).not.toHaveBeenCalled();
		});

		it('should use fetchInsightsTimeSaved when dashboard setting is undefined', async () => {
			settingsStore.moduleSettings = { insights: {} } as FrontendModuleSettings;

			vi.mocked(insightsApi.fetchInsightsTimeSaved).mockResolvedValue(mockData);

			await insightsStore.charts.execute(0, mockFilter);

			expect(insightsApi.fetchInsightsTimeSaved).toHaveBeenCalledWith(
				rootStore.restApiContext,
				mockFilter,
			);
			expect(insightsApi.fetchInsightsByTime).not.toHaveBeenCalled();
		});

		it('should work without filter parameter', async () => {
			settingsStore.moduleSettings = { insights: { dashboard: true } } as FrontendModuleSettings;

			vi.mocked(insightsApi.fetchInsightsByTime).mockResolvedValue(mockData);

			await insightsStore.charts.execute();

			expect(insightsApi.fetchInsightsByTime).toHaveBeenCalledWith(
				rootStore.restApiContext,
				undefined,
			);
		});
	});
});
