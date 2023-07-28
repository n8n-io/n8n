import { describe, test, expect } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { faker } from '@faker-js/faker';
import ExecutionFilter from '@/components/ExecutionFilter.vue';
import { STORES } from '@/constants';
import type { IWorkflowShortResponse, ExecutionFilterType } from '@/Interface';
import { createComponentRenderer } from '@/__tests__/render';
import * as telemetryModule from '@/composables/useTelemetry';
import type { Telemetry } from '@/plugins/telemetry';
import { merge } from 'lodash-es';

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
	id: faker.string.uuid(),
	name: faker.string.sample(),
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

const renderComponent = createComponentRenderer(ExecutionFilter, {
	props: {
		teleported: false,
	},
});

describe('ExecutionFilter', () => {
	afterAll(() => {
		vi.clearAllMocks();
	});

	test('telemetry sent only once after component is mounted', async () => {
		const track = vi.fn();
		const spy = vi.spyOn(telemetryModule, 'useTelemetry');
		spy.mockImplementation(
			() =>
				({
					track,
				}) as unknown as Telemetry,
		);

		const { getByTestId } = renderComponent({
			pinia: createTestingPinia({ initialState }),
		});
		const customDataKeyInput = getByTestId('execution-filter-saved-data-key-input');

		await userEvent.type(customDataKeyInput, 'test');
		await userEvent.type(customDataKeyInput, 'key');

		expect(track).toHaveBeenCalledTimes(1);
	});

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
		'renders in %s environment on %s deployment with advancedExecutionFilters %s',
		async (environment, deployment, advancedExecutionFilters, workflows) => {
			const { html, getByTestId, queryByTestId, queryAllByTestId } = renderComponent({
				props: { workflows },
				pinia: createTestingPinia({
					initialState: merge(initialState, {
						[STORES.SETTINGS]: {
							settings: {
								license: {
									environment,
								},
								deployment: {
									type: deployment,
								},
								enterprise: {
									advancedExecutionFilters,
								},
							},
						},
					}),
				}),
			});

			await userEvent.click(getByTestId('executions-filter-button'));
			await userEvent.hover(getByTestId('execution-filter-saved-data-key-input'));

			if (advancedExecutionFilters) {
				expect(queryByTestId('executions-filter-view-plans-link')).not.toBeVisible();
			}

			expect(queryByTestId('executions-filter-reset-button')).not.toBeInTheDocument();

			const select = queryByTestId('executions-filter-workflows-select');
			if (workflows && workflows.length > 0) {
				expect(select).toBeVisible();
			} else {
				expect(select).not.toBeInTheDocument();
			}
		},
	);

	test('state change', async () => {
		const { html, getByTestId, queryByTestId, emitted } = renderComponent({
			pinia: createTestingPinia({ initialState }),
		});

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
