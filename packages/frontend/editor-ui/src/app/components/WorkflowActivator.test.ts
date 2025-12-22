import { describe, it, expect, vi } from 'vitest';
import WorkflowActivator from '@/app/components/WorkflowActivator.vue';
import userEvent from '@testing-library/user-event';

import { useWorkflowsStore } from '@/app/stores/workflows.store';

import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, WOOCOMMERCE_TRIGGER_NODE_TYPE } from '@/app/constants';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useToast } from '@/app/composables/useToast';
import { createTestWorkflow } from '@/__tests__/mocks';

vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
	}),
	useRoute: () => ({
		query: {},
		params: {},
	}),
	RouterLink: vi.fn(),
}));

const renderComponent = createComponentRenderer(WorkflowActivator);
let mockWorkflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
let mockCredentialsStore: ReturnType<typeof mockedStore<typeof useCredentialsStore>>;

vi.mock('@/app/composables/useToast', () => {
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
		// Add workflow to workflowsById to mark it as saved
		mockWorkflowsStore.workflowsById = {
			'1': createTestWorkflow({ id: '1', name: 'Test Workflow' }),
		};

		const renderOptions = {
			props: {
				isArchived: false,
				workflowActive: false,
				workflowId: '1',
				workflowPermissions: { publish: true },
			},
		};

		const { getByTestId, getByRole } = renderComponent(renderOptions);
		expect(getByTestId('workflow-activator-status')).toBeInTheDocument();
		expect(getByRole('switch')).toBeInTheDocument();
		expect(getByRole('switch')).not.toBeDisabled();
	});

	it('display an inactive tooltip when there are no nodes available', async () => {
		mockWorkflowsStore.workflowId = '1';
		mockWorkflowsStore.workflowsById = {
			'1': createTestWorkflow({ id: '1', name: 'Test Workflow' }),
		};

		const { getByTestId, getByRole } = renderComponent({
			props: {
				isArchived: false,
				workflowActive: false,
				workflowId: '1',
				workflowPermissions: { publish: true },
			},
		});

		await userEvent.hover(getByRole('switch'));
		expect(getByRole('tooltip')).toBeInTheDocument();

		expect(getByRole('tooltip')).toHaveTextContent(
			'This workflow has no trigger nodes that require activation',
		);
		expect(getByTestId('workflow-activator-status')).toHaveTextContent('Inactive');
	});

	it('should allow activation when only execute workflow trigger is available', async () => {
		mockWorkflowsStore.workflowId = '1';
		mockWorkflowsStore.workflowsById = {
			'1': createTestWorkflow({ id: '1', name: 'Test Workflow' }),
		};
		mockWorkflowsStore.workflowTriggerNodes = [
			{ type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, disabled: false } as never,
		];

		const { getByTestId, getByRole } = renderComponent({
			props: {
				isArchived: false,
				workflowActive: false,
				workflowId: '1',
				workflowPermissions: { publish: true },
			},
		});

		const switchElement = getByRole('switch');

		expect(switchElement).not.toBeDisabled();
		expect(getByTestId('workflow-activator-status')).toHaveTextContent('Inactive');
	});

	it('Should show warning toast if the workflow to be activated has non-disabled node using free OpenAI credentials', async () => {
		const toast = useToast();

		mockWorkflowsStore.workflowsById = {
			'1': createTestWorkflow({ id: '1', name: 'Test Workflow' }),
		};
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
				workflowPermissions: { publish: true },
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

		mockWorkflowsStore.workflowsById = {
			'1': createTestWorkflow({ id: '1', name: 'Test Workflow' }),
		};
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
				workflowPermissions: { publish: true },
			},
		});

		await rerender({ workflowActive: true });

		expect(toast.showMessage).not.toHaveBeenCalled();
	});

	it('Should not show warning toast if the workflow to be activated has no node with free OpenAI credential', async () => {
		const toast = useToast();

		mockWorkflowsStore.workflowsById = {
			'1': createTestWorkflow({ id: '1', name: 'Test Workflow' }),
		};
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
				workflowPermissions: { publish: true },
			},
		});

		await rerender({ workflowActive: true });

		expect(toast.showMessage).not.toHaveBeenCalled();
	});

	it('Should be disabled on archived workflow', async () => {
		mockWorkflowsStore.workflowsById = {
			'1': createTestWorkflow({ id: '1', name: 'Test Workflow' }),
		};

		const renderOptions = {
			props: {
				isArchived: true,
				workflowActive: false,
				workflowId: '1',
				workflowPermissions: { publish: true },
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
