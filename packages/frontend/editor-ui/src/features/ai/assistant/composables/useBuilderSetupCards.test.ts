import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nextTick, reactive, ref, effectScope, type EffectScope } from 'vue';
import { createTestNode } from '@/__tests__/mocks';
import type { SetupCardItem, NodeSetupState } from '@/features/setupPanel/setupPanel.types';
import type { INodeUi } from '@/Interface';

const mockSetupCards = ref<SetupCardItem[]>([]);
const mockFirstTriggerName = ref<string | null>(null);
const mockSetCredential = vi.fn();
const mockUnsetCredential = vi.fn();

const mockIsInitialCredentialTestingDone = ref(true);

vi.mock('@/features/setupPanel/composables/useWorkflowSetupState', () => ({
	useWorkflowSetupState: () => ({
		setupCards: mockSetupCards,
		firstTriggerName: mockFirstTriggerName,
		isInitialCredentialTestingDone: mockIsInitialCredentialTestingDone,
		setCredential: mockSetCredential,
		unsetCredential: mockUnsetCredential,
	}),
}));

const mockTrackJourney = vi.fn();

// Reactive object so computed properties in the composable can track changes
const mockBuilderStoreState = reactive({
	wizardCurrentStep: 0,
	wizardHasExecutedWorkflow: false,
	trackWorkflowBuilderJourney: mockTrackJourney,
});
vi.mock('@/features/ai/assistant/builder.store', () => ({
	useBuilderStore: () => mockBuilderStoreState,
}));

const mockUnpinNodeData = vi.fn();
const mockAllNodes = ref<INodeUi[]>([]);
vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({
		workflowId: 'test-workflow-id',
		nodeMetadata: {} as Record<string, { pinnedDataLastRemovedAt?: number }>,
		get allNodes() {
			return mockAllNodes.value;
		},
	}),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: () => ({
		pinData: {},
		unpinNodeData: mockUnpinNodeData,
	}),
	createWorkflowDocumentId: (id: string) => id,
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({
		markStateDirty: vi.fn(),
	}),
}));

const mockUpdateNodeProperties = vi.fn();
vi.mock('@/app/composables/useWorkflowState', () => ({
	injectWorkflowState: () => ({
		updateNodeProperties: mockUpdateNodeProperties,
	}),
}));

vi.mock('@/app/composables/useNodeHelpers', () => ({
	useNodeHelpers: () => ({
		updateNodesParameterIssues: vi.fn(),
	}),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({}),
}));

function createNode(overrides: Partial<INodeUi> = {}): INodeUi {
	return createTestNode({
		name: 'Test Node',
		type: 'n8n-nodes-base.httpRequest',
		...overrides,
	}) as INodeUi;
}

function createCardState(overrides: Partial<NodeSetupState> = {}): NodeSetupState {
	return {
		node: createNode(),
		parameterIssues: {},
		isTrigger: false,
		isComplete: false,
		...overrides,
	};
}

function createCard(stateOverrides: Partial<NodeSetupState> = {}): SetupCardItem {
	return { state: createCardState(stateOverrides) };
}

import { useBuilderSetupCards } from './useBuilderSetupCards';

let currentScope: EffectScope | undefined;

function getComposable() {
	currentScope?.stop();
	currentScope = effectScope();
	return currentScope.run(() => useBuilderSetupCards())!;
}

describe('useBuilderSetupCards', () => {
	beforeEach(() => {
		currentScope?.stop();
		currentScope = undefined;
		vi.clearAllMocks();
		mockSetupCards.value = [];
		mockAllNodes.value = [];
		mockFirstTriggerName.value = null;
		mockBuilderStoreState.wizardCurrentStep = 0;
		mockBuilderStoreState.wizardHasExecutedWorkflow = false;
		mockIsInitialCredentialTestingDone.value = true;
	});

	it('passes through cards from useWorkflowSetupState', () => {
		// Manual trigger filtering is now handled upstream by useWorkflowSetupState
		mockSetupCards.value = [
			createCard({
				node: createNode({ type: 'n8n-nodes-base.httpRequest', name: 'HTTP Request' }),
			}),
		];

		const { cards } = getComposable();
		expect(cards.value).toHaveLength(1);
		expect(cards.value[0].state!.node.name).toBe('HTTP Request');
	});

	it('returns correct navigation state', async () => {
		mockSetupCards.value = [
			createCard({
				node: createNode({ name: 'Node 1', id: 'n1' }),
				credentialType: 'typeA',
				issues: ['Not set'],
			}),
			createCard({
				node: createNode({ name: 'Node 2', id: 'n2' }),
				credentialType: 'typeB',
				issues: ['Not set'],
			}),
			createCard({
				node: createNode({ name: 'Node 3', id: 'n3' }),
				credentialType: 'typeC',
				issues: ['Not set'],
			}),
		];

		const { currentStepIndex, currentCard, totalCards, goToNext, goToPrev, goToStep } =
			getComposable();

		expect(totalCards.value).toBe(3);
		expect(currentStepIndex.value).toBe(0);
		expect(currentCard.value?.state?.node.name).toBe('Node 1');

		goToNext();
		await nextTick();
		expect(currentStepIndex.value).toBe(1);

		goToPrev();
		await nextTick();
		expect(currentStepIndex.value).toBe(0);

		goToStep(2);
		await nextTick();
		expect(currentStepIndex.value).toBe(2);
	});

	it('clamps step index when cards array shrinks', async () => {
		mockSetupCards.value = [
			createCard({ node: createNode({ name: 'Node 1', id: 'n1' }) }),
			createCard({ node: createNode({ name: 'Node 2', id: 'n2' }) }),
			createCard({ node: createNode({ name: 'Node 3', id: 'n3' }) }),
		];

		const { currentStepIndex, goToStep } = getComposable();
		goToStep(2);
		await nextTick();
		expect(currentStepIndex.value).toBe(2);

		mockSetupCards.value = [createCard({ node: createNode({ name: 'Node 1', id: 'n1' }) })];
		await nextTick();

		expect(currentStepIndex.value).toBe(0);
	});

	it('isAllComplete reflects all cards completion status', async () => {
		mockSetupCards.value = [
			createCard({ node: createNode({ name: 'Node 1', id: 'n1' }), isComplete: true }),
			createCard({
				node: createNode({ name: 'Node 2', id: 'n2' }),
				isComplete: false,
				credentialType: 'telegramApi',
				issues: ['Credential not set'],
			}),
		];

		const { isAllComplete } = getComposable();
		expect(isAllComplete.value).toBe(false);

		mockSetupCards.value = [
			createCard({ node: createNode({ name: 'Node 1', id: 'n1' }), isComplete: true }),
			createCard({ node: createNode({ name: 'Node 2', id: 'n2' }), isComplete: true }),
		];
		await nextTick();

		expect(isAllComplete.value).toBe(true);
	});

	it('tracks continue telemetry', () => {
		mockSetupCards.value = [
			createCard({ node: createNode({ name: 'Node 1', id: 'n1' }) }),
			createCard({ node: createNode({ name: 'Node 2', id: 'n2' }) }),
		];

		const { continueCurrent } = getComposable();
		continueCurrent();

		expect(mockTrackJourney).toHaveBeenCalledWith(
			'setup_wizard_step_completed',
			expect.objectContaining({
				step: 1,
				total: 2,
			}),
		);
	});

	it('returns empty cards when no setup cards exist', () => {
		mockSetupCards.value = [];

		const { cards, isAllComplete, totalCards } = getComposable();
		expect(cards.value).toHaveLength(0);
		expect(totalCards.value).toBe(0);
		expect(isAllComplete.value).toBe(true);
	});

	it('passes through setCredential and unsetCredential', () => {
		mockSetupCards.value = [createCard()];

		const { setCredential, unsetCredential } = getComposable();
		setCredential('testType', 'testId', 'testNode');
		unsetCredential('testType', 'testNode');

		expect(mockSetCredential).toHaveBeenCalledWith('testType', 'testId', 'testNode');
		expect(mockUnsetCredential).toHaveBeenCalledWith('testType', 'testNode');
	});

	it('skips to first incomplete card on mount when current card is already complete', () => {
		mockSetupCards.value = [
			createCard({ node: createNode({ name: 'Node 1', id: 'n1' }), isComplete: true }),
			createCard({ node: createNode({ name: 'Node 2', id: 'n2' }), isComplete: true }),
			createCard({ node: createNode({ name: 'Node 3', id: 'n3' }), isComplete: false }),
		];

		const { currentStepIndex } = getComposable();

		// Should skip past completed cards to the first incomplete one
		expect(currentStepIndex.value).toBe(2);
	});

	it('stays on step 0 on mount when first card is incomplete', () => {
		mockSetupCards.value = [
			createCard({ node: createNode({ name: 'Node 1', id: 'n1' }), isComplete: false }),
			createCard({ node: createNode({ name: 'Node 2', id: 'n2' }), isComplete: true }),
		];

		const { currentStepIndex } = getComposable();

		expect(currentStepIndex.value).toBe(0);
	});

	it('stays on step 0 on mount when all cards are complete', () => {
		mockSetupCards.value = [
			createCard({ node: createNode({ name: 'Node 1', id: 'n1' }), isComplete: true }),
			createCard({ node: createNode({ name: 'Node 2', id: 'n2' }), isComplete: true }),
		];

		const { currentStepIndex } = getComposable();

		// All complete — no incomplete card to skip to, stays at 0
		expect(currentStepIndex.value).toBe(0);
	});

	it('passes through trigger cards from useWorkflowSetupState without additional filtering', () => {
		mockSetupCards.value = [
			createCard({
				node: createNode({
					name: 'Webhook',
					id: 'trigger-1',
					type: 'n8n-nodes-base.webhook',
				}),
				isTrigger: true,
				isComplete: false,
			}),
			createCard({
				node: createNode({ name: 'HTTP Request', id: 'n2' }),
				credentialType: 'httpBasicAuth',
				isComplete: true,
			}),
		];

		const { cards } = getComposable();
		expect(cards.value).toHaveLength(2);
		expect(cards.value[0].state!.node.name).toBe('Webhook');
		expect(cards.value[1].state!.node.name).toBe('HTTP Request');
	});

	it('treats incomplete cards as genuinely incomplete', () => {
		mockSetupCards.value = [
			createCard({
				node: createNode({ name: 'Node 1', id: 'n1' }),
				credentialType: 'telegramApi',
				selectedCredentialId: 'cred-1',
				issues: [],
				isComplete: false,
			}),
		];

		const { isAllComplete } = getComposable();
		expect(isAllComplete.value).toBe(false);
	});

	it('treats cards with no credential selected as genuinely incomplete', () => {
		mockSetupCards.value = [
			createCard({
				node: createNode({ name: 'Node 1', id: 'n1' }),
				credentialType: 'telegramApi',
				selectedCredentialId: undefined,
				issues: ['Credential not set'],
				isComplete: false,
			}),
		];

		const { isAllComplete } = getComposable();
		expect(isAllComplete.value).toBe(false);
	});

	it('onStepExecuted dismisses wizard when all cards are complete', async () => {
		mockSetupCards.value = [
			createCard({
				node: createNode({ name: 'Node 1', id: 'n1' }),
				credentialType: 'openAiApi',
				isComplete: true,
			}),
			createCard({
				node: createNode({ name: 'Node 2', id: 'n2' }),
				credentialType: 'slackApi',
				isComplete: true,
			}),
		];
		// Start on the last card — onStepExecuted only dismisses from the last step
		mockBuilderStoreState.wizardCurrentStep = 1;

		const { onStepExecuted } = getComposable();
		onStepExecuted();
		await nextTick();

		expect(mockBuilderStoreState.wizardHasExecutedWorkflow).toBe(true);
	});

	it('onStepExecuted does not dismiss wizard when some cards are incomplete', async () => {
		mockSetupCards.value = [
			createCard({
				node: createNode({ name: 'Node 1', id: 'n1' }),
				credentialType: 'openAiApi',
				isComplete: true,
			}),
			createCard({
				node: createNode({ name: 'Node 2', id: 'n2' }),
				credentialType: 'slackApi',
				isComplete: false,
			}),
		];

		const { onStepExecuted } = getComposable();
		onStepExecuted();
		await nextTick();

		expect(mockBuilderStoreState.wizardHasExecutedWorkflow).toBe(false);
	});

	it('does not auto-advance when a card completes', async () => {
		mockSetupCards.value = [
			createCard({
				node: createNode({ name: 'Node 1', id: 'n1' }),
				credentialType: 'openAiApi',
				isComplete: false,
			}),
			createCard({
				node: createNode({ name: 'Node 2', id: 'n2' }),
				credentialType: 'slackApi',
				isComplete: false,
			}),
		];

		const { currentStepIndex } = getComposable();
		expect(currentStepIndex.value).toBe(0);

		// Simulate card completing — should stay on the same card
		mockSetupCards.value = [
			createCard({
				node: createNode({ name: 'Node 1', id: 'n1' }),
				credentialType: 'openAiApi',
				isComplete: true,
			}),
			createCard({
				node: createNode({ name: 'Node 2', id: 'n2' }),
				credentialType: 'slackApi',
				isComplete: false,
			}),
		];
		await nextTick();

		expect(currentStepIndex.value).toBe(0);
	});

	it('exposes isInitialCredentialTestingDone from useWorkflowSetupState', async () => {
		mockIsInitialCredentialTestingDone.value = false;
		const { isInitialCredentialTestingDone } = getComposable();
		expect(isInitialCredentialTestingDone.value).toBe(false);

		mockIsInitialCredentialTestingDone.value = true;
		await nextTick();
		expect(isInitialCredentialTestingDone.value).toBe(true);
	});

	it('skips to first incomplete card when initial credential testing completes', async () => {
		mockIsInitialCredentialTestingDone.value = false;
		// First card complete, second incomplete — but both have isComplete: false initially
		// because credential test hasn't resolved yet
		mockSetupCards.value = [
			createCard({
				node: createNode({ name: 'Node 1', id: 'n1' }),
				credentialType: 'openAiApi',
				isComplete: false,
			}),
			createCard({
				node: createNode({ name: 'Node 2', id: 'n2' }),
				credentialType: 'slackApi',
				isComplete: false,
			}),
		];

		const { currentStepIndex } = getComposable();
		// While testing is in progress, stays on step 0 (card appears incomplete)
		expect(currentStepIndex.value).toBe(0);

		// Simulate credential test resolving — first card becomes complete
		mockSetupCards.value = [
			createCard({
				node: createNode({ name: 'Node 1', id: 'n1' }),
				credentialType: 'openAiApi',
				isComplete: true,
			}),
			createCard({
				node: createNode({ name: 'Node 2', id: 'n2' }),
				credentialType: 'slackApi',
				isComplete: false,
			}),
		];
		mockIsInitialCredentialTestingDone.value = true;
		await nextTick();

		// Should now skip to the first incomplete card
		expect(currentStepIndex.value).toBe(1);
	});

	it('dismisses wizard when initial credential testing reveals all cards complete', async () => {
		mockIsInitialCredentialTestingDone.value = false;
		mockSetupCards.value = [
			createCard({
				node: createNode({ name: 'Node 1', id: 'n1' }),
				credentialType: 'openAiApi',
				isComplete: true,
			}),
			createCard({
				node: createNode({ name: 'Node 2', id: 'n2' }),
				credentialType: 'slackApi',
				isComplete: true,
			}),
		];

		getComposable();
		expect(mockBuilderStoreState.wizardHasExecutedWorkflow).toBe(false);

		// Simulate credential tests finishing — all cards are complete
		mockIsInitialCredentialTestingDone.value = true;
		await nextTick();

		expect(mockBuilderStoreState.wizardHasExecutedWorkflow).toBe(true);
	});
});
