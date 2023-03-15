import { vi, describe, test, expect } from 'vitest';
import Vue from 'vue';
import { PiniaVuePlugin } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { render, RenderOptions } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { faker } from '@faker-js/faker';
import ExecutionFilter from '@/components/ExecutionFilter.vue';
import { STORES } from '@/constants';
import { i18nInstance } from '@/plugins/i18n';
import type { IWorkflowShortResponse } from '@/Interface';

Vue.use(PiniaVuePlugin);

const CLOUD_HOST = 'https://app.n8n.cloud';
const PRODUCTION_SUBSCRIPTION_HOST = 'https://subscription.n8n.io';
const DEVELOPMENT_SUBSCRIPTION_HOST = 'https://staging-subscription.n8n.io';

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
		['development', 'default', DEVELOPMENT_SUBSCRIPTION_HOST, false, workflowsData],
		['development', 'default', '', true, workflowsData],
		['development', 'cloud', CLOUD_HOST, false, undefined],
		['development', 'cloud', '', true, undefined],
		['production', 'cloud', CLOUD_HOST, false, workflowsData],
		['production', 'cloud', '', true, undefined],
		['production', 'default', PRODUCTION_SUBSCRIPTION_HOST, false, undefined],
		['production', 'default', '', true, workflowsData],
	])(
		'renders in %s environment on %s deployment with advancedExecutionFilters %s and workflows %s',
		async (environment, deployment, plansLinkUrlBase, advancedExecutionFilters, workflows) => {
			initialState[STORES.SETTINGS].settings.license.environment = environment;
			initialState[STORES.SETTINGS].settings.deployment.type = deployment;
			initialState[STORES.SETTINGS].settings.enterprise.advancedExecutionFilters =
				advancedExecutionFilters;

			renderOptions.pinia = createTestingPinia({ initialState });
			renderOptions.props = { workflows };

			const { getByTestId, queryByTestId } = render(ExecutionFilter, renderOptions);

			await userEvent.click(getByTestId('executions-filter-button'));
			await userEvent.hover(getByTestId('execution-filter-saved-data-key-input'));

			if (!advancedExecutionFilters) {
				expect(getByTestId('executions-filter-view-plans-link').getAttribute('href')).contains(
					plansLinkUrlBase,
				);
			} else {
				expect(queryByTestId('executions-filter-view-plans-link')).not.toBeInTheDocument();
			}

			expect(queryByTestId('executions-filter-reset-button')).not.toBeInTheDocument();
			expect(!!queryByTestId('executions-filter-workflows-select')).toBe(!!workflows?.length);
		},
	);
});
