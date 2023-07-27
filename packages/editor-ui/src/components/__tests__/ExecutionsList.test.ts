import { vi, describe, it, expect } from 'vitest';
import { merge } from 'lodash-es';
import { PiniaVuePlugin } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { faker } from '@faker-js/faker';
import { STORES } from '@/constants';
import ExecutionsList from '@/components/ExecutionsList.vue';
import { i18nInstance } from '@/plugins/i18n';
import type { IWorkflowDb } from '@/Interface';
import type { IExecutionsSummary } from 'n8n-workflow';
import { retry, SETTINGS_STORE_DEFAULT_STATE, waitAllPromises } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/stores';

let pinia: ReturnType<typeof createTestingPinia>;

const generateUndefinedNullOrString = () => {
	switch (Math.floor(Math.random() * 4)) {
		case 0:
			return undefined;
		case 1:
			return null;
		case 2:
			return faker.datatype.uuid();
		case 3:
			return '';
		default:
			return undefined;
	}
};

const workflowDataFactory = (): IWorkflowDb => ({
	createdAt: faker.date.past().toDateString(),
	updatedAt: faker.date.past().toDateString(),
	id: faker.datatype.uuid(),
	name: faker.datatype.string(),
	active: faker.datatype.boolean(),
	tags: [],
	nodes: [],
	connections: {},
	versionId: faker.datatype.number().toString(),
});

const executionDataFactory = (): IExecutionsSummary => ({
	id: faker.datatype.uuid(),
	finished: faker.datatype.boolean(),
	mode: faker.helpers.arrayElement(['manual', 'trigger']),
	startedAt: faker.date.past(),
	stoppedAt: faker.date.past(),
	workflowId: faker.datatype.number().toString(),
	workflowName: faker.datatype.string(),
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

const renderComponent = async () => {
	const renderResult = render(
		ExecutionsList,
		{
			pinia,
			propsData: {
				autoRefreshEnabled: false,
			},
			i18n: i18nInstance,
			stubs: ['font-awesome-icon'],
		},
		(vue) => {
			vue.use(PiniaVuePlugin);
			vue.prototype.$telemetry = {
				track: () => {},
			};
		},
	);
	await waitAllPromises();
	return renderResult;
};

describe('ExecutionsList.vue', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let workflowsData: IWorkflowDb[];
	let executionsData: Array<{
		count: number;
		results: IExecutionsSummary[];
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
		vi.spyOn(workflowsStore, 'getCurrentExecutions').mockResolvedValue([]);
	});

	it('should render empty list', async () => {
		vi.spyOn(workflowsStore, 'getPastExecutions').mockResolvedValueOnce({
			count: 0,
			results: [],
			estimated: false,
		});
		const { queryAllByTestId, queryByTestId, getByTestId } = await renderComponent();
		await userEvent.click(getByTestId('execution-auto-refresh-checkbox'));

		expect(queryAllByTestId('select-execution-checkbox').length).toBe(0);
		expect(queryByTestId('load-more-button')).not.toBeInTheDocument();
		expect(queryByTestId('select-all-executions-checkbox')).not.toBeInTheDocument();
		expect(getByTestId('execution-list-empty')).toBeInTheDocument();
	});

	it('should handle selection flow when loading more items', async () => {
		const storeSpy = vi
			.spyOn(workflowsStore, 'getPastExecutions')
			.mockResolvedValueOnce(executionsData[0])
			.mockResolvedValueOnce(executionsData[1]);

		const { getByTestId, getAllByTestId, queryByTestId } = await renderComponent();

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
	});

	it('should show "retry" data when appropriate', async () => {
		vi.spyOn(workflowsStore, 'getPastExecutions').mockResolvedValue(executionsData[0]);
		const retryOf = executionsData[0].results.filter((execution) => execution.retryOf);
		const retrySuccessId = executionsData[0].results.filter(
			(execution) => !execution.retryOf && execution.retrySuccessId,
		);

		const { queryAllByText } = await renderComponent();

		expect(queryAllByText(/Retry of/).length).toBe(retryOf.length);
		expect(queryAllByText(/Success retry/).length).toBe(retrySuccessId.length);
	});
});
