import { describe, it, expect, vi } from 'vitest';
import WorkflowActivator from '@/components/WorkflowActivator.vue';
import userEvent from '@testing-library/user-event';

import { useWorkflowsStore } from '@/stores/workflows.store';

import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE } from '@/constants';

const renderComponent = createComponentRenderer(WorkflowActivator);
let mockWorkflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;

describe('WorkflowActivator', () => {
	beforeEach(() => {
		createTestingPinia();

		mockWorkflowsStore = mockedStore(useWorkflowsStore);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders correctly', () => {
		const renderOptions = {
			props: {
				workflowActive: false,
				workflowId: '1',
				workflowPermissions: { update: true },
			},
		};

		const { getByTestId, getByRole } = renderComponent(renderOptions);
		expect(getByTestId('workflow-activator-status')).toBeInTheDocument();
		expect(getByRole('switch')).toBeInTheDocument();
	});

	it('display an inactive tooltip when there are no nodes available', async () => {
		mockWorkflowsStore.workflowId = '1';

		const { getByTestId, getByRole } = renderComponent({
			props: {
				workflowActive: false,
				workflowId: '1',
				workflowPermissions: { update: true },
			},
		});

		await userEvent.hover(getByRole('switch'));
		expect(getByRole('tooltip')).toBeInTheDocument();

		expect(getByRole('tooltip')).toHaveTextContent(
			'This workflow has no trigger nodes that require activation',
		);
		expect(getByTestId('workflow-activator-status')).toHaveTextContent('Inactive');
	});

	it('display an inactive tooltip when only execute workflow trigger is available', async () => {
		mockWorkflowsStore.workflowId = '1';
		mockWorkflowsStore.workflowTriggerNodes = [
			{ type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, disabled: false } as never,
		];

		const { getByTestId, getByRole } = renderComponent({
			props: {
				workflowActive: false,
				workflowId: '1',
				workflowPermissions: { update: true },
			},
		});

		await userEvent.hover(getByRole('switch'));
		expect(getByRole('tooltip')).toBeInTheDocument();

		expect(getByRole('tooltip')).toHaveTextContent(
			"Execute Workflow Trigger' doesn't require activation as it is triggered by another workflow",
		);
		expect(getByTestId('workflow-activator-status')).toHaveTextContent('Inactive');
	});
});
