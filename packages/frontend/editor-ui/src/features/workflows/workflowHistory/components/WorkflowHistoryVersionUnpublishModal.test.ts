import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { createEventBus } from '@n8n/utils/event-bus';
import { VIEWS, WORKFLOW_HISTORY_VERSION_UNPUBLISH } from '@/app/constants';
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

const ModalStub = {
	template: '<div><slot name="header" /><slot name="content" /><slot name="footer" /></div>',
};

const renderModal = (workflowId: string) =>
	createComponentRenderer(WorkflowHistoryVersionUnpublishModal)({
		props: {
			modalName: WORKFLOW_HISTORY_VERSION_UNPUBLISH,
			data: { workflowId, versionName: 'v3', eventBus: createEventBus() },
		},
		pinia: createTestingPinia(),
		global: { stubs: { Modal: ModalStub } },
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
});
