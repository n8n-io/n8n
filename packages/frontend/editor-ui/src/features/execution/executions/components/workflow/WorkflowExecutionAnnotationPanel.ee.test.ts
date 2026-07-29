import { describe, expect, it, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { createRouter, createWebHistory } from 'vue-router';
import type { ExecutionSummary } from 'n8n-workflow';
import WorkflowExecutionAnnotationPanel from '@/components/executions/workflow/WorkflowExecutionAnnotationPanel.ee.vue';
import { VIEWS } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useProjectsStore } from '@/stores/projects.store';
import type { IWorkflowDb } from '@/Interface';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { createTestProject } from '@/__tests__/data/projects';
import { ProjectTypes } from '@/types/projects.types';

const workflowId = faker.string.uuid();

const routes = [
	{ path: '/', name: 'home', component: { template: '<div></div>' } },
	{
		path: `/workflow/${workflowId}`,
		name: VIEWS.WORKFLOW,
		component: { template: '<div></div>' },
	},
];

const router = createRouter({
	history: createWebHistory(),
	routes,
});

router.push(`/workflow/${workflowId}`);

const executionData: ExecutionSummary = {
	id: faker.string.uuid(),
	finished: true,
	mode: 'manual',
	createdAt: faker.date.past(),
	startedAt: faker.date.past(),
	stoppedAt: faker.date.past(),
	workflowId,
	workflowName: faker.string.sample(),
	status: 'success',
	nodeExecutionStatus: {},
	retryOf: undefined,
	retrySuccessId: undefined,
};

const renderComponent = createComponentRenderer(WorkflowExecutionAnnotationPanel, {
	global: {
		plugins: [router],
	},
});

describe('WorkflowExecutionAnnotationPanel.ee.vue', () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;

	beforeEach(() => {
		createTestingPinia();
		workflowsStore = mockedStore(useWorkflowsStore);
		projectsStore = mockedStore(useProjectsStore);

		workflowsStore.getWorkflowById.mockReturnValue({
			scopes: [],
		} as IWorkflowDb);

		projectsStore.currentProject = undefined;
		projectsStore.personalProject = createTestProject({ scopes: [] });
	});

	it('should enable button when user has workflow-level update permission', () => {
		workflowsStore.getWorkflowById.mockReturnValue({
			scopes: ['workflow:update'],
		} as IWorkflowDb);

		const { getByTestId } = renderComponent({
			props: { execution: executionData },
		});

		const button = getByTestId('execution-preview-ellipsis-button');
		expect(button).not.toBeDisabled();
	});

	it('should enable button when user has project-level update permission', () => {
		projectsStore.personalProject = createTestProject({
			scopes: ['workflow:update'],
		});

		const { getByTestId } = renderComponent({
			props: { execution: executionData },
		});

		const button = getByTestId('execution-preview-ellipsis-button');
		expect(button).not.toBeDisabled();
	});

	it('should enable button when user has currentProject update permission', () => {
		projectsStore.currentProject = createTestProject({
			scopes: ['workflow:update'],
			type: ProjectTypes.Team,
		});

		const { getByTestId } = renderComponent({
			props: { execution: executionData },
		});

		const button = getByTestId('execution-preview-ellipsis-button');
		expect(button).not.toBeDisabled();
	});

	it('should disable button when user has no update permission', () => {
		workflowsStore.getWorkflowById.mockReturnValue({
			scopes: [],
		} as IWorkflowDb);

		projectsStore.personalProject = createTestProject({ scopes: [] });

		const { getByTestId } = renderComponent({
			props: { execution: executionData },
		});

		const button = getByTestId('execution-preview-ellipsis-button');
		expect(button).toBeDisabled();
	});

	it('should prefer currentProject over personalProject for permissions', () => {
		projectsStore.currentProject = createTestProject({
			scopes: ['workflow:update'],
			type: ProjectTypes.Team,
		});
		projectsStore.personalProject = createTestProject({ scopes: [] });

		const { getByTestId } = renderComponent({
			props: { execution: executionData },
		});

		const button = getByTestId('execution-preview-ellipsis-button');
		expect(button).not.toBeDisabled();
	});

	it('should fall back to personalProject when currentProject is null', () => {
		projectsStore.currentProject = undefined;
		projectsStore.personalProject = createTestProject({
			scopes: ['workflow:update'],
		});

		const { getByTestId } = renderComponent({
			props: { execution: executionData },
		});

		const button = getByTestId('execution-preview-ellipsis-button');
		expect(button).not.toBeDisabled();
	});

	it('should show badge when custom data exists', () => {
		const executionWithCustomData = {
			...executionData,
			customData: { key1: 'value1', key2: 'value2' },
		};

		const { getByTestId } = renderComponent({
			props: { execution: executionWithCustomData },
		});

		const button = getByTestId('execution-preview-ellipsis-button');
		const badge = button.querySelector('.badge');
		expect(badge).toBeInTheDocument();
		expect(badge?.textContent).toBe('2');
	});

	it('should not show badge when no custom data exists', () => {
		const { getByTestId } = renderComponent({
			props: { execution: executionData },
		});

		const button = getByTestId('execution-preview-ellipsis-button');
		const badge = button.querySelector('.badge');
		expect(badge).not.toBeInTheDocument();
	});
});
