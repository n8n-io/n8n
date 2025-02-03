import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import TestDefinitionRootView from '../TestDefinitionRootView.vue';
import { useRouter } from 'vue-router';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { mockedStore } from '@/__tests__/utils';
import type { IWorkflowDb } from '@/Interface';
import * as workflowsApi from '@/api/workflows';

vi.mock('vue-router');
vi.mock('@/api/workflows');

describe('TestDefinitionRootView', () => {
	const renderComponent = createComponentRenderer(TestDefinitionRootView);

	const mockWorkflow: IWorkflowDb = {
		id: 'different-id',
		name: 'Test Workflow',
		active: false,
		createdAt: Date.now(),
		updatedAt: Date.now(),
		nodes: [],
		connections: {},
		settings: {
			executionOrder: 'v1',
		},
		tags: [],
		pinData: {},
		versionId: '',
		usedCredentials: [],
	};

	beforeEach(() => {
		setActivePinia(createPinia());

		vi.mocked(useRouter).mockReturnValue({
			currentRoute: {
				value: {
					params: {
						name: 'workflow123',
					},
				},
			},
		} as unknown as ReturnType<typeof useRouter>);

		vi.mocked(workflowsApi.getWorkflow).mockResolvedValue({
			...mockWorkflow,
			id: 'workflow123',
		});
	});

	it('should initialize workflow on mount if not already initialized', async () => {
		const pinia = createTestingPinia();
		const workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.workflow = mockWorkflow;

		const newWorkflow = {
			...mockWorkflow,
			id: 'workflow123',
		};
		workflowsStore.fetchWorkflow.mockResolvedValue(newWorkflow);

		renderComponent({ pinia });

		expect(workflowsStore.fetchWorkflow).toHaveBeenCalledWith('workflow123');
	});

	it('should not initialize workflow if already loaded', async () => {
		const pinia = createTestingPinia();
		const workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.workflow = {
			...mockWorkflow,
			id: 'workflow123',
		};

		renderComponent({ pinia });

		expect(workflowsStore.fetchWorkflow).not.toHaveBeenCalled();
	});

	it('should render router view', () => {
		const { container } = renderComponent();
		expect(container.querySelector('router-view')).toBeTruthy();
	});
});
