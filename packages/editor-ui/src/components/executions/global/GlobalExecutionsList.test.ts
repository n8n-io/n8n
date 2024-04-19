import { vi, describe, it, expect } from 'vitest';
import { merge } from 'lodash-es';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { faker } from '@faker-js/faker';
import { STORES, VIEWS } from '@/constants';
import ExecutionsList from '@/components/executions/global/GlobalExecutionsList.vue';
import type { IWorkflowDb } from '@/Interface';
import type { ExecutionSummary } from 'n8n-workflow';
import { retry, SETTINGS_STORE_DEFAULT_STATE, waitAllPromises } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { waitFor } from '@testing-library/vue';

vi.mock('vue-router', () => ({
	useRoute: vi.fn().mockReturnValue({
		name: VIEWS.WORKFLOW_EXECUTIONS,
	}),
	useRouter: vi.fn(),
	RouterLink: vi.fn(),
}));

let pinia: ReturnType<typeof createTestingPinia>;

const generateUndefinedNullOrString = () => {
	switch (Math.floor(Math.random() * 4)) {
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

const workflowDataFactory = (): IWorkflowDb => ({
	createdAt: faker.date.past().toDateString(),
	updatedAt: faker.date.past().toDateString(),
	id: faker.string.uuid(),
	name: faker.string.sample(),
	active: faker.datatype.boolean(),
	tags: [],
	nodes: [],
	connections: {},
	versionId: faker.number.int().toString(),
});

const executionDataFactory = (): ExecutionSummary => ({
	id: faker.string.uuid(),
	finished: faker.datatype.boolean(),
	mode: faker.helpers.arrayElement(['manual', 'trigger']),
	startedAt: faker.date.past(),
	stoppedAt: faker.date.past(),
	workflowId: faker.number.int().toString(),
	workflowName: faker.string.sample(),
	status: faker.helpers.arrayElement(['error', 'success']),
	nodeExecutionStatus: {},
	retryOf: generateUndefinedNullOrString(),
	retrySuccessId: generateUndefinedNullOrString(),
});

const generateWorkflowsData = () => Array.from({ length: 10 }, workflowDataFactory);

const generateExecutionsData = () =>
	Array.from({ length: 2 }, () => ({
		count: 20,
		results: Array.from({ length: 10 }, executionDataFactory),
		estimated: false,
	}));

const renderComponent = createComponentRenderer(ExecutionsList, {
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

		pinia = createTestingPinia({
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
		});
	});

	it('should render empty list', async () => {
		const { queryAllByTestId, queryByTestId, getByTestId } = renderComponent({
			props: {
				executions: [],
			},
			pinia,
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
				},
				pinia,
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
			},
			pinia,
		});
		await waitAllPromises();

		expect(queryAllByText(/Retry of/).length).toBe(retryOf.length);
		expect(queryAllByText(/Success retry/).length).toBe(retrySuccessId.length);
	});
});
