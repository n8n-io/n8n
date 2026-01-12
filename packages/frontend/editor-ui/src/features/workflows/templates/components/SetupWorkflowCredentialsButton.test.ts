import { createComponentRenderer } from '@/__tests__/render';
import SetupWorkflowCredentialsButton from './SetupWorkflowCredentialsButton.vue';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useReadyToRunStore } from '@/features/workflows/readyToRun/stores/readyToRun.store';
import { TEMPLATE_SETUP_EXPERIENCE } from '@/app/constants';

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	const params = {};
	const location = {};
	return {
		...actual,
		useRouter: () => ({
			push: vi.fn(),
		}),
		useRoute: () => ({
			params,
			location,
		}),
	};
});

let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;
let readyToRunStore: ReturnType<typeof mockedStore<typeof useReadyToRunStore>>;

const mockGetVariant = vi.fn();

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		getVariant: mockGetVariant,
	}),
}));

const renderComponent = createComponentRenderer(SetupWorkflowCredentialsButton);

const EMPTY_WORKFLOW = {
	id: '__EMPTY__',
	createdAt: -1,
	updatedAt: -1,
	versionId: '1',
	name: 'Email Summary Agent ',
	active: false,
	activeVersionId: null,
	isArchived: false,
	connections: {},
	nodes: [],
	usedCredentials: [],
	meta: { templateId: '2722', templateCredsSetupCompleted: true },
};

describe('SetupWorkflowCredentialsButton', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		workflowsStore = mockedStore(useWorkflowsStore);
		uiStore = mockedStore(useUIStore);
		readyToRunStore = mockedStore(useReadyToRunStore);
	});

	it('renders', () => {
		workflowsStore.workflow = EMPTY_WORKFLOW;
		expect(() => renderComponent()).not.toThrow();
	});

	it('does not render the button if there are no nodes', () => {
		workflowsStore.workflow = EMPTY_WORKFLOW;
		const { queryByTestId } = renderComponent();
		expect(queryByTestId('setup-credentials-button')).toBeNull();
	});

	it('does not auto-open modal for ready-to-run AI workflows even when showButton would be true', () => {
		const readyToRunWorkflow = {
			...EMPTY_WORKFLOW,
			meta: { templateId: 'ready-to-run-ai-workflow', templateCredsSetupCompleted: false },
			nodes: [
				{
					id: '1',
					name: 'OpenAI Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					typeVersion: 1,
					position: [0, 0] as [number, number],
					parameters: {},
				},
			],
		};
		workflowsStore.workflow = readyToRunWorkflow;
		workflowsStore.getNodes.mockReturnValue(readyToRunWorkflow.nodes as never);

		mockGetVariant.mockReturnValue(TEMPLATE_SETUP_EXPERIENCE.variant);

		readyToRunStore.isReadyToRunTemplateId.mockReturnValue(true);

		renderComponent();

		// Modal should NOT be opened for ready-to-run workflows
		expect(uiStore.openModal).not.toHaveBeenCalled();
	});

	it('calls isReadyToRunTemplateId with the correct template ID', () => {
		const templateWorkflow = {
			...EMPTY_WORKFLOW,
			meta: { templateId: 'ready-to-run-ai-workflow-v5', templateCredsSetupCompleted: false },
			nodes: [],
		};
		workflowsStore.workflow = templateWorkflow;
		workflowsStore.getNodes.mockReturnValue([]);

		mockGetVariant.mockReturnValue(TEMPLATE_SETUP_EXPERIENCE.variant);

		renderComponent();

		expect(readyToRunStore.isReadyToRunTemplateId).toHaveBeenCalledWith(
			'ready-to-run-ai-workflow-v5',
		);
	});
});
