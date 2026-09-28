import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { effectScope, nextTick, ref } from 'vue';
import { useExecutionsStore } from '../executions.store';
import { useExecutionFiltersQuery } from './useExecutionFiltersQuery';

const query = ref<Record<string, string>>({});
const route = {
	get query() {
		return query.value;
	},
};
const replace = vi.fn(async ({ query: nextQuery }: { query: Record<string, string> }) => {
	query.value = nextQuery;
});

vi.mock('vue-router', () => ({
	useRoute: () => route,
	useRouter: () => ({ replace }),
}));

describe('useExecutionFiltersQuery', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		query.value = {};
		replace.mockClear();
	});

	it('clears a version filter when the workflow changes', async () => {
		const executionsStore = useExecutionsStore();
		executionsStore.setFilters({
			...executionsStore.filters,
			workflowId: 'workflow-a',
			workflowVersionId: 'version-a',
			status: 'error',
		});
		vi.spyOn(executionsStore, 'initialize').mockResolvedValue();
		const workflowId = ref('workflow-a');
		const scope = effectScope();
		scope.run(() => useExecutionFiltersQuery(() => workflowId.value));

		workflowId.value = 'workflow-b';
		await nextTick();
		await nextTick();

		expect(executionsStore.filters).toMatchObject({
			workflowId: 'workflow-b',
			workflowVersionId: 'all',
			status: 'error',
		});
		expect(JSON.parse(query.value.executionFilters)).toMatchObject({
			workflowId: 'workflow-b',
			workflowVersionId: 'all',
		});
		expect(executionsStore.initialize).toHaveBeenCalledWith('workflow-b', expect.any(Function));
		scope.stop();
	});
});
