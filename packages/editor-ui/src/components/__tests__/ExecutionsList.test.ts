import { vi, describe, it, expect, afterEach } from 'vitest';
import Vue from 'vue';
import { PiniaVuePlugin } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { render, cleanup, fireEvent } from '@testing-library/vue';
import { faker } from '@faker-js/faker';
import { STORES } from '@/constants';
import ExecutionsList from '@/components/ExecutionsList.vue';
import { externalHooks } from '@/mixins/externalHooks';
import { genericHelpers } from '@/mixins/genericHelpers';
import { executionHelpers } from '@/mixins/executionsHelpers';
import { showMessage } from '@/mixins/showMessage';
import { i18nInstance, I18nPlugin } from '@/plugins/i18n';
import type { IWorkflowShortResponse } from '@/Interface';
import type { IExecutionsSummary } from 'n8n-workflow';

const workflowDataFactory = (): IWorkflowShortResponse => ({
	createdAt: faker.date.past().toDateString(),
	updatedAt: faker.date.past().toDateString(),
	id: faker.datatype.uuid(),
	name: faker.datatype.string(),
	active: faker.datatype.boolean(),
	tags: [],
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

let getPastExecutionsSpy = vi.fn().mockResolvedValue({ count: 0, results: [], estimated: false });

const mockRestApiMixin = Vue.extend({
	methods: {
		restApi() {
			return {
				getWorkflows: vi.fn().mockResolvedValue(workflowsData),
				getCurrentExecutions: vi.fn().mockResolvedValue([]),
				getPastExecutions: getPastExecutionsSpy,
			};
		},
	},
});

const renderOptions = {
	pinia: createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: {
				settings: {
					templates: {
						enabled: true,
						host: 'https://api.n8n.io/api/',
					},
				},
			},
		},
	}),
	i18n: i18nInstance,
	stubs: ['font-awesome-icon'],
	mixins: [externalHooks, genericHelpers, executionHelpers, showMessage, mockRestApiMixin],
};

export function TelemetryPlugin(vue: typeof Vue): void {
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

const renderComponent = () =>
	render(ExecutionsList, renderOptions, (vue) => {
		vue.use(TelemetryPlugin);
		vue.use(PiniaVuePlugin);
		vue.use((vue) => I18nPlugin(vue));
	});

describe('ExecutionsList.vue', () => {
	afterEach(cleanup);

	it('should render empty list', async () => {
		const { queryAllByTestId, queryByTestId, getByTestId } = renderComponent();
		// wait for all previous promises to make sure the component is fully rendered
		await new Promise((resolve) => setTimeout(resolve));

		expect(queryAllByTestId('select-execution-checkbox').length).toBe(0);
		expect(queryByTestId('load-more-button')).not.toBeInTheDocument();
		expect(getByTestId('execution-list-empty')).toBeInTheDocument();
	});

	it('should handle visible executions selection', async () => {
		getPastExecutionsSpy = vi.fn().mockResolvedValue(executionsData[0]);

		const { getAllByTestId, getByTestId, queryByTestId } = renderComponent();
		// wait for all previous promises to make sure the component is fully rendered
		await new Promise((resolve) => setTimeout(resolve));

		const executionsData1Length = executionsData[0].results.length;
		const itemCheckboxes = getAllByTestId('select-execution-checkbox');
		expect(itemCheckboxes.length).toBe(executionsData1Length);

		expect(getByTestId('load-more-button')).toBeInTheDocument();
		expect(queryByTestId('execution-list-empty')).not.toBeInTheDocument();

		await fireEvent.click(getByTestId('select-visible-executions-checkbox'));

		expect(itemCheckboxes.filter((el) => el.contains(el.querySelector(':checked'))).length).toBe(
			executionsData1Length,
		);
		expect(getByTestId('selected-executions-info').textContent).toContain(executionsData1Length);

		const firstCheckbox = itemCheckboxes[0];
		await fireEvent.click(firstCheckbox);

		expect(itemCheckboxes.filter((el) => el.contains(el.querySelector(':checked'))).length).toBe(
			executionsData1Length - 1,
		);
		expect(getByTestId('selected-executions-info').textContent).toContain(
			executionsData1Length - 1,
		);
	});

	it('should handle load more', async () => {
		getPastExecutionsSpy = vi
			.fn()
			.mockResolvedValueOnce(executionsData[0])
			.mockResolvedValueOnce(executionsData[1]);

		const { getAllByTestId, getByTestId } = renderComponent();
		// wait for all previous promises to make sure the component is fully rendered
		await new Promise((resolve) => setTimeout(resolve));

		let executionsDataLength = executionsData[0].results.length;
		let itemCheckboxes = getAllByTestId('select-execution-checkbox');
		expect(itemCheckboxes.length).toBe(executionsDataLength);

		await fireEvent.click(getByTestId('load-more-button'));
		await new Promise((resolve) => setTimeout(resolve));

		executionsDataLength += executionsData[1].results.length;
		itemCheckboxes = getAllByTestId('select-execution-checkbox');
		expect(itemCheckboxes.length).toBe(executionsDataLength);
	});
});
