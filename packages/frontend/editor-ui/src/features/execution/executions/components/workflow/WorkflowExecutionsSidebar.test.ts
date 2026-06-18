import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import type { MockedStore } from '@/__tests__/utils';
import WorkflowExecutionsSidebar from './WorkflowExecutionsSidebar.vue';
import { useSettingsStore } from '@/app/stores/settings.store';
import { mockedStore, SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { STORES } from '@n8n/stores';
import merge from 'lodash/merge';
import { expect, it, vi } from 'vitest';
import { computed, nextTick } from 'vue';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';
import type { ExecutionSummary } from 'n8n-workflow';

const observe = vi.fn();
const disconnect = vi.fn();

vi.mock('@/app/composables/useIntersectionObserver', () => ({
	useIntersectionObserver: () => ({
		observe,
		disconnect,
		observer: { value: null },
	}),
}));

vi.mock('vue-router', () => {
	return {
		useRouter: vi.fn(),
		useRoute: () => ({
			params: {},
			query: {},
			name: '',
			path: '',
		}),
		RouterLink: {
			template: '<a><slot /></a>',
		},
	};
});

const renderComponent = createComponentRenderer(WorkflowExecutionsSidebar, {
	global: {
		provide: {
			[WorkflowIdKey as unknown as string]: computed(() => 'test-workflow-id'),
		},
	},
	pinia: createTestingPinia({
		initialState: {
			[STORES.EXECUTIONS]: {
				executions: [],
			},
			[STORES.SETTINGS]: {
				settings: merge(SETTINGS_STORE_DEFAULT_STATE.settings, {
					enterprise: {
						advancedExecutionFilters: true,
					},
				}),
			},
		},
	}),
});

const buildExecutions = (count: number): ExecutionSummary[] =>
	Array.from({ length: count }, (_, index) => ({
		id: `exec-${index}`,
		workflowId: 'test-workflow-id',
		mode: 'manual',
		status: 'success',
		createdAt: new Date().toISOString(),
		startedAt: new Date().toISOString(),
		stoppedAt: new Date().toISOString(),
		finished: true,
	})) as unknown as ExecutionSummary[];

let settingsStore: MockedStore<typeof useSettingsStore>;

describe('WorkflowExecutionsSidebar', () => {
	beforeEach(() => {
		settingsStore = mockedStore(useSettingsStore);
		observe.mockClear();
		disconnect.mockClear();
	});

	it('should not throw error when opened', async () => {
		expect(() =>
			renderComponent({
				props: {
					loading: false,
					loadingMore: false,
					hasMore: false,
					executions: [],
				},
			}),
		).not.toThrow();
	});

	it('should render concurrent executions header if the feature is enabled', async () => {
		settingsStore.concurrency = 5;
		const { getByTestId } = renderComponent({
			props: {
				loading: false,
				loadingMore: false,
				hasMore: false,
				executions: [],
			},
		});

		expect(getByTestId('concurrent-executions-header')).toBeVisible();
	});

	describe('infinite scroll sentinel', () => {
		it('should observe the sentinel when executions are present and more pages exist', async () => {
			const { getByTestId } = renderComponent({
				props: {
					loading: false,
					loadingMore: false,
					hasMore: true,
					executions: buildExecutions(20),
				},
			});

			await nextTick();

			const sentinel = getByTestId('executions-load-more-sentinel');
			expect(observe).toHaveBeenCalledWith(sentinel);
		});

		it('should not render the sentinel when there are no more pages', async () => {
			const { queryByTestId } = renderComponent({
				props: {
					loading: false,
					loadingMore: false,
					hasMore: false,
					executions: buildExecutions(20),
				},
			});

			await nextTick();

			expect(queryByTestId('executions-load-more-sentinel')).toBeNull();
			expect(observe).not.toHaveBeenCalled();
		});

		it('should not render the sentinel when the list is empty', async () => {
			const { queryByTestId } = renderComponent({
				props: {
					loading: false,
					loadingMore: false,
					hasMore: true,
					executions: [],
				},
			});

			await nextTick();

			expect(queryByTestId('executions-load-more-sentinel')).toBeNull();
			expect(observe).not.toHaveBeenCalled();
		});

		it('should re-observe the sentinel after a new batch of executions arrives', async () => {
			const { rerender, getByTestId } = renderComponent({
				props: {
					loading: false,
					loadingMore: false,
					hasMore: true,
					executions: buildExecutions(20),
				},
			});

			await nextTick();
			expect(observe).toHaveBeenCalledTimes(1);

			await rerender({
				loading: false,
				loadingMore: false,
				hasMore: true,
				executions: buildExecutions(40),
			});
			await nextTick();

			expect(observe).toHaveBeenCalledTimes(2);
			expect(observe).toHaveBeenLastCalledWith(getByTestId('executions-load-more-sentinel'));
		});

		it('should not re-observe the sentinel while a load is in flight', async () => {
			const { rerender } = renderComponent({
				props: {
					loading: false,
					loadingMore: false,
					hasMore: true,
					executions: buildExecutions(20),
				},
			});

			await nextTick();
			expect(observe).toHaveBeenCalledTimes(1);

			await rerender({
				loading: false,
				loadingMore: true,
				hasMore: true,
				executions: buildExecutions(20),
			});
			await nextTick();

			expect(observe).toHaveBeenCalledTimes(1);
		});
	});
});
