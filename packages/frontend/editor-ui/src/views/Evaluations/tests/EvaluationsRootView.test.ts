import { describe, it, expect, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import TestDefinitionRootView from '../EvaluationsRootVIew.vue';

import { useWorkflowsStore } from '@/stores/workflows.store';
import { mockedStore } from '@/__tests__/utils';
import type { IWorkflowDb } from '@/Interface';

import { waitFor } from '@testing-library/vue';

describe('TestDefinitionRootView', () => {
	const renderComponent = createComponentRenderer(TestDefinitionRootView);

	const mockWorkflow: IWorkflowDb = {
		id: 'different-id',
		name: 'Test Workflow',
		active: false,
		isArchived: false,
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
		createTestingPinia();
	});

	it('should initialize workflow on mount if not already initialized', async () => {
		const workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.workflow = mockWorkflow;
		const newWorkflowId = 'workflow123';

		renderComponent({ props: { name: newWorkflowId } });

		expect(workflowsStore.fetchWorkflow).toHaveBeenCalledWith(newWorkflowId);
	});

	it('should not initialize workflow if already loaded', async () => {
		const workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.workflow = mockWorkflow;

		renderComponent({ props: { name: mockWorkflow.id } });

		expect(workflowsStore.fetchWorkflow).not.toHaveBeenCalled();
	});

	it('should render router view', async () => {
		const workflowsStore = mockedStore(useWorkflowsStore);
		workflowsStore.fetchWorkflow.mockResolvedValue(mockWorkflow);
		const { container } = renderComponent({ props: { name: mockWorkflow.id } });

		await waitFor(() => expect(container.querySelector('router-view')).toBeTruthy());
	});
});
