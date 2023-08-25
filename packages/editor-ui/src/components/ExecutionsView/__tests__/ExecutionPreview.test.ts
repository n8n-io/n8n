import { vi, describe, expect } from 'vitest';
import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { faker } from '@faker-js/faker';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia, PiniaVuePlugin, setActivePinia } from 'pinia';
import type { IExecutionsSummary } from 'n8n-workflow';
import { useSettingsStore, useWorkflowsStore } from '@/stores';
import ExecutionPreview from '@/components/ExecutionsView/ExecutionPreview.vue';
import { VIEWS } from '@/constants';
import { i18nInstance, I18nPlugin } from '@/plugins/i18n';
import { FontAwesomePlugin } from '@/plugins/icons';
import { GlobalComponentsPlugin } from '@/plugins/components';

let pinia: ReturnType<typeof createPinia>;

const routes = [
	{ path: '/', name: 'home', component: { template: '<div></div>' } },
	{
		path: '/workflow/:name/debug/:executionId',
		name: VIEWS.EXECUTION_DEBUG,
		component: { template: '<div></div>' },
	},
];

const router = createRouter({
	history: createWebHistory(),
	routes,
});

const $route = {
	params: {},
};

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

const executionDataFactory = (): IExecutionsSummary => ({
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

describe('ExecutionPreview.vue', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let settingsStore: ReturnType<typeof useSettingsStore>;
	const executionData: IExecutionsSummary = executionDataFactory();

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);

		workflowsStore = useWorkflowsStore();
		settingsStore = useSettingsStore();

		vi.spyOn(workflowsStore, 'activeWorkflowExecution', 'get').mockReturnValue(executionData);
	});

	test.each([
		[false, '/'],
		[true, `/workflow/${executionData.workflowId}/debug/${executionData.id}`],
	])(
		'when debug enterprise feature is %s it should handle debug link click accordingly',
		async (availability, path) => {
			vi.spyOn(settingsStore, 'isEnterpriseFeatureEnabled', 'get').mockReturnValue(
				() => availability,
			);

			// Not using createComponentRenderer helper here because this component should not stub `router-link`
			const { getByTestId } = render(ExecutionPreview, {
				global: {
					plugins: [
						I18nPlugin,
						i18nInstance,
						PiniaVuePlugin,
						FontAwesomePlugin,
						GlobalComponentsPlugin,
						pinia,
						router,
					],
					mocks: {
						$route,
					},
				},
			});

			await userEvent.click(getByTestId('execution-debug-button'));

			expect(router.currentRoute.value.path).toBe(path);
		},
	);
});
