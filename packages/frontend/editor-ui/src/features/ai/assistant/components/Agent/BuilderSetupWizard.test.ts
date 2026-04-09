import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';
import { fireEvent } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestNode } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import type { INodeUi } from '@/Interface';
import BuilderSetupWizard from './BuilderSetupWizard.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useBuilderStore } from '../../builder.store';

const mockCards = ref<Array<{ state: Record<string, unknown> }>>([]);
const mockCurrentCard = ref<{ state: Record<string, unknown> } | undefined>(undefined);
const mockIsAllComplete = ref(false);
const mockTotalCards = ref(0);
const mockCurrentStepIndex = ref(0);

const mockOnStepExecuted = vi.fn();
const mockIsInitialCredentialTestingDone = ref(true);

vi.mock('@/features/ai/assistant/composables/useBuilderSetupCards', () => ({
	useBuilderSetupCards: () => ({
		cards: mockCards,
		currentStepIndex: mockCurrentStepIndex,
		currentCard: mockCurrentCard,
		isAllComplete: mockIsAllComplete,
		isInitialCredentialTestingDone: mockIsInitialCredentialTestingDone,
		totalCards: mockTotalCards,
		firstTriggerName: ref(null),
		setCredential: vi.fn(),
		unsetCredential: vi.fn(),
		goToNext: vi.fn(),
		goToPrev: vi.fn(),
		goToStep: vi.fn(),
		continueCurrent: vi.fn(),
		onStepExecuted: mockOnStepExecuted,
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

const triggerNode = createTestNode({
	id: '1',
	name: 'Trigger',
	type: 'n8n-nodes-base.manualTrigger',
}) as INodeUi;

const renderComponent = createComponentRenderer(BuilderSetupWizard);

describe('BuilderSetupWizard', () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let builderStore: ReturnType<typeof mockedStore<typeof useBuilderStore>>;
	let pinia: ReturnType<typeof createTestingPinia>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockCards.value = [];
		mockCurrentCard.value = undefined;
		mockIsAllComplete.value = false;
		mockTotalCards.value = 0;
		mockCurrentStepIndex.value = 0;
		mockIsInitialCredentialTestingDone.value = true;

		pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);

		workflowsStore = mockedStore(useWorkflowsStore);
		builderStore = mockedStore(useBuilderStore);

		workflowsStore.workflow.nodes = [triggerNode];
		workflowsStore.workflow.connections = {} as never;
		Object.defineProperty(builderStore, 'hasTodosHiddenByPinnedData', { get: () => false });
		Object.defineProperty(builderStore, 'wizardHasExecutedWorkflow', {
			value: false,
			writable: true,
			configurable: true,
		});
		builderStore.trackWorkflowBuilderJourney = vi.fn();
		builderStore.getAiBuilderMadeEdits = vi.fn().mockReturnValue(true);
	});

	function render() {
		return renderComponent({ pinia });
	}

	function setCurrentCard(overrides: { isComplete?: boolean } = {}) {
		mockCurrentCard.value = {
			state: {
				node: triggerNode,
				parameterIssues: {},
				isTrigger: true,
				isComplete: overrides.isComplete ?? false,
			},
		};
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
		setCurrentCard();
		mockTotalCards.value = 1;

		const { getByTestId } = render();
		expect(getByTestId('builder-setup-card')).toBeInTheDocument();
	});

	it('does not show setup card when no current card', () => {
		mockCurrentCard.value = undefined;

		const { queryByTestId } = render();
		expect(queryByTestId('builder-setup-card')).not.toBeInTheDocument();
	});

	it('tracks setup_wizard_shown when card becomes visible', () => {
		setCurrentCard();
		mockTotalCards.value = 1;

		render();
		expect(builderStore.trackWorkflowBuilderJourney).toHaveBeenCalledWith(
			'setup_wizard_shown',
			expect.objectContaining({ total: 1 }),
		);
	});

	it('shows card when all complete but workflow not executed yet', () => {
		setCurrentCard({ isComplete: true });
		mockTotalCards.value = 1;
		mockIsAllComplete.value = true;
		builderStore.wizardHasExecutedWorkflow = false;

		const { getByTestId } = render();
		expect(getByTestId('builder-setup-card')).toBeInTheDocument();
	});

	it('hides card when all complete and workflow has been executed', () => {
		setCurrentCard({ isComplete: true });
		mockTotalCards.value = 1;
		mockIsAllComplete.value = true;
		builderStore.wizardHasExecutedWorkflow = true;

		const { queryByTestId } = render();
		expect(queryByTestId('builder-setup-card')).not.toBeInTheDocument();
	});

	it('dismisses wizard when last step is executed successfully', async () => {
		setCurrentCard({ isComplete: true });
		mockTotalCards.value = 1;
		mockCurrentStepIndex.value = 0;
		mockIsAllComplete.value = true;

		// The composable's onStepExecuted sets this flag for the last card
		mockOnStepExecuted.mockImplementation(() => {
			builderStore.wizardHasExecutedWorkflow = true;
		});

		const { getByTestId, queryByTestId } = render();
		expect(getByTestId('builder-setup-wizard')).toBeInTheDocument();

		// Click the mock card to trigger stepExecuted
		await fireEvent.click(getByTestId('builder-setup-card'));

		expect(queryByTestId('builder-setup-wizard')).not.toBeInTheDocument();
	});

	it('emits noSetupNeeded when there are no cards and builder has finished updating', () => {
		mockTotalCards.value = 0;
		builderStore.setBuilderMadeEdits(true);

		const { emitted } = render();
		expect(emitted().noSetupNeeded).toHaveLength(1);
	});

	it('does not emit noSetupNeeded while workflow updates are still being applied', () => {
		mockTotalCards.value = 0;
		builderStore.getAiBuilderMadeEdits = vi.fn().mockReturnValue(false);

		const { emitted } = render();
		expect(emitted().noSetupNeeded).toBeUndefined();
	});

	it('emits noSetupNeeded when all cards are already complete on load', () => {
		setCurrentCard({ isComplete: true });
		mockTotalCards.value = 1;
		mockIsAllComplete.value = true;
		builderStore.wizardHasExecutedWorkflow = true;

		const { emitted } = render();
		expect(emitted().noSetupNeeded).toHaveLength(1);
	});

	it('does not emit noSetupNeeded when there are incomplete cards', () => {
		mockTotalCards.value = 2;
		setCurrentCard();

		const { emitted } = render();
		expect(emitted().noSetupNeeded).toBeUndefined();
	});

	it('does not dismiss wizard when a non-last step is executed', async () => {
		setCurrentCard({ isComplete: true });
		mockTotalCards.value = 3;
		mockCurrentStepIndex.value = 0;

		const { getByTestId } = render();

		// Click the mock card to trigger stepExecuted
		await fireEvent.click(getByTestId('builder-setup-card'));

		expect(getByTestId('builder-setup-wizard')).toBeInTheDocument();
	});
});
