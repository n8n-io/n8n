import { createComponentRenderer } from '@/__tests__/render';
import SetupWorkflowCredentialsButton from '@/components/SetupWorkflowCredentialsButton/SetupWorkflowCredentialsButton.vue';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/stores/workflows.store';

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

const renderComponent = createComponentRenderer(SetupWorkflowCredentialsButton);

const EMPTY_WORKFLOW = {
	id: '__EMPTY__',
	createdAt: -1,
	updatedAt: -1,
	versionId: '1',
	name: 'Email Summary Agent ',
	active: false,
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
});
