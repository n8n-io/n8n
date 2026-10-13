import { computed, defineComponent } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { fireEvent } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type { IWorkflowDb } from '@/Interface';
import { useExecutionsStore } from '../executions.store';
import { getDefaultExecutionFilters } from '../executions.utils';
import WorkflowExecutionsView from './WorkflowExecutionsView.vue';

vi.mock('vue-router', () => ({
	useRoute: () => ({ params: { workflowId: 'w1' }, query: {}, name: '' }),
	useRouter: () => ({ replace: vi.fn() }),
	RouterLink: { template: '<a><slot /></a>' },
}));

const WorkflowExecutionsListStub = defineComponent({
	emits: ['update:filters'],
	setup(_, { emit }) {
		return {
			selectError: () =>
				emit('update:filters', { ...getDefaultExecutionFilters(), status: 'error' }),
		};
	},
	template: '<button data-test-id="filter-error-stub" @click="selectError" />',
});

const renderComponent = createComponentRenderer(WorkflowExecutionsView, {
	global: {
		provide: { [WorkflowIdKey as unknown as string]: computed(() => 'w1') },
		stubs: { WorkflowExecutionsList: WorkflowExecutionsListStub },
	},
});

describe('WorkflowExecutionsView', () => {
	let executionsStore: ReturnType<typeof mockedStore<typeof useExecutionsStore>>;

	beforeEach(() => {
		// Use the real store actions, so the filters go through reset, save, and restore.
		setActivePinia(createTestingPinia({ stubActions: false }));
		mockedStore(useWorkflowsListStore).workflowsById = { w1: { id: 'w1' } as IWorkflowDb };
		executionsStore = mockedStore(useExecutionsStore);
		executionsStore.initialize.mockResolvedValue();
	});

	it('keeps the filters after leaving the executions tab and coming back', async () => {
		const { getByTestId, unmount } = renderComponent();
		await waitAllPromises();
		await fireEvent.click(getByTestId('filter-error-stub'));
		unmount();

		expect(executionsStore.filters.status).toBe('all');

		renderComponent();
		await waitAllPromises();

		expect(executionsStore.filters.status).toBe('error');
	});
});
