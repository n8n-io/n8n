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
import type { FrontendSettings } from '@n8n/api-types';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';
import { useExecutionsStore } from '@/stores/executions.store';
import type { TestDefinitionRecord } from '@/api/testDefinition.ee';

const showMessage = vi.fn();
const showError = vi.fn();
const showToast = vi.fn();
vi.mock('@/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError, showToast }),
}));

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

const executionDataFactory = (
	tags: Array<{ id: string; name: string }> = [],
): ExecutionSummaryWithScopes => ({
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
	annotation: { tags, vote: 'up' },
});

const testCaseFactory = (workflowId: string, annotationTagId?: string): TestDefinitionRecord => ({
	id: faker.string.uuid(),
	createdAt: faker.date.past().toString(),
	updatedAt: faker.date.past().toString(),
	evaluationWorkflowId: null,
	annotationTagId,
	workflowId,
	name: `My test ${faker.number.int()}`,
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
			} as FrontendSettings['enterprise'];

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

	describe('test execution crud', () => {
		it('should add an execution to a testcase', async () => {
			const tag = { id: 'tag_id', name: 'tag_name' };
			const execution = executionDataFactory([]);
			const testCase = testCaseFactory(execution.workflowId, tag.id);

			const testDefinitionStore = mockedStore(useTestDefinitionStore);
			const executionsStore = mockedStore(useExecutionsStore);
			const settingsStore = mockedStore(useSettingsStore);

			testDefinitionStore.allTestDefinitionsByWorkflowId[execution.workflowId] = [testCase];

			settingsStore.isEnterpriseFeatureEnabled = {
				advancedExecutionFilters: true,
			} as FrontendSettings['enterprise'];

			const { getByTestId } = renderComponent({
				props: { execution: { ...execution, status: 'success' } },
			});

			await router.push({ params: { name: execution.workflowId }, query: { testId: testCase.id } });

			expect(getByTestId('test-execution-crud')).toBeInTheDocument();
			expect(getByTestId('test-execution-add')).toBeVisible();

			await userEvent.click(getByTestId('test-execution-add'));

			expect(executionsStore.annotateExecution).toHaveBeenCalledWith(execution.id, {
				tags: [testCase.annotationTagId],
			});

			expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});

		it('should remove an execution from a testcase', async () => {
			const tag = { id: 'tag_id', name: 'tag_name' };
			const execution = executionDataFactory([tag]);
			const testCase = testCaseFactory(execution.workflowId, tag.id);

			const testDefinitionStore = mockedStore(useTestDefinitionStore);
			const executionsStore = mockedStore(useExecutionsStore);
			const settingsStore = mockedStore(useSettingsStore);

			testDefinitionStore.allTestDefinitionsByWorkflowId[execution.workflowId] = [testCase];

			settingsStore.isEnterpriseFeatureEnabled = {
				advancedExecutionFilters: true,
			} as FrontendSettings['enterprise'];

			const { getByTestId } = renderComponent({
				props: { execution: { ...execution, status: 'success' } },
			});

			await router.push({ params: { name: execution.workflowId }, query: { testId: testCase.id } });

			expect(getByTestId('test-execution-crud')).toBeInTheDocument();
			expect(getByTestId('test-execution-remove')).toBeVisible();

			await userEvent.click(getByTestId('test-execution-remove'));

			expect(executionsStore.annotateExecution).toHaveBeenCalledWith(execution.id, {
				tags: [],
			});

			expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});

		it('should toggle an execution', async () => {
			const tag1 = { id: 'tag_id', name: 'tag_name' };
			const tag2 = { id: 'tag_id_2', name: 'tag_name_2' };
			const execution = executionDataFactory([tag1]);
			const testCase1 = testCaseFactory(execution.workflowId, tag1.id);
			const testCase2 = testCaseFactory(execution.workflowId, tag2.id);

			const testDefinitionStore = mockedStore(useTestDefinitionStore);
			const executionsStore = mockedStore(useExecutionsStore);
			const settingsStore = mockedStore(useSettingsStore);

			testDefinitionStore.allTestDefinitionsByWorkflowId[execution.workflowId] = [
				testCase1,
				testCase2,
			];

			settingsStore.isEnterpriseFeatureEnabled = {
				advancedExecutionFilters: true,
			} as FrontendSettings['enterprise'];

			const { getByTestId, queryAllByTestId, rerender } = renderComponent({
				props: { execution: { ...execution, status: 'success' } },
			});

			await router.push({ params: { name: execution.workflowId } });

			expect(getByTestId('test-execution-crud')).toBeInTheDocument();
			expect(getByTestId('test-execution-toggle')).toBeVisible();

			// add
			await userEvent.click(getByTestId('test-execution-toggle'));
			await userEvent.click(queryAllByTestId('test-execution-add-to')[1]);
			expect(executionsStore.annotateExecution).toHaveBeenCalledWith(execution.id, {
				tags: [tag1.id, tag2.id],
			});

			const executionWithBothTags = executionDataFactory([tag1, tag2]);
			await rerender({ execution: { ...executionWithBothTags, status: 'success' } });

			// remove
			await userEvent.click(getByTestId('test-execution-toggle'));
			await userEvent.click(queryAllByTestId('test-execution-add-to')[1]);
			expect(executionsStore.annotateExecution).toHaveBeenLastCalledWith(executionWithBothTags.id, {
				tags: [tag1.id],
			});
		});
	});
});
