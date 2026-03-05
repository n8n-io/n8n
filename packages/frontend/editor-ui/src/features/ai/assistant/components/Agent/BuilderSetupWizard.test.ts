import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';
import { fireEvent } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import type { INodeUi } from '@/Interface';
import BuilderSetupWizard from './BuilderSetupWizard.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useBuilderStore } from '../../builder.store';

const mockCards = ref<Array<{ state: Record<string, unknown> }>>([]);
const mockCurrentCard = ref<{ state: Record<string, unknown> } | undefined>(undefined);
const mockIsAllComplete = ref(false);
const mockTotalCards = ref(0);
const mockCurrentStepIndex = ref(0);

vi.mock('@/features/ai/assistant/composables/useBuilderSetupCards', () => ({
	useBuilderSetupCards: () => ({
		cards: mockCards,
		currentStepIndex: mockCurrentStepIndex,
		currentCard: mockCurrentCard,
		isAllComplete: mockIsAllComplete,
		totalCards: mockTotalCards,
		firstTriggerName: ref(null),
		setCredential: vi.fn(),
		unsetCredential: vi.fn(),
		goToNext: vi.fn(),
		goToPrev: vi.fn(),
		goToStep: vi.fn(),
		skipCurrent: vi.fn(),
		continueCurrent: vi.fn(),
	}),
}));

vi.mock('./BuilderSetupCard.vue', () => ({
	default: {
		template: '<div data-test-id="builder-setup-card" @click="$emit(\'stepExecuted\')" />',
		props: ['state', 'stepIndex', 'totalCards', 'firstTriggerName'],
		emits: [
			'stepExecuted',
			'goToNext',
			'goToPrev',
			'continueCurrent',
			'credentialSelected',
			'credentialDeselected',
		],
	},
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn() }),
	useRoute: () => ({ params: {} }),
	RouterLink: vi.fn(),
}));

vi.mock('@/app/composables/useRunWorkflow', () => ({
	useRunWorkflow: () => ({
		runWorkflow: vi.fn(),
	}),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showMessage: vi.fn(),
	}),
}));

const triggerNode: INodeUi = {
	id: '1',
	name: 'Trigger',
	type: 'n8n-nodes-base.manualTrigger',
	position: [0, 0],
	parameters: {},
	typeVersion: 1,
} as INodeUi;

const renderComponent = createComponentRenderer(BuilderSetupWizard);

describe('BuilderSetupWizard', () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
	let builderStore: ReturnType<typeof mockedStore<typeof useBuilderStore>>;
	let pinia: ReturnType<typeof createTestingPinia>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockCards.value = [];
		mockCurrentCard.value = undefined;
		mockIsAllComplete.value = false;
		mockTotalCards.value = 0;
		mockCurrentStepIndex.value = 0;

		pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);

		workflowsStore = mockedStore(useWorkflowsStore);
		nodeTypesStore = mockedStore(useNodeTypesStore);
		builderStore = mockedStore(useBuilderStore);

		workflowsStore.workflow.nodes = [triggerNode];
		workflowsStore.workflow.connections = {} as never;
		nodeTypesStore.isTriggerNode = vi
			.fn()
			.mockImplementation((type: string) => type.toLowerCase().includes('trigger'));
		Object.defineProperty(workflowsStore, 'isWorkflowRunning', { get: () => false });
		Object.defineProperty(workflowsStore, 'executionWaitingForWebhook', { get: () => false });
		Object.defineProperty(builderStore, 'hasNoCreditsRemaining', { get: () => false });
		Object.defineProperty(builderStore, 'hasTodosHiddenByPinnedData', { get: () => false });
		Object.defineProperty(builderStore, 'wizardHasExecutedWorkflow', {
			value: false,
			writable: true,
			configurable: true,
		});
		builderStore.trackWorkflowBuilderJourney = vi.fn();
	});

	function render() {
		return renderComponent({ pinia });
	}

	it('renders wizard container', () => {
		const { getByTestId } = render();
		expect(getByTestId('builder-setup-wizard')).toBeInTheDocument();
	});

	it('shows description text', () => {
		const { getByText } = render();
		expect(getByText('aiAssistant.builder.executeMessage.description')).toBeInTheDocument();
	});

	it('shows no-issues text when all complete', () => {
		mockIsAllComplete.value = true;

		const { getByText } = render();
		expect(getByText('aiAssistant.builder.executeMessage.noIssues')).toBeInTheDocument();
	});

	it('shows setup card when currentCard exists', () => {
		mockCurrentCard.value = {
			state: {
				node: triggerNode,
				parameterIssues: {},
				isTrigger: true,
				isComplete: false,
			},
		};
		mockTotalCards.value = 1;

		const { getByTestId } = render();
		expect(getByTestId('builder-setup-card')).toBeInTheDocument();
	});

	it('does not show setup card when no current card', () => {
		mockCurrentCard.value = undefined;

		const { queryByTestId } = render();
		expect(queryByTestId('builder-setup-card')).not.toBeInTheDocument();
	});

	it('disables execute button when not all complete', () => {
		mockIsAllComplete.value = false;

		const { getAllByTestId } = render();
		const button = getAllByTestId('execute-workflow-button')[0] as HTMLButtonElement;
		expect(button.disabled).toBe(true);
	});

	it('enables execute button when all complete', () => {
		mockIsAllComplete.value = true;

		const { getAllByTestId } = render();
		const button = getAllByTestId('execute-workflow-button')[0] as HTMLButtonElement;
		expect(button.disabled).toBe(false);
	});

	it('tracks setup_wizard_shown on mount', () => {
		render();
		expect(builderStore.trackWorkflowBuilderJourney).toHaveBeenCalledWith(
			'setup_wizard_shown',
			expect.objectContaining({ total: 0 }),
		);
	});

	it('shows card when all complete but workflow not executed yet', () => {
		mockCurrentCard.value = {
			state: {
				node: triggerNode,
				parameterIssues: {},
				isTrigger: true,
				isComplete: true,
			},
		};
		mockTotalCards.value = 1;
		mockIsAllComplete.value = true;
		builderStore.wizardHasExecutedWorkflow = false;

		const { getByTestId } = render();
		expect(getByTestId('builder-setup-card')).toBeInTheDocument();
	});

	it('hides card when all complete and workflow has been executed', () => {
		mockCurrentCard.value = {
			state: {
				node: triggerNode,
				parameterIssues: {},
				isTrigger: true,
				isComplete: true,
			},
		};
		mockTotalCards.value = 1;
		mockIsAllComplete.value = true;
		builderStore.wizardHasExecutedWorkflow = true;

		const { queryByTestId } = render();
		expect(queryByTestId('builder-setup-card')).not.toBeInTheDocument();
	});

	it('dismisses wizard when last step is executed successfully', async () => {
		mockCurrentCard.value = {
			state: {
				node: triggerNode,
				parameterIssues: {},
				isTrigger: true,
				isComplete: true,
			},
		};
		mockTotalCards.value = 1;
		mockCurrentStepIndex.value = 0;

		const { getByTestId, queryByTestId } = render();
		expect(getByTestId('builder-setup-wizard')).toBeInTheDocument();

		// Click the mock card to trigger stepExecuted
		await fireEvent.click(getByTestId('builder-setup-card'));

		expect(queryByTestId('builder-setup-wizard')).not.toBeInTheDocument();
	});

	it('does not dismiss wizard when a non-last step is executed', async () => {
		mockCurrentCard.value = {
			state: {
				node: triggerNode,
				parameterIssues: {},
				isTrigger: true,
				isComplete: true,
			},
		};
		mockTotalCards.value = 3;
		mockCurrentStepIndex.value = 0;

		const { getByTestId } = render();

		// Click the mock card to trigger stepExecuted
		await fireEvent.click(getByTestId('builder-setup-card'));

		expect(getByTestId('builder-setup-wizard')).toBeInTheDocument();
	});
});
