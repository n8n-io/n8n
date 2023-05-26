import { vi, describe, it, expect } from 'vitest';
import Vue from 'vue';
import { PiniaVuePlugin } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { faker } from '@faker-js/faker';
import { STORES } from '@/constants';
import ExecutionsList from '@/components/ExecutionsList.vue';
import { externalHooks } from '@/mixins/externalHooks';
import { genericHelpers } from '@/mixins/genericHelpers';
import { executionHelpers } from '@/mixins/executionsHelpers';
import { i18nInstance } from '@/plugins/i18n';
import type { IWorkflowDb } from '@/Interface';
import type { IExecutionsSummary } from 'n8n-workflow';
import { waitAllPromises } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/stores';

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
});

const workflowsData = Array.from({ length: 10 }, workflowDataFactory);

const executionsData = Array.from({ length: 2 }, () => ({
	count: 20,
	results: Array.from({ length: 10 }, executionDataFactory),
	estimated: false,
}));

const renderOptions = {
	pinia: createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: {
				settings: {
					templates: {
						enabled: true,
						host: 'https://api.n8n.io/api/',
					},
					license: {
						environment: 'development',
					},
					deployment: {
						type: 'default',
					},
					enterprise: {
						advancedExecutionFilters: true,
					},
				},
			},
		},
	}),
	i18n: i18nInstance,
	stubs: ['font-awesome-icon'],
	mixins: [externalHooks, genericHelpers, executionHelpers],
};

function TelemetryPlugin(vue: typeof Vue): void {
	Object.defineProperty(vue, '$telemetry', {
		get() {
			return {
				track: () => {},
			};
		},
	});
	Object.defineProperty(vue.prototype, '$telemetry', {
		get() {
			return {
				track: () => {},
			};
		},
	});
}

const renderComponent = async () => {
	const renderResult = render(ExecutionsList, renderOptions);
	await waitAllPromises();
	return renderResult;
};

Vue.use(TelemetryPlugin);
Vue.use(PiniaVuePlugin);

describe('ExecutionsList.vue', () => {
	const workflowsStore: ReturnType<typeof useWorkflowsStore> = useWorkflowsStore();
	beforeEach(() => {
		vi.spyOn(workflowsStore, 'fetchAllWorkflows').mockResolvedValue(workflowsData);
		vi.spyOn(workflowsStore, 'getCurrentExecutions').mockResolvedValue([]);
	});

	afterEach(() => {
		vi.clearAllMocks();
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
		await userEvent.click(getByTestId('execution-auto-refresh-checkbox'));

		await userEvent.click(getByTestId('select-visible-executions-checkbox'));

		expect(storeSpy).toHaveBeenCalledTimes(1);
		expect(
			getAllByTestId('select-execution-checkbox').filter((el) =>
				el.contains(el.querySelector(':checked')),
			).length,
		).toBe(10);
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
});
