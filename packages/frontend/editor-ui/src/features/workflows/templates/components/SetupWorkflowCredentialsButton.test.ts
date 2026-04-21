import { shallowRef } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import { flushPromises } from '@vue/test-utils';
import SetupWorkflowCredentialsButton from './SetupWorkflowCredentialsButton.vue';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useFocusPanelStore } from '@/app/stores/focusPanel.store';
import { useReadyToRunStore } from '@/features/workflows/readyToRun/stores/readyToRun.store';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';
import { SETUP_CREDENTIALS_MODAL_KEY, TEMPLATE_SETUP_EXPERIENCE } from '@/app/constants';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';

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
let focusPanelStore: ReturnType<typeof mockedStore<typeof useFocusPanelStore>>;
let readyToRunStore: ReturnType<typeof mockedStore<typeof useReadyToRunStore>>;
let setupPanelStore: ReturnType<typeof mockedStore<typeof useSetupPanelStore>>;

const mockGetVariant = vi.fn();

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		getVariant: mockGetVariant,
	}),
}));

const workflowDocumentStoreRef = shallowRef<ReturnType<typeof useWorkflowDocumentStore> | null>(
	null,
);

const renderComponent = createComponentRenderer(SetupWorkflowCredentialsButton, {
	global: {
		provide: {
			[WorkflowDocumentStoreKey as symbol]: workflowDocumentStoreRef,
		},
	},
});

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

function setWorkflowDocumentStoreState(meta: Record<string, unknown>, nodes: unknown[] = []) {
	const workflowDocumentStore = useWorkflowDocumentStore(
		createWorkflowDocumentId(workflowsStore.workflowId),
	);
	// Note: createTestingPinia() stubs actions by default, so setMeta()/getNodes() won't work
	Object.defineProperty(workflowDocumentStore, 'meta', { value: meta, configurable: true });
	Object.defineProperty(workflowDocumentStore, 'getNodes', {
		value: () => nodes.map((n) => ({ ...(n as Record<string, unknown>) })),
		configurable: true,
	});
	Object.defineProperty(workflowDocumentStore, 'allNodes', { value: nodes, configurable: true });
	workflowDocumentStoreRef.value = workflowDocumentStore;
}

describe('SetupWorkflowCredentialsButton', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		workflowsStore = mockedStore(useWorkflowsStore);
		uiStore = mockedStore(useUIStore);
		focusPanelStore = mockedStore(useFocusPanelStore);
		readyToRunStore = mockedStore(useReadyToRunStore);
		setupPanelStore = mockedStore(useSetupPanelStore);
	});

	it('renders', () => {
		workflowsStore.workflow = EMPTY_WORKFLOW;
		setWorkflowDocumentStoreState(EMPTY_WORKFLOW.meta, []);
		expect(() => renderComponent()).not.toThrow();
	});

	it('does not render the button if there are no nodes', () => {
		workflowsStore.workflow = EMPTY_WORKFLOW;
		setWorkflowDocumentStoreState(EMPTY_WORKFLOW.meta, []);
		const { queryByTestId } = renderComponent();
		expect(queryByTestId('setup-credentials-button')).toBeNull();
	});

	it('disables button when setup panel feature is enabled and setup sidebar is open', () => {
		const workflowWithNodes = {
			...EMPTY_WORKFLOW,
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
		workflowsStore.workflow = workflowWithNodes;
		setWorkflowDocumentStoreState(workflowWithNodes.meta, workflowWithNodes.nodes);
		setupPanelStore.isFeatureEnabled = true;
		focusPanelStore.focusPanelActive = true;
		focusPanelStore.selectedTab = 'setup';

		const { getByTestId } = renderComponent();
		expect(getByTestId('setup-credentials-button')).toBeDisabled();
	});

	it('does not disable button when setup panel feature is enabled but sidebar is closed', () => {
		const workflowWithNodes = {
			...EMPTY_WORKFLOW,
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
		workflowsStore.workflow = workflowWithNodes;
		setWorkflowDocumentStoreState(workflowWithNodes.meta, workflowWithNodes.nodes);
		setupPanelStore.isFeatureEnabled = true;
		focusPanelStore.focusPanelActive = false;

		const { getByTestId } = renderComponent();
		expect(getByTestId('setup-credentials-button')).not.toBeDisabled();
	});

	it('does not disable button when setup panel feature is disabled even if sidebar is open', () => {
		const workflowWithNodes = {
			...EMPTY_WORKFLOW,
			meta: { templateId: '2722', templateCredsSetupCompleted: false },
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
		workflowsStore.workflow = workflowWithNodes;
		setWorkflowDocumentStoreState(workflowWithNodes.meta, workflowWithNodes.nodes);
		mockDoesNodeHaveAllCredentialsFilled.mockReturnValue(false);
		setupPanelStore.isFeatureEnabled = false;
		focusPanelStore.focusPanelActive = true;
		focusPanelStore.selectedTab = 'setup';

		const { getByTestId } = renderComponent();
		expect(getByTestId('setup-credentials-button')).not.toBeDisabled();
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
		setWorkflowDocumentStoreState(readyToRunWorkflow.meta, readyToRunWorkflow.nodes);

		mockGetVariant.mockReturnValue(TEMPLATE_SETUP_EXPERIENCE.variant);

		readyToRunStore.isReadyToRunTemplateId.mockReturnValue(true);

		renderComponent();

		// Modal should NOT be opened for ready-to-run workflows
		expect(uiStore.openModal).not.toHaveBeenCalled();
	});

	it('calls isReadyToRunTemplateId with the correct template ID', async () => {
		const templateWorkflow = {
			...EMPTY_WORKFLOW,
			meta: { templateId: 'ready-to-run-ai-workflow-v5', templateCredsSetupCompleted: false },
			nodes: [],
		};
		workflowsStore.workflow = templateWorkflow;
		setWorkflowDocumentStoreState(templateWorkflow.meta, []);

		mockGetVariant.mockReturnValue(TEMPLATE_SETUP_EXPERIENCE.variant);
		mockRouteQuery.mockReturnValue({ templateId: 'ready-to-run-ai-workflow-v5' });

		renderComponent();
		await flushPromises();

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

		it('opens modal when all conditions are met and setup panel is disabled', async () => {
			workflowsStore.workflow = workflowWithUnfilledCredentials;
			setWorkflowDocumentStoreState(
				workflowWithUnfilledCredentials.meta,
				workflowWithUnfilledCredentials.nodes,
			);
			mockDoesNodeHaveAllCredentialsFilled.mockReturnValue(false);
			mockGetVariant.mockReturnValue(TEMPLATE_SETUP_EXPERIENCE.variant);
			readyToRunStore.isReadyToRunTemplateId.mockReturnValue(false);
			setupPanelStore.isFeatureEnabled = false;
			mockRouteQuery.mockReturnValue({ templateId: '123' });

			renderComponent();
			await flushPromises();

			expect(uiStore.openModal).toHaveBeenCalledWith(SETUP_CREDENTIALS_MODAL_KEY);
		});

		it('opens setup panel when all conditions are met and setup panel is enabled', async () => {
			workflowsStore.workflow = workflowWithUnfilledCredentials;
			setWorkflowDocumentStoreState(
				workflowWithUnfilledCredentials.meta,
				workflowWithUnfilledCredentials.nodes,
			);
			mockDoesNodeHaveAllCredentialsFilled.mockReturnValue(false);
			mockGetVariant.mockReturnValue(TEMPLATE_SETUP_EXPERIENCE.variant);
			readyToRunStore.isReadyToRunTemplateId.mockReturnValue(false);
			setupPanelStore.isFeatureEnabled = true;
			mockRouteQuery.mockReturnValue({ templateId: '123' });

			renderComponent();
			await flushPromises();

			expect(focusPanelStore.setSelectedTab).toHaveBeenCalledWith('setup');
			expect(focusPanelStore.openFocusPanel).toHaveBeenCalled();
			expect(uiStore.openModal).not.toHaveBeenCalled();
		});

		it('does not open modal when not on template import route (no templateId in query)', () => {
			workflowsStore.workflow = workflowWithUnfilledCredentials;
			setWorkflowDocumentStoreState(
				workflowWithUnfilledCredentials.meta,
				workflowWithUnfilledCredentials.nodes,
			);
			mockDoesNodeHaveAllCredentialsFilled.mockReturnValue(false);
			mockGetVariant.mockReturnValue(TEMPLATE_SETUP_EXPERIENCE.variant);
			readyToRunStore.isReadyToRunTemplateId.mockReturnValue(false);
			mockRouteQuery.mockReturnValue({});

			renderComponent();

			expect(uiStore.openModal).not.toHaveBeenCalled();
		});

		it('does not open modal when feature flag is disabled', () => {
			workflowsStore.workflow = workflowWithUnfilledCredentials;
			setWorkflowDocumentStoreState(
				workflowWithUnfilledCredentials.meta,
				workflowWithUnfilledCredentials.nodes,
			);
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
			setWorkflowDocumentStoreState(completedWorkflow.meta, completedWorkflow.nodes);
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
			setWorkflowDocumentStoreState(nonTemplateWorkflow.meta, nonTemplateWorkflow.nodes);
			mockDoesNodeHaveAllCredentialsFilled.mockReturnValue(false);
			mockGetVariant.mockReturnValue(TEMPLATE_SETUP_EXPERIENCE.variant);
			readyToRunStore.isReadyToRunTemplateId.mockReturnValue(false);
			mockRouteQuery.mockReturnValue({ templateId: '123' });

			renderComponent();

			expect(uiStore.openModal).not.toHaveBeenCalled();
		});

		it('does not open modal when all credentials are already filled', () => {
			workflowsStore.workflow = workflowWithUnfilledCredentials;
			setWorkflowDocumentStoreState(
				workflowWithUnfilledCredentials.meta,
				workflowWithUnfilledCredentials.nodes,
			);
			mockDoesNodeHaveAllCredentialsFilled.mockReturnValue(true);
			mockGetVariant.mockReturnValue(TEMPLATE_SETUP_EXPERIENCE.variant);
			readyToRunStore.isReadyToRunTemplateId.mockReturnValue(false);
			mockRouteQuery.mockReturnValue({ templateId: '123' });

			renderComponent();

			expect(uiStore.openModal).not.toHaveBeenCalled();
		});

		it('does not open modal for ready-to-run workflows', () => {
			workflowsStore.workflow = workflowWithUnfilledCredentials;
			setWorkflowDocumentStoreState(
				workflowWithUnfilledCredentials.meta,
				workflowWithUnfilledCredentials.nodes,
			);
			mockDoesNodeHaveAllCredentialsFilled.mockReturnValue(false);
			mockGetVariant.mockReturnValue(TEMPLATE_SETUP_EXPERIENCE.variant);
			readyToRunStore.isReadyToRunTemplateId.mockReturnValue(true);
			mockRouteQuery.mockReturnValue({ templateId: '123' });

			renderComponent();

			expect(uiStore.openModal).not.toHaveBeenCalled();
		});
	});
});
