import { describe, it, expect, vi } from 'vitest';
import WorkflowActivator from '@/components/WorkflowActivator.vue';
import userEvent from '@testing-library/user-event';

import { useWorkflowsStore } from '@/stores/workflows.store';

import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, WOOCOMMERCE_TRIGGER_NODE_TYPE } from '@/constants';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useToast } from '@/composables/useToast';

const renderComponent = createComponentRenderer(WorkflowActivator);
let mockWorkflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
let mockCredentialsStore: ReturnType<typeof mockedStore<typeof useCredentialsStore>>;

vi.mock('@/composables/useToast', () => {
	const showMessage = vi.fn();
	return {
		useToast: () => {
			return {
				showMessage,
			};
		},
	};
});

describe('WorkflowActivator', () => {
	beforeEach(() => {
		createTestingPinia();

		mockWorkflowsStore = mockedStore(useWorkflowsStore);
		mockCredentialsStore = mockedStore(useCredentialsStore);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders correctly', () => {
		const renderOptions = {
			props: {
				isArchived: false,
				workflowActive: false,
				workflowId: '1',
				workflowPermissions: { update: true },
			},
		};

		const { getByTestId, getByRole } = renderComponent(renderOptions);
		expect(getByTestId('workflow-activator-status')).toBeInTheDocument();
		expect(getByRole('switch')).toBeInTheDocument();
		expect(getByRole('switch')).not.toBeDisabled();
	});

	it('display an inactive tooltip when there are no nodes available', async () => {
		mockWorkflowsStore.workflowId = '1';

		const { getByTestId, getByRole } = renderComponent({
			props: {
				isArchived: false,
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
				isArchived: false,
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

	it('Should show warning toast if the workflow to be activated has non-disabled node using free OpenAI credentials', async () => {
		const toast = useToast();

		mockWorkflowsStore.usedCredentials = {
			'1': {
				id: '1',
				name: '',
				credentialType: '',
				currentUserHasAccess: false,
			},
		};

		mockCredentialsStore.state.credentials = {
			'1': {
				id: '1',
				name: 'OpenAI',
				type: 'openAiApi',
				data: '',
				isManaged: true,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		};

		mockWorkflowsStore.workflowTriggerNodes = [
			{ type: WOOCOMMERCE_TRIGGER_NODE_TYPE, disabled: false } as never,
		];

		mockWorkflowsStore.allNodes = [
			{
				credentials: {
					openAiApi: {
						name: 'OpenAI',
						id: '1',
					},
				},
				disabled: false,
				position: [1, 1],
				name: '',
				id: '',
				typeVersion: 0,
				type: '',
				parameters: {},
			},
		];

		const { rerender } = renderComponent({
			props: {
				isArchived: false,
				workflowActive: false,
				workflowId: '1',
				workflowPermissions: { update: true },
			},
		});

		await rerender({ workflowActive: true });

		expect(toast.showMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "You're using free OpenAI API credits",
				message:
					'To make sure your workflow runs smoothly in the future, replace the free OpenAI API credits with your own API key.',
				type: 'warning',
				duration: 0,
			}),
		);
	});

	it('Should not show warning toast if the workflow to be activated has disabled node using free OpenAI credentials', async () => {
		const toast = useToast();

		mockWorkflowsStore.usedCredentials = {
			'1': {
				id: '1',
				name: '',
				credentialType: '',
				currentUserHasAccess: false,
			},
		};

		mockCredentialsStore.state.credentials = {
			'1': {
				id: '1',
				name: 'OpenAI',
				type: 'openAiApi',
				data: '',
				isManaged: true,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		};

		mockWorkflowsStore.workflowTriggerNodes = [
			{ type: WOOCOMMERCE_TRIGGER_NODE_TYPE, disabled: false } as never,
		];

		mockWorkflowsStore.allNodes = [
			{
				credentials: {
					openAiApi: {
						name: 'OpenAI',
						id: '1',
					},
				},
				disabled: true,
				position: [1, 1],
				name: '',
				id: '',
				typeVersion: 0,
				type: '',
				parameters: {},
			},
		];

		const { rerender } = renderComponent({
			props: {
				isArchived: false,
				workflowActive: false,
				workflowId: '1',
				workflowPermissions: { update: true },
			},
		});

		await rerender({ workflowActive: true });

		expect(toast.showMessage).not.toHaveBeenCalled();
	});

	it('Should not show warning toast if the workflow to be activated has no node with free OpenAI credential', async () => {
		const toast = useToast();

		mockWorkflowsStore.usedCredentials = {
			'1': {
				id: '1',
				name: '',
				credentialType: '',
				currentUserHasAccess: false,
			},
		};

		mockCredentialsStore.state.credentials = {
			'1': {
				id: '1',
				name: 'Jira',
				type: 'jiraApi',
				data: '',
				isManaged: true,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		};

		mockWorkflowsStore.workflowTriggerNodes = [
			{ type: WOOCOMMERCE_TRIGGER_NODE_TYPE, disabled: false } as never,
		];

		const { rerender } = renderComponent({
			props: {
				isArchived: false,
				workflowActive: false,
				workflowId: '1',
				workflowPermissions: { update: true },
			},
		});

		await rerender({ workflowActive: true });

		expect(toast.showMessage).not.toHaveBeenCalled();
	});

	it('Should be disabled on archived workflow', async () => {
		const renderOptions = {
			props: {
				isArchived: true,
				workflowActive: false,
				workflowId: '1',
				workflowPermissions: { update: true },
			},
		};

		const { getByTestId, getByRole } = renderComponent(renderOptions);
		expect(getByTestId('workflow-activator-status')).toBeInTheDocument();
		expect(getByRole('switch')).toBeInTheDocument();
		expect(getByRole('switch')).toBeDisabled();

		await userEvent.hover(getByRole('switch'));
		expect(getByRole('tooltip')).toBeInTheDocument();
		expect(getByRole('tooltip')).toHaveTextContent(
			'This workflow is archived so it cannot be activated',
		);
		expect(getByTestId('workflow-activator-status')).toHaveTextContent('Inactive');
	});
});
