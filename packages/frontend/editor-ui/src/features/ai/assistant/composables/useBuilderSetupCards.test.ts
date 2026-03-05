import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nextTick, reactive, ref, effectScope, type EffectScope } from 'vue';
import type { SetupCardItem, NodeSetupState } from '@/features/setupPanel/setupPanel.types';
import type { INodeUi } from '@/Interface';

const mockSetupCards = ref<SetupCardItem[]>([]);
const mockFirstTriggerName = ref<string | null>(null);
const mockSetCredential = vi.fn();
const mockUnsetCredential = vi.fn();

vi.mock('@/features/setupPanel/composables/useWorkflowSetupState', () => ({
	useWorkflowSetupState: () => ({
		setupCards: mockSetupCards,
		firstTriggerName: mockFirstTriggerName,
		setCredential: mockSetCredential,
		unsetCredential: mockUnsetCredential,
	}),
}));

const mockTrackJourney = vi.fn();

// Reactive object so computed properties in the composable can track changes
const mockBuilderStoreState = reactive({
	wizardCurrentStep: 0,
	wizardClearedPlaceholders: new Set<string>(),
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
		allNodes: mockAllNodes.value,
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

function createNode(overrides: Partial<INodeUi> = {}): INodeUi {
	return {
		id: 'node-1',
		name: 'Test Node',
		type: 'n8n-nodes-base.httpRequest',
		position: [0, 0],
		parameters: {},
		typeVersion: 1,
		...overrides,
	} as INodeUi;
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

let currentScope: EffectScope | undefined;

// We need a fresh import for each test to avoid stale module state
async function getComposable() {
	// Stop previous scope to clean up watchers from prior calls
	currentScope?.stop();

	// Clear module cache to get fresh composable
	vi.resetModules();
	// Re-register mocks after reset
	vi.doMock('@/features/setupPanel/composables/useWorkflowSetupState', () => ({
		useWorkflowSetupState: () => ({
			setupCards: mockSetupCards,
			firstTriggerName: mockFirstTriggerName,
			setCredential: mockSetCredential,
			unsetCredential: mockUnsetCredential,
		}),
	}));
	vi.doMock('@/features/ai/assistant/builder.store', () => ({
		useBuilderStore: () => mockBuilderStoreState,
	}));
	vi.doMock('@/app/stores/workflows.store', () => ({
		useWorkflowsStore: () => ({
			workflowId: 'test-workflow-id',
			nodeMetadata: {},
			allNodes: mockAllNodes.value,
		}),
	}));
	vi.doMock('@/app/stores/workflowDocument.store', () => ({
		useWorkflowDocumentStore: () => ({
			pinData: {},
			unpinNodeData: mockUnpinNodeData,
		}),
		createWorkflowDocumentId: (id: string) => id,
	}));
	vi.doMock('@/app/stores/ui.store', () => ({
		useUIStore: () => ({
			markStateDirty: vi.fn(),
		}),
	}));
	vi.doMock('@/app/composables/useWorkflowState', () => ({
		injectWorkflowState: () => ({
			updateNodeProperties: mockUpdateNodeProperties,
		}),
	}));
	vi.doMock('@/app/composables/useNodeHelpers', () => ({
		useNodeHelpers: () => ({
			updateNodesParameterIssues: vi.fn(),
		}),
	}));

	const mod = await import('./useBuilderSetupCards');
	currentScope = effectScope();
	return currentScope.run(() => mod.useBuilderSetupCards())!;
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
		mockBuilderStoreState.wizardClearedPlaceholders = new Set();
	});

	it('filters out manual trigger cards', async () => {
		mockSetupCards.value = [
			createCard({
				node: createNode({ type: 'n8n-nodes-base.manualTrigger', name: 'Manual Trigger' }),
				isTrigger: true,
			}),
			createCard({
				node: createNode({ type: 'n8n-nodes-base.httpRequest', name: 'HTTP Request' }),
			}),
		];

		const { cards } = await getComposable();
		expect(cards.value).toHaveLength(1);
		expect(cards.value[0].state.node.name).toBe('HTTP Request');
	});

	it('returns correct navigation state', async () => {
		mockSetupCards.value = [
			createCard({ node: createNode({ name: 'Node 1', id: 'n1' }) }),
			createCard({ node: createNode({ name: 'Node 2', id: 'n2' }) }),
			createCard({ node: createNode({ name: 'Node 3', id: 'n3' }) }),
		];

		const { currentStepIndex, currentCard, totalCards, goToNext, goToPrev, goToStep } =
			await getComposable();

		expect(totalCards.value).toBe(3);
		expect(currentStepIndex.value).toBe(0);
		expect(currentCard.value?.state.node.name).toBe('Node 1');

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

		const { currentStepIndex, goToStep } = await getComposable();
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
			createCard({ node: createNode({ name: 'Node 2', id: 'n2' }), isComplete: false }),
		];

		const { isAllComplete } = await getComposable();
		expect(isAllComplete.value).toBe(false);

		mockSetupCards.value = [
			createCard({ node: createNode({ name: 'Node 1', id: 'n1' }), isComplete: true }),
			createCard({ node: createNode({ name: 'Node 2', id: 'n2' }), isComplete: true }),
		];
		await nextTick();

		expect(isAllComplete.value).toBe(true);
	});

	it('tracks continue telemetry', async () => {
		mockSetupCards.value = [
			createCard({ node: createNode({ name: 'Node 1', id: 'n1' }) }),
			createCard({ node: createNode({ name: 'Node 2', id: 'n2' }) }),
		];

		const { continueCurrent } = await getComposable();
		continueCurrent();

		expect(mockTrackJourney).toHaveBeenCalledWith(
			'setup_wizard_step_completed',
			expect.objectContaining({
				step: 1,
				total: 2,
			}),
		);
	});

	it('returns empty cards when no setup cards exist', async () => {
		mockSetupCards.value = [];

		const { cards, isAllComplete, totalCards } = await getComposable();
		expect(cards.value).toHaveLength(0);
		expect(totalCards.value).toBe(0);
		expect(isAllComplete.value).toBe(true);
	});

	it('passes through setCredential and unsetCredential', async () => {
		mockSetupCards.value = [createCard()];

		const { setCredential, unsetCredential } = await getComposable();
		setCredential('testType', 'testId', 'testNode');
		unsetCredential('testType', 'testNode');

		expect(mockSetCredential).toHaveBeenCalledWith('testType', 'testId', 'testNode');
		expect(mockUnsetCredential).toHaveBeenCalledWith('testType', 'testNode');
	});

	it('does not auto-advance when navigating back to a completed card', async () => {
		vi.useFakeTimers();

		mockSetupCards.value = [
			createCard({ node: createNode({ name: 'Node 1', id: 'n1' }), isComplete: true }),
			createCard({ node: createNode({ name: 'Node 2', id: 'n2' }), isComplete: false }),
			createCard({ node: createNode({ name: 'Node 3', id: 'n3' }), isComplete: false }),
		];

		const { currentStepIndex, goToStep } = await getComposable();

		// Move to step 1 (incomplete)
		goToStep(1);
		await nextTick();
		expect(currentStepIndex.value).toBe(1);

		// Navigate back to completed step 0
		goToStep(0);
		await nextTick();
		expect(currentStepIndex.value).toBe(0);

		// Wait past the auto-advance delay
		vi.advanceTimersByTime(500);
		await nextTick();

		// Should still be on step 0 — no auto-advance
		expect(currentStepIndex.value).toBe(0);

		vi.useRealTimers();
	});

	it('does not auto-advance for cards with template parameters', async () => {
		vi.useFakeTimers();

		mockSetupCards.value = [
			createCard({
				node: createNode({ name: 'Node 1', id: 'n1' }),
				isComplete: false,
				templateParameterNames: ['assignments'],
			}),
			createCard({ node: createNode({ name: 'Node 2', id: 'n2' }), isComplete: false }),
		];

		const { currentStepIndex } = await getComposable();
		expect(currentStepIndex.value).toBe(0);

		// Simulate card completing (e.g., user filled in params)
		mockSetupCards.value = [
			createCard({
				node: createNode({ name: 'Node 1', id: 'n1' }),
				isComplete: true,
				templateParameterNames: ['assignments'],
			}),
			createCard({ node: createNode({ name: 'Node 2', id: 'n2' }), isComplete: false }),
		];
		await nextTick();

		// Wait past auto-advance delay
		vi.advanceTimersByTime(500);
		await nextTick();

		// Should NOT auto-advance because card has template parameters
		expect(currentStepIndex.value).toBe(0);

		vi.useRealTimers();
	});
});
