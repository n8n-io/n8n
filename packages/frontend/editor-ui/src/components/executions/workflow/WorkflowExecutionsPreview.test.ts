import { describe, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { faker } from '@faker-js/faker';
import { createRouter, createWebHistory, RouterLink } from 'vue-router';
import { randomInt, type ExecutionSummary } from 'n8n-workflow';
import { useSettingsStore } from '@/stores/settings.store';
import WorkflowExecutionsPreview from '@/components/executions/workflow/WorkflowExecutionsPreview.vue';
import { EnterpriseEditionFeature, VIEWS } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { ExecutionSummaryWithScopes, IWorkflowDb } from '@/Interface';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';

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

const executionDataFactory = (): ExecutionSummaryWithScopes => ({
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
	scopes: ['workflow:update'],
});

const renderComponent = createComponentRenderer(WorkflowExecutionsPreview, {
	global: {
		stubs: {
			// UN STUB router-link
			'router-link': RouterLink,
		},
		plugins: [router],
	},
});

describe('WorkflowExecutionsPreview.vue', () => {
	const executionData: ExecutionSummary = executionDataFactory();

	beforeEach(() => {
		createTestingPinia();
	});

	test.each([
		[false, [], '/'],
		[false, ['workflow:update'], '/'],
		[true, [], '/'],
		[true, ['workflow:read'], '/'],
		[true, ['workflow:update'], `/workflow/${executionData.workflowId}/debug/${executionData.id}`],
	])(
		'when debug enterprise feature is %s with workflow scopes %s it should handle debug link click accordingly',
		async (availability, scopes, path) => {
			const settingsStore = mockedStore(useSettingsStore);
			const workflowsStore = mockedStore(useWorkflowsStore);

			settingsStore.settings.enterprise = {
				...(settingsStore.settings.enterprise ?? {}),
				[EnterpriseEditionFeature.DebugInEditor]: availability,
			};

			workflowsStore.workflowsById[executionData.workflowId] = { scopes } as IWorkflowDb;

			await router.push(path);

			const { getByTestId } = renderComponent({ props: { execution: executionData } });

			await userEvent.click(getByTestId('execution-debug-button'));

			expect(router.currentRoute.value.path).toBe(path);
		},
	);

	it('disables the stop execution button when the user cannot update', () => {
		const { getByTestId } = renderComponent({
			props: { execution: { ...executionData, status: 'running' } },
		});

		expect(getByTestId('stop-execution')).toBeDisabled();
	});
});
