import { createComponentRenderer } from '@/__tests__/render';
import SetupWorkflowCredentialsButton from './SetupWorkflowCredentialsButton.vue';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { TEMPLATE_SETUP_EXPERIENCE, SETUP_CREDENTIALS_MODAL_KEY } from '@/app/constants';
import { doesNodeHaveAllCredentialsFilled } from '@/app/utils/nodes/nodeTransforms';

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

vi.mock('@/app/utils/nodes/nodeTransforms', () => ({
	doesNodeHaveAllCredentialsFilled: vi.fn(),
}));

let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;

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
		createTestingPinia();
		workflowsStore = mockedStore(useWorkflowsStore);
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

	it('does not auto-open modal when skipCredentialAutoOpen is set in workflow meta', () => {
		const uiStore = mockedStore(useUIStore);
		const posthogStore = mockedStore(usePostHog);

		// Enable the A/B test so modal would normally auto-open
		posthogStore.getVariant.mockReturnValue(TEMPLATE_SETUP_EXPERIENCE.variant);

		// Mock that nodes have unfilled credentials (so showButton would be true)
		vi.mocked(doesNodeHaveAllCredentialsFilled).mockReturnValue(false);

		// Create a properly typed mock node
		const mockNode = {
			id: 'node1',
			type: 'test',
			name: 'Test Node',
			position: [0, 0] as [number, number],
			typeVersion: 1,
			parameters: {},
		};

		// Workflow with nodes and skipCredentialAutoOpen flag
		const workflowWithSkipFlag = {
			...EMPTY_WORKFLOW,
			meta: { templateId: '2722', skipCredentialAutoOpen: true },
			nodes: [mockNode],
		};
		workflowsStore.workflow = workflowWithSkipFlag;
		workflowsStore.getNodes.mockReturnValue([mockNode]);

		renderComponent();

		// Modal should NOT have been opened due to skipCredentialAutoOpen flag
		expect(uiStore.openModal).not.toHaveBeenCalledWith(SETUP_CREDENTIALS_MODAL_KEY);
	});
});
