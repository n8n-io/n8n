import { vi, describe, it, expect } from 'vitest';
import merge from 'lodash/merge';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { faker } from '@faker-js/faker';
import { STORES } from '@n8n/stores';
import { VIEWS } from '@/app/constants';
import ExecutionsList from './GlobalExecutionsList.vue';
import { randomInt, type ExecutionSummary } from 'n8n-workflow';
import type { MockedStore } from '@/__tests__/utils';
import {
	mockedStore,
	retry,
	SETTINGS_STORE_DEFAULT_STATE,
	waitAllPromises,
} from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { waitFor } from '@testing-library/vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useExecutionsStore } from '../../executions.store';
import type { ExecutionFilterType, ExecutionSummaryWithScopes } from '../../executions.types';

vi.mock('vue-router', () => ({
	useRoute: vi.fn().mockReturnValue({
		name: VIEWS.WORKFLOW_EXECUTIONS,
	}),
	useRouter: vi.fn(),
	RouterLink: vi.fn(),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: vi.fn().mockResolvedValue('confirm') }),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		displayTimer: (timer: number) => timer,
		baseText: (key: string) => {
			if (key === 'executionsList.retryOf') {
				return 'Retry of';
			} else if (key === 'executionsList.successRetry') {
				return 'Success retry';
			}
			return key;
		},
	}),
}));

let settingsStore: MockedStore<typeof useSettingsStore>;

const generateUndefinedNullOrString = () => {
	switch (randomInt(4)) {
		case 0:
			return undefined;
		case 1:
			return null;
		case 2:
			return faker.string.uuid();
		case 3:
			return '';
		default:
			return undefined;
	}
};

const executionDataFactory = (): ExecutionSummary => ({
	id: faker.string.uuid(),
	finished: faker.datatype.boolean(),
	mode: faker.helpers.arrayElement(['manual', 'trigger']),
	createdAt: faker.date.past(),
	startedAt: faker.date.past(),
	stoppedAt: faker.date.past(),
	workflowId: faker.number.int().toString(),
	workflowName: faker.string.sample(),
	status: faker.helpers.arrayElement(['error', 'success']),
	nodeExecutionStatus: {},
	retryOf: generateUndefinedNullOrString(),
	retrySuccessId: generateUndefinedNullOrString(),
});

const generateExecutionsData = () =>
	Array.from({ length: 2 }, () => ({
		count: 20,
		results: Array.from({ length: 10 }, executionDataFactory),
	}));

const renderComponent = createComponentRenderer(ExecutionsList, {
	pinia: createTestingPinia({
		initialState: {
			[STORES.EXECUTIONS]: {
				executions: [],
				initialLoadComplete: true,
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
	global: {
		mocks: {
			$route: {
				params: {},
			},
		},
	},
});

describe('GlobalExecutionsList', () => {
	let executionsData: Array<{
		count: number;
		results: ExecutionSummary[];
	}>;

	beforeEach(() => {
		executionsData = generateExecutionsData();
		settingsStore = mockedStore(useSettingsStore);
	});

	it('should render empty list', async () => {
		const { queryAllByTestId, queryByTestId, getByTestId } = renderComponent({
			props: {
				executions: [],
				filters: {} as ExecutionFilterType,
				total: 0,
			},
		});
		await waitAllPromises();

		await userEvent.click(getByTestId('execution-auto-refresh-checkbox'));

		expect(queryAllByTestId('select-execution-checkbox').length).toBe(0);
		expect(queryByTestId('load-more-button')).not.toBeInTheDocument();
		expect(queryByTestId('select-all-executions-checkbox')).not.toBeInTheDocument();
		expect(getByTestId('execution-list-empty')).toBeInTheDocument();
	});

	test('should handle selection flow when loading more items', async () => {
		const { getByTestId, getAllByTestId, queryByTestId, rerender } = renderComponent({
			props: {
				executions: executionsData[0].results as ExecutionSummaryWithScopes[],
				total: executionsData[0].count,
				filters: {} as ExecutionFilterType,
			},
		});
		await waitAllPromises();

		await userEvent.click(getByTestId('select-visible-executions-checkbox'));

		await retry(() => {
			expect(
				getAllByTestId('select-execution-checkbox').filter(
					(el) => el.getAttribute('data-state') === 'checked',
				).length,
			).toBe(10);
		});
		expect(getByTestId('select-all-executions-checkbox')).toBeInTheDocument();
		expect(getByTestId('selected-items-info').textContent).toContain(10);

		await userEvent.click(getByTestId('load-more-button'));
		await rerender({
			executions: executionsData[0].results.concat(executionsData[1].results),
			filteredExecutions: executionsData[0].results.concat(executionsData[1].results),
		});

		await waitFor(() => expect(getAllByTestId('select-execution-checkbox').length).toBe(20));
		expect(
			getAllByTestId('select-execution-checkbox').filter(
				(el) => el.getAttribute('data-state') === 'checked',
			).length,
		).toBe(10);

		await userEvent.click(getByTestId('select-all-executions-checkbox'));
		expect(getAllByTestId('select-execution-checkbox').length).toBe(20);
		expect(
			getAllByTestId('select-execution-checkbox').filter(
				(el) => el.getAttribute('data-state') === 'checked',
			).length,
		).toBe(20);
		expect(getByTestId('selected-items-info').textContent).toContain(20);

		await userEvent.click(getAllByTestId('select-execution-checkbox')[2]);
		expect(getAllByTestId('select-execution-checkbox').length).toBe(20);
		expect(
			getAllByTestId('select-execution-checkbox').filter(
				(el) => el.getAttribute('data-state') === 'checked',
			).length,
		).toBe(19);
		expect(getByTestId('selected-items-info').textContent).toContain(19);
		expect(getByTestId('select-visible-executions-checkbox')).toBeInTheDocument();
		expect(queryByTestId('select-all-executions-checkbox')).not.toBeInTheDocument();
	}, 10000);

	it('should stop offering "load more" once all executions are shown, even on a large instance', async () => {
		const executionsStore = mockedStore(useExecutionsStore);

		// On large tables the reported total is an inflated estimate; the user must
		// still see "all loaded" rather than a load-more button that fetches nothing.
		executionsStore.hasMoreExecutions = false;
		const { queryByTestId, getByText } = renderComponent({
			props: {
				executions: executionsData[0].results as ExecutionSummaryWithScopes[],
				total: 100_000,
				filters: {} as ExecutionFilterType,
			},
		});
		await waitAllPromises();

		expect(queryByTestId('load-more-button')).not.toBeInTheDocument();
		expect(getByText('executionsList.loadedAll')).toBeInTheDocument();

		executionsStore.hasMoreExecutions = true;
		await waitAllPromises();
		expect(queryByTestId('load-more-button')).toBeInTheDocument();
	});

	it('should show "retry" data when appropriate', async () => {
		const retryOf = executionsData[0].results.filter((execution) => execution.retryOf);
		const retrySuccessId = executionsData[0].results.filter(
			(execution) => !execution.retryOf && execution.retrySuccessId,
		);

		const { queryAllByText } = renderComponent({
			props: {
				executions: executionsData[0].results as ExecutionSummaryWithScopes[],
				total: executionsData[0].count,
				filters: {} as ExecutionFilterType,
			},
		});
		await waitAllPromises();

		expect(queryAllByText(/Retry of/).length).toBe(retryOf.length);
		expect(queryAllByText(/Success retry/).length).toBe(retrySuccessId.length);
	});

	describe('search', () => {
		const searchProps = () => ({
			executions: executionsData[0].results as ExecutionSummaryWithScopes[],
			// In search mode the total is the number of matches that are loaded.
			total: executionsData[0].results.length,
			filters: {} as ExecutionFilterType,
		});

		it('emits the search of the user', async () => {
			const { getByTestId, emitted } = renderComponent({ props: searchProps() });
			await waitAllPromises();

			await userEvent.type(getByTestId('executions-search-input'), 'ENG-123{Enter}');

			expect(emitted('update:search')).toEqual([[{ text: 'ENG-123', nodeName: '' }]]);
		});

		it('shows the search coverage in place of "load more", and the reason for each match', async () => {
			const executionsStore = mockedStore(useExecutionsStore);
			executionsStore.isSearchActive = true;
			executionsStore.hasMoreExecutions = true;
			executionsStore.searchMatchesById = {
				[executionsData[0].results[0].id]: { nodeName: 'Webhook' },
			};

			const { getByTestId, getAllByTestId, queryByTestId } = renderComponent({
				props: searchProps(),
			});
			await waitAllPromises();

			expect(getByTestId('executions-search-status')).toBeInTheDocument();
			expect(queryByTestId('load-more-button')).not.toBeInTheDocument();
			expect(getAllByTestId('execution-search-match')).toHaveLength(1);
			expect(getByTestId('execution-auto-refresh-checkbox')).toBeDisabled();
		});

		it('deletes only the selected matches, and never all executions of the filters', async () => {
			const executionsStore = mockedStore(useExecutionsStore);
			executionsStore.isSearchActive = true;

			const { getByTestId, getAllByTestId, queryByTestId } = renderComponent({
				props: searchProps(),
			});
			await waitAllPromises();

			// To select the last row one by one makes the selection equal to the total.
			// Outside a search that means "all existing", which deletes by filter.
			await userEvent.click(getByTestId('select-visible-executions-checkbox'));
			await userEvent.click(getAllByTestId('select-execution-checkbox')[0]);
			await userEvent.click(getAllByTestId('select-execution-checkbox')[0]);
			await retry(() => expect(getByTestId('selected-items-info').textContent).toContain(10));
			expect(queryByTestId('select-all-executions-checkbox')).not.toBeInTheDocument();

			await userEvent.click(getByTestId('delete-selected-button'));
			await waitAllPromises();

			expect(executionsStore.deleteExecutions).toHaveBeenCalledTimes(1);
			const [payload] = executionsStore.deleteExecutions.mock.calls[0];
			expect(payload).not.toHaveProperty('deleteBefore');
			expect(payload.ids?.sort()).toEqual(executionsData[0].results.map((e) => e.id).sort());
		});

		it('still deletes all executions of the filters when there is no search', async () => {
			const executionsStore = mockedStore(useExecutionsStore);
			executionsStore.isSearchActive = false;

			const { getByTestId } = renderComponent({ props: searchProps() });
			await waitAllPromises();

			await userEvent.click(getByTestId('select-visible-executions-checkbox'));
			await userEvent.click(await waitFor(() => getByTestId('select-all-executions-checkbox')));
			await userEvent.click(getByTestId('delete-selected-button'));
			await waitAllPromises();

			expect(executionsStore.deleteExecutions.mock.calls[0][0]).toHaveProperty('deleteBefore');
		});
	});

	it('should render concurrent executions header if the feature is enabled', async () => {
		settingsStore.concurrency = 5;
		const { getByTestId } = renderComponent({
			props: {
				executions: executionsData[0].results as ExecutionSummaryWithScopes[],
				filters: {} as ExecutionFilterType,
			},
		});

		expect(getByTestId('concurrent-executions-header')).toBeVisible();
	});
});
