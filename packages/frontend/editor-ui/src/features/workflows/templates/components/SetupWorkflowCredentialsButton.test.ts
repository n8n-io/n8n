import { createComponentRenderer } from '@/__tests__/render';
import SetupWorkflowCredentialsButton from './SetupWorkflowCredentialsButton.vue';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useReadyToRunStore } from '@/features/workflows/readyToRun/stores/readyToRun.store';
import { SETUP_CREDENTIALS_MODAL_KEY, TEMPLATE_SETUP_EXPERIENCE } from '@/app/constants';

const mockDoesNodeHaveAllCredentialsFilled = vi.fn();

vi.mock('@/app/utils/nodes/nodeTransforms', async () => {
	const actual = await vi.importActual('@/app/utils/nodes/nodeTransforms');
	return {
		...actual,
		doesNodeHaveAllCredentialsFilled: (...args: unknown[]) =>
			mockDoesNodeHaveAllCredentialsFilled(...args),
	};
});

const mockRouteQuery = vi.fn<() => Record<string, string | undefined>>(() => ({}));

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
			get query() {
				return mockRouteQuery();
			},
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

	describe('modal auto-open on mount', () => {
		const workflowWithUnfilledCredentials = {
			...EMPTY_WORKFLOW,
			meta: { templateId: '123', templateCredsSetupCompleted: false },
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

		it('opens modal when all conditions are met', () => {
			workflowsStore.workflow = workflowWithUnfilledCredentials;
			workflowsStore.getNodes.mockReturnValue(workflowWithUnfilledCredentials.nodes as never);
			mockDoesNodeHaveAllCredentialsFilled.mockReturnValue(false);
			mockGetVariant.mockReturnValue(TEMPLATE_SETUP_EXPERIENCE.variant);
			readyToRunStore.isReadyToRunTemplateId.mockReturnValue(false);
			mockRouteQuery.mockReturnValue({ templateId: '123' });

			renderComponent();

			expect(uiStore.openModal).toHaveBeenCalledWith(SETUP_CREDENTIALS_MODAL_KEY);
		});

		it('does not open modal when not on template import route (no templateId in query)', () => {
			workflowsStore.workflow = workflowWithUnfilledCredentials;
			workflowsStore.getNodes.mockReturnValue(workflowWithUnfilledCredentials.nodes as never);
			mockDoesNodeHaveAllCredentialsFilled.mockReturnValue(false);
			mockGetVariant.mockReturnValue(TEMPLATE_SETUP_EXPERIENCE.variant);
			readyToRunStore.isReadyToRunTemplateId.mockReturnValue(false);
			mockRouteQuery.mockReturnValue({});

			renderComponent();

			expect(uiStore.openModal).not.toHaveBeenCalled();
		});

		it('does not open modal when feature flag is disabled', () => {
			workflowsStore.workflow = workflowWithUnfilledCredentials;
			workflowsStore.getNodes.mockReturnValue(workflowWithUnfilledCredentials.nodes as never);
			mockDoesNodeHaveAllCredentialsFilled.mockReturnValue(false);
			mockGetVariant.mockReturnValue('control');
			readyToRunStore.isReadyToRunTemplateId.mockReturnValue(false);
			mockRouteQuery.mockReturnValue({ templateId: '123' });

			renderComponent();

			expect(uiStore.openModal).not.toHaveBeenCalled();
		});

		it('does not open modal when template credentials setup is already completed', () => {
			const completedWorkflow = {
				...workflowWithUnfilledCredentials,
				meta: { templateId: '123', templateCredsSetupCompleted: true },
			};
			workflowsStore.workflow = completedWorkflow;
			workflowsStore.getNodes.mockReturnValue(completedWorkflow.nodes as never);
			mockDoesNodeHaveAllCredentialsFilled.mockReturnValue(false);
			mockGetVariant.mockReturnValue(TEMPLATE_SETUP_EXPERIENCE.variant);
			readyToRunStore.isReadyToRunTemplateId.mockReturnValue(false);
			mockRouteQuery.mockReturnValue({ templateId: '123' });

			renderComponent();

			expect(uiStore.openModal).not.toHaveBeenCalled();
		});

		it('does not open modal when workflow is not created from a template', () => {
			const nonTemplateWorkflow = {
				...workflowWithUnfilledCredentials,
				meta: {},
			};
			workflowsStore.workflow = nonTemplateWorkflow;
			workflowsStore.getNodes.mockReturnValue(nonTemplateWorkflow.nodes as never);
			mockDoesNodeHaveAllCredentialsFilled.mockReturnValue(false);
			mockGetVariant.mockReturnValue(TEMPLATE_SETUP_EXPERIENCE.variant);
			readyToRunStore.isReadyToRunTemplateId.mockReturnValue(false);
			mockRouteQuery.mockReturnValue({ templateId: '123' });

			renderComponent();

			expect(uiStore.openModal).not.toHaveBeenCalled();
		});

		it('does not open modal when all credentials are already filled', () => {
			workflowsStore.workflow = workflowWithUnfilledCredentials;
			workflowsStore.getNodes.mockReturnValue(workflowWithUnfilledCredentials.nodes as never);
			mockDoesNodeHaveAllCredentialsFilled.mockReturnValue(true);
			mockGetVariant.mockReturnValue(TEMPLATE_SETUP_EXPERIENCE.variant);
			readyToRunStore.isReadyToRunTemplateId.mockReturnValue(false);
			mockRouteQuery.mockReturnValue({ templateId: '123' });

			renderComponent();

			expect(uiStore.openModal).not.toHaveBeenCalled();
		});

		it('does not open modal for ready-to-run workflows', () => {
			workflowsStore.workflow = workflowWithUnfilledCredentials;
			workflowsStore.getNodes.mockReturnValue(workflowWithUnfilledCredentials.nodes as never);
			mockDoesNodeHaveAllCredentialsFilled.mockReturnValue(false);
			mockGetVariant.mockReturnValue(TEMPLATE_SETUP_EXPERIENCE.variant);
			readyToRunStore.isReadyToRunTemplateId.mockReturnValue(true);
			mockRouteQuery.mockReturnValue({ templateId: '123' });

			renderComponent();

			expect(uiStore.openModal).not.toHaveBeenCalled();
		});
	});
});
