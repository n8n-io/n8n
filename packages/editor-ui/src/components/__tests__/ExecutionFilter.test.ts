import { describe, test, expect } from 'vitest';
import Vue from 'vue';
import { PiniaVuePlugin } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { render, RenderOptions } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { faker } from '@faker-js/faker';
import ExecutionFilter from '@/components/ExecutionFilter.vue';
import { STORES } from '@/constants';
import { i18nInstance } from '@/plugins/i18n';
import type { IWorkflowShortResponse, ExecutionFilterType } from '@/Interface';

Vue.use(PiniaVuePlugin);

const defaultFilterState: ExecutionFilterType = {
	status: 'all',
	workflowId: 'all',
	tags: [],
	startDate: '',
	endDate: '',
	metadata: [{ key: '', value: '' }],
};

const workflowDataFactory = (): IWorkflowShortResponse => ({
	createdAt: faker.date.past().toDateString(),
	updatedAt: faker.date.past().toDateString(),
	id: faker.datatype.uuid(),
	name: faker.datatype.string(),
	active: faker.datatype.boolean(),
	tags: [],
});

const workflowsData = Array.from({ length: 10 }, workflowDataFactory);

const initialState = {
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
};

const renderOptions: RenderOptions<ExecutionFilter> = {
	i18n: i18nInstance,
};

describe('ExecutionFilter', () => {
	test.each([
		['development', 'default', false, workflowsData],
		['development', 'default', true, workflowsData],
		['development', 'cloud', false, undefined],
		['development', 'cloud', true, undefined],
		['production', 'cloud', false, workflowsData],
		['production', 'cloud', true, undefined],
		['production', 'default', false, undefined],
		['production', 'default', true, workflowsData],
	])(
		'renders in %s environment on %s deployment with advancedExecutionFilters %s and workflows %s',
		async (environment, deployment, advancedExecutionFilters, workflows) => {
			initialState[STORES.SETTINGS].settings.license.environment = environment;
			initialState[STORES.SETTINGS].settings.deployment.type = deployment;
			initialState[STORES.SETTINGS].settings.enterprise.advancedExecutionFilters =
				advancedExecutionFilters;

			renderOptions.pinia = createTestingPinia({ initialState });
			renderOptions.props = { workflows };

			const { getByTestId, queryByTestId } = render(ExecutionFilter, renderOptions);

			await userEvent.click(getByTestId('executions-filter-button'));
			await userEvent.hover(getByTestId('execution-filter-saved-data-key-input'));

			if (advancedExecutionFilters) {
				expect(queryByTestId('executions-filter-view-plans-link')).not.toBeInTheDocument();
			}

			expect(queryByTestId('executions-filter-reset-button')).not.toBeInTheDocument();
			expect(!!queryByTestId('executions-filter-workflows-select')).toBe(!!workflows?.length);
		},
	);

	test('state change', async () => {
		const { getByTestId, queryByTestId, emitted } = render(ExecutionFilter, renderOptions);

		const filterChangedEvent = emitted().filterChanged;
		expect(filterChangedEvent).toHaveLength(1);
		expect(filterChangedEvent[0]).toEqual([defaultFilterState]);

		expect(getByTestId('execution-filter-form')).not.toBeVisible();
		expect(queryByTestId('executions-filter-reset-button')).not.toBeInTheDocument();
		expect(queryByTestId('execution-filter-badge')).not.toBeInTheDocument();

		await userEvent.click(getByTestId('executions-filter-button'));
		expect(getByTestId('execution-filter-form')).toBeVisible();

		await userEvent.click(getByTestId('executions-filter-status-select'));
		await userEvent.click(getByTestId('executions-filter-status-select').querySelectorAll('li')[1]);

		expect(emitted().filterChanged).toHaveLength(2);
		expect(filterChangedEvent[1]).toEqual([{ ...defaultFilterState, status: 'error' }]);
		expect(getByTestId('executions-filter-reset-button')).toBeInTheDocument();
		expect(getByTestId('execution-filter-badge')).toBeInTheDocument();

		await userEvent.click(getByTestId('executions-filter-reset-button'));
		expect(emitted().filterChanged).toHaveLength(3);
		expect(filterChangedEvent[2]).toEqual([defaultFilterState]);
		expect(queryByTestId('executions-filter-reset-button')).not.toBeInTheDocument();
		expect(queryByTestId('execution-filter-badge')).not.toBeInTheDocument();
	});
});
