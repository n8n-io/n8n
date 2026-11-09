import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { effectScope, reactive, nextTick } from 'vue';

import { fetchPromotionBranches, fetchPromotionRepositories } from '../promotionsSettings.api';
import { usePromotionGitHostDiscovery } from './usePromotionGitHostDiscovery';

vi.mock('../promotionsSettings.api', () => ({
	fetchPromotionRepositories: vi.fn(),
	fetchPromotionBranches: vi.fn(),
}));

beforeEach(() => {
	vi.resetAllMocks();
	createTestingPinia();
	vi.mocked(fetchPromotionBranches).mockResolvedValue({
		data: [{ name: 'main', isDefault: true }],
		nextCursor: null,
	});
});

// The disabled UI cannot exercise a search call without a selected repository.
it('ignores branch searches until a repository is selected', async () => {
	const context = reactive<{ providerId: string; kind: 'branch'; repositoryId?: string }>({
		providerId: 'gitlab-1',
		kind: 'branch',
	});
	const scope = effectScope();
	try {
		const discovery = scope.run(() => usePromotionGitHostDiscovery(context));
		if (!discovery) throw new Error('The discovery scope did not start');
		discovery.onSearch('main');
		expect(discovery.loading.value).toBe(false);
		expect(discovery.search.value).toBe('');
		expect(fetchPromotionBranches).not.toHaveBeenCalled();
		expect(fetchPromotionRepositories).not.toHaveBeenCalled();
		context.repositoryId = '42';
		await nextTick();
		await flushPromises();
		expect(discovery.options.value).toEqual([{ value: 'main', label: 'main' }]);
		expect(discovery.loading.value).toBe(false);
	} finally {
		scope.stop();
	}
});
