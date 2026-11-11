import { flushPromises } from '@vue/test-utils';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { createEventBus } from '@n8n/utils/event-bus';
import { VIEWS, WORKFLOW_HISTORY_VERSION_UNPUBLISH } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { AGENT_BUILDER_VIEW } from '@/features/agents/constants';
import * as workflowDependenciesApi from '@/app/api/workflow-dependencies';
import WorkflowHistoryVersionUnpublishModal from './WorkflowHistoryVersionUnpublishModal.vue';

vi.mock('@/app/api/workflow-dependencies');

vi.mock('vue-router', () => ({
	useRouter: () => ({
		resolve: ({ name, params }: { name: string; params: Record<string, string> }) => ({
			href: `/${name}/${Object.values(params).join('/')}`,
		}),
	}),
	useRoute: () => ({}),
	RouterLink: vi.fn(),
}));

const AlertDialogStub = {
	props: ['title', 'description', 'actionLabel', 'cancelLabel'],
	emits: ['update:open', 'action'],
	template: `
		<div role="alertdialog">
			<h2>{{ title }}</h2>
			<p>{{ description }}</p>
			<slot />
			<button data-test-id="unpublish-dialog-dismiss" @click="$emit('update:open', false)" />
			<button data-test-id="unpublish-dialog-action" @click="$emit('action')" />
		</div>
	`,
};

const renderModal = (workflowId: string) =>
	createComponentRenderer(WorkflowHistoryVersionUnpublishModal)({
		props: {
			modalName: WORKFLOW_HISTORY_VERSION_UNPUBLISH,
			data: { workflowId, versionName: 'v3', eventBus: createEventBus() },
		},
		pinia: createTestingPinia(),
		global: { stubs: { AlertDialog: AlertDialogStub } },
	});

const noCounts = {
	agentUsage: 0,
	credentialId: 0,
	dataTableId: 0,
	errorWorkflow: 0,
	errorWorkflowParent: 0,
	workflowCall: 0,
	workflowParent: 0,
};

describe('WorkflowHistoryVersionUnpublishModal', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('lists the dependents that run the published version and counts the ones the user cannot see', async () => {
		vi.mocked(workflowDependenciesApi.getResourceDependencies).mockResolvedValue({
			'wf-1': {
				dependencies: [
					{ type: 'credentialId', id: 'cred-1', name: 'Slack account' },
					{ type: 'workflowCall', id: 'sub-1', name: 'Sub-workflow' },
					{ type: 'workflowParent', id: 'parent-1', name: 'Order intake' },
					{ type: 'errorWorkflowParent', id: 'wf-9', name: 'Billing sync' },
					{ type: 'agentUsage', id: 'agent-1', name: 'Support agent', projectId: 'proj-1' },
				],
				inaccessibleCount: 4,
			},
		});
		vi.mocked(workflowDependenciesApi.getResourceDependencyCounts).mockResolvedValue({
			'wf-1': {
				...noCounts,
				credentialId: 3,
				workflowCall: 1,
				workflowParent: 2,
				errorWorkflowParent: 1,
				agentUsage: 2,
			},
		});

		const { findByTestId, getByText, queryByText } = renderModal('wf-1');
		const affected = await findByTestId('workflow-unpublish-affected-resources');

		expect(getByText('Order intake').closest('a')).toHaveAttribute(
			'href',
			`/${VIEWS.WORKFLOW}/parent-1`,
		);
		expect(getByText('Billing sync')).toBeInTheDocument();
		expect(getByText('Support agent').closest('a')).toHaveAttribute(
			'href',
			`/${AGENT_BUILDER_VIEW}/proj-1/agent-1`,
		);
		// This workflow's own dependencies keep working, so they stay out of the list
		expect(queryByText('Slack account')).not.toBeInTheDocument();
		expect(queryByText('Sub-workflow')).not.toBeInTheDocument();
		// 5 dependents in the counts, 3 visible: the 2 hidden credentials do not count
		expect(affected).toHaveTextContent('+2 not accessible to you');
	});

	it('shows only the generic warning when nothing runs the published version', async () => {
		vi.mocked(workflowDependenciesApi.getResourceDependencies).mockResolvedValue({
			'wf-2': {
				dependencies: [{ type: 'credentialId', id: 'cred-1', name: 'Slack account' }],
				inaccessibleCount: 1,
			},
		});
		vi.mocked(workflowDependenciesApi.getResourceDependencyCounts).mockResolvedValue({
			'wf-2': { ...noCounts, credentialId: 2 },
		});

		const { queryByTestId, getByText } = renderModal('wf-2');
		await waitFor(() =>
			expect(workflowDependenciesApi.getResourceDependencyCounts).toHaveBeenCalled(),
		);

		expect(getByText(/prevent all production executions/)).toBeInTheDocument();
		expect(queryByTestId('workflow-unpublish-affected-resources')).not.toBeInTheDocument();
	});

	it('emits cancel when the dialog closes and unpublish when the action runs', async () => {
		vi.mocked(workflowDependenciesApi.getResourceDependencies).mockResolvedValue({});
		vi.mocked(workflowDependenciesApi.getResourceDependencyCounts).mockResolvedValue({});

		const eventBus = createEventBus();
		const cancel = vi.fn();
		const unpublish = vi.fn();
		eventBus.on('cancel', cancel);
		eventBus.on('unpublish', unpublish);

		const pinia = createTestingPinia({ stubActions: false });
		const uiStore = useUIStore();
		uiStore.modalStateById[WORKFLOW_HISTORY_VERSION_UNPUBLISH] = { open: true };

		const { getByTestId } = createComponentRenderer(WorkflowHistoryVersionUnpublishModal)({
			props: {
				modalName: WORKFLOW_HISTORY_VERSION_UNPUBLISH,
				data: { workflowId: 'wf-1', versionName: 'v3', eventBus },
			},
			pinia,
			global: { stubs: { AlertDialog: AlertDialogStub } },
		});
		await flushPromises();

		await userEvent.click(getByTestId('unpublish-dialog-dismiss'));
		expect(cancel).toHaveBeenCalledTimes(1);
		expect(uiStore.modalsById[WORKFLOW_HISTORY_VERSION_UNPUBLISH]?.open).toBe(false);

		uiStore.modalStateById[WORKFLOW_HISTORY_VERSION_UNPUBLISH] = { open: true };
		await userEvent.click(getByTestId('unpublish-dialog-action'));
		expect(unpublish).toHaveBeenCalledTimes(1);

		await userEvent.click(getByTestId('unpublish-dialog-dismiss'));
		expect(cancel).toHaveBeenCalledTimes(1);
		expect(uiStore.modalsById[WORKFLOW_HISTORY_VERSION_UNPUBLISH]?.open).toBe(true);
	});
});
