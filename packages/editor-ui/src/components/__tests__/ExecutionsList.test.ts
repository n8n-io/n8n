import { vi, describe, it, expect } from 'vitest';
import { merge } from 'lodash-es';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { faker } from '@faker-js/faker';
import { STORES, VIEWS } from '@/constants';
import ExecutionsList from '@/components/ExecutionsList.vue';
import type { IWorkflowDb } from '@/Interface';
import type { ExecutionSummary } from 'n8n-workflow';
import { retry, SETTINGS_STORE_DEFAULT_STATE, waitAllPromises } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { RenderOptions } from '@/__tests__/render';
import { createComponentRenderer } from '@/__tests__/render';

vi.mock('vue-router', () => ({
	useRoute: vi.fn().mockReturnValue({
		name: VIEWS.WORKFLOW_EXECUTIONS,
	}),
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
	status: faker.helpers.arrayElement(['failed', 'success']),
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

const defaultRenderOptions: RenderOptions = {
	props: {
		autoRefreshEnabled: false,
	},
	global: {
		stubs: {
			stubs: ['font-awesome-icon'],
		},
	},
};

const renderComponent = createComponentRenderer(ExecutionsList, defaultRenderOptions);

describe('ExecutionsList.vue', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let workflowsData: IWorkflowDb[];
	let executionsData: Array<{
		count: number;
		results: ExecutionSummary[];
		estimated: boolean;
	}>;

	beforeEach(() => {
		workflowsData = generateWorkflowsData();
		executionsData = generateExecutionsData();

		pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: merge(SETTINGS_STORE_DEFAULT_STATE.settings, {
						enterprise: {
							advancedExecutionFilters: true,
						},
					}),
				},
			},
		});
		workflowsStore = useWorkflowsStore();

		vi.spyOn(workflowsStore, 'fetchAllWorkflows').mockResolvedValue(workflowsData);
		vi.spyOn(workflowsStore, 'getActiveExecutions').mockResolvedValue([]);
	});

	it('should render empty list', async () => {
		vi.spyOn(workflowsStore, 'getPastExecutions').mockResolvedValueOnce({
			count: 0,
			results: [],
			estimated: false,
		});
		const { queryAllByTestId, queryByTestId, getByTestId } = renderComponent({
			global: {
				plugins: [pinia],
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
			const storeSpy = vi
				.spyOn(workflowsStore, 'getPastExecutions')
				.mockResolvedValueOnce(executionsData[0])
				.mockResolvedValueOnce(executionsData[1]);

			const { getByTestId, getAllByTestId, queryByTestId } = renderComponent({
				global: {
					plugins: [pinia],
				},
			});
			await waitAllPromises();

			expect(storeSpy).toHaveBeenCalledTimes(1);

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

			expect(storeSpy).toHaveBeenCalledTimes(2);
			expect(getAllByTestId('select-execution-checkbox').length).toBe(20);
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
		vi.spyOn(workflowsStore, 'getPastExecutions').mockResolvedValue(executionsData[0]);
		const retryOf = executionsData[0].results.filter((execution) => execution.retryOf);
		const retrySuccessId = executionsData[0].results.filter(
			(execution) => !execution.retryOf && execution.retrySuccessId,
		);

		const { queryAllByText } = renderComponent({
			global: {
				plugins: [pinia],
			},
		});
		await waitAllPromises();

		expect(queryAllByText(/Retry of/).length).toBe(retryOf.length);
		expect(queryAllByText(/Success retry/).length).toBe(retrySuccessId.length);
	});
});
