import { vi, describe, it, expect } from 'vitest';
import merge from 'lodash/merge';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { faker } from '@faker-js/faker';
import { STORES } from '@n8n/stores';
import { VIEWS } from '@/constants';
import ExecutionsList from '@/components/executions/global/GlobalExecutionsList.vue';
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
import { useSettingsStore } from '@/stores/settings.store';

vi.mock('vue-router', () => ({
	useRoute: vi.fn().mockReturnValue({
		name: VIEWS.WORKFLOW_EXECUTIONS,
	}),
	useRouter: vi.fn(),
	RouterLink: vi.fn(),
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
		estimated: false,
	}));

const renderComponent = createComponentRenderer(ExecutionsList, {
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
	props: {
		autoRefreshEnabled: false,
	},
	global: {
		mocks: {
			$route: {
				params: {},
			},
		},
		stubs: ['font-awesome-icon'],
	},
});

describe('GlobalExecutionsList', () => {
	let executionsData: Array<{
		count: number;
		results: ExecutionSummary[];
		estimated: boolean;
	}>;

	beforeEach(() => {
		executionsData = generateExecutionsData();
		settingsStore = mockedStore(useSettingsStore);
	});

	it('should render empty list', async () => {
		const { queryAllByTestId, queryByTestId, getByTestId } = renderComponent({
			props: {
				executions: [],
				filters: {},
				total: 0,
				estimated: false,
			},
		});
		await waitAllPromises();

		await userEvent.click(getByTestId('execution-auto-refresh-checkbox'));

		expect(queryAllByTestId('select-execution-checkbox').length).toBe(0);
		expect(queryByTestId('load-more-button')).not.toBeInTheDocument();
		expect(queryByTestId('select-all-executions-checkbox')).not.toBeInTheDocument();
		expect(getByTestId('execution-list-empty')).toBeInTheDocument();
	});

	it(
		'should handle selection flow when loading more items',
		async () => {
			const { getByTestId, getAllByTestId, queryByTestId, rerender } = renderComponent({
				props: {
					executions: executionsData[0].results,
					total: executionsData[0].count,
					filteredExecutions: executionsData[0].results,
					filters: {},
					estimated: false,
				},
			});
			await waitAllPromises();

			await userEvent.click(getByTestId('select-visible-executions-checkbox'));

			await retry(() =>
				expect(
					getAllByTestId('select-execution-checkbox').filter((el) =>
						el.contains(el.querySelector(':checked')),
					).length,
				).toBe(10),
			);
			expect(getByTestId('select-all-executions-checkbox')).toBeInTheDocument();
			expect(getByTestId('selected-executions-info').textContent).toContain(10);

			await userEvent.click(getByTestId('load-more-button'));
			await rerender({
				executions: executionsData[0].results.concat(executionsData[1].results),
				filteredExecutions: executionsData[0].results.concat(executionsData[1].results),
			});

			await waitFor(() => expect(getAllByTestId('select-execution-checkbox').length).toBe(20));
			expect(
				getAllByTestId('select-execution-checkbox').filter((el) =>
					el.contains(el.querySelector(':checked')),
				).length,
			).toBe(10);

			await userEvent.click(getByTestId('select-all-executions-checkbox'));
			expect(getAllByTestId('select-execution-checkbox').length).toBe(20);
			expect(
				getAllByTestId('select-execution-checkbox').filter((el) =>
					el.contains(el.querySelector(':checked')),
				).length,
			).toBe(20);
			expect(getByTestId('selected-executions-info').textContent).toContain(20);

			await userEvent.click(getAllByTestId('select-execution-checkbox')[2]);
			expect(getAllByTestId('select-execution-checkbox').length).toBe(20);
			expect(
				getAllByTestId('select-execution-checkbox').filter((el) =>
					el.contains(el.querySelector(':checked')),
				).length,
			).toBe(19);
			expect(getByTestId('selected-executions-info').textContent).toContain(19);
			expect(getByTestId('select-visible-executions-checkbox')).toBeInTheDocument();
			expect(queryByTestId('select-all-executions-checkbox')).not.toBeInTheDocument();
		},
		{ timeout: 10000 },
	);

	it('should show "retry" data when appropriate', async () => {
		const retryOf = executionsData[0].results.filter((execution) => execution.retryOf);
		const retrySuccessId = executionsData[0].results.filter(
			(execution) => !execution.retryOf && execution.retrySuccessId,
		);

		const { queryAllByText } = renderComponent({
			props: {
				executions: executionsData[0].results,
				total: executionsData[0].count,
				filteredExecutions: executionsData[0].results,
				filters: {},
				estimated: false,
			},
		});
		await waitAllPromises();

		expect(queryAllByText(/Retry of/).length).toBe(retryOf.length);
		expect(queryAllByText(/Success retry/).length).toBe(retrySuccessId.length);
	});

	it('should render concurrent executions header if the feature is enabled', async () => {
		settingsStore.concurrency = 5;
		const { getByTestId } = renderComponent({
			props: {
				executions: executionsData[0].results,
				filters: {},
			},
		});

		expect(getByTestId('concurrent-executions-header')).toBeVisible();
	});
});
