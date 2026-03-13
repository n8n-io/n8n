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

// Pinia unwraps refs, so the store exposes the raw Map (not a Ref).
// Use reactive() so changes are tracked by Vue's reactivity system.
const mockCredentialTestResults = reactive(new Map<string, string>());
vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		credentialTestResults: mockCredentialTestResults,
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
	vi.doMock('@/features/credentials/credentials.store', () => ({
		useCredentialsStore: () => ({ credentialTestResults: mockCredentialTestResults }),
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
		mockCredentialTestResults.clear();
	});

	it('passes through cards from useWorkflowSetupState', async () => {
		// Manual trigger filtering is now handled upstream by useWorkflowSetupState
		mockSetupCards.value = [
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
			createCard({
				node: createNode({ name: 'Node 2', id: 'n2' }),
				isComplete: false,
				credentialType: 'telegramApi',
				issues: ['Credential not set'],
			}),
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

	it('skips to first incomplete card on mount when current card is already complete', async () => {
		mockSetupCards.value = [
			createCard({ node: createNode({ name: 'Node 1', id: 'n1' }), isComplete: true }),
			createCard({ node: createNode({ name: 'Node 2', id: 'n2' }), isComplete: true }),
			createCard({ node: createNode({ name: 'Node 3', id: 'n3' }), isComplete: false }),
		];

		const { currentStepIndex } = await getComposable();

		// Should skip past completed cards to the first incomplete one
		expect(currentStepIndex.value).toBe(2);
	});

	it('stays on step 0 on mount when first card is incomplete', async () => {
		mockSetupCards.value = [
			createCard({ node: createNode({ name: 'Node 1', id: 'n1' }), isComplete: false }),
			createCard({ node: createNode({ name: 'Node 2', id: 'n2' }), isComplete: true }),
		];

		const { currentStepIndex } = await getComposable();

		expect(currentStepIndex.value).toBe(0);
	});

	it('stays on step 0 on mount when all cards are complete', async () => {
		mockSetupCards.value = [
			createCard({ node: createNode({ name: 'Node 1', id: 'n1' }), isComplete: true }),
			createCard({ node: createNode({ name: 'Node 2', id: 'n2' }), isComplete: true }),
		];

		const { currentStepIndex } = await getComposable();

		// All complete — no incomplete card to skip to, stays at 0
		expect(currentStepIndex.value).toBe(0);
	});

	it('does not auto-advance when navigating back to a completed card', async () => {
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

		// Navigate back to completed step 0 — should stay (navigation, not completion)
		goToStep(0);
		await nextTick();
		expect(currentStepIndex.value).toBe(0);
	});

	it('filters out trigger-only cards that require no setup', async () => {
		mockSetupCards.value = [
			createCard({
				node: createNode({
					name: 'Schedule Trigger',
					id: 'trigger-1',
					type: 'n8n-nodes-base.scheduleTrigger',
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

		const { cards, isAllComplete } = await getComposable();
		expect(cards.value).toHaveLength(1);
		expect(cards.value[0].state.node.name).toBe('HTTP Request');
		expect(isAllComplete.value).toBe(true);
	});

	it('keeps trigger cards that have credentials', async () => {
		mockSetupCards.value = [
			createCard({
				node: createNode({
					name: 'Telegram Trigger',
					id: 'trigger-1',
					type: 'n8n-nodes-base.telegramTrigger',
				}),
				isTrigger: true,
				isComplete: false,
				credentialType: 'telegramApi',
			}),
		];

		const { cards } = await getComposable();
		expect(cards.value).toHaveLength(1);
		expect(cards.value[0].state.node.name).toBe('Telegram Trigger');
	});

	it('keeps trigger cards that have parameter issues', async () => {
		mockSetupCards.value = [
			createCard({
				node: createNode({
					name: 'Webhook Trigger',
					id: 'trigger-1',
					type: 'n8n-nodes-base.webhook',
				}),
				isTrigger: true,
				isComplete: false,
				parameterIssues: { path: ['Parameter "path" is required'] },
			}),
		];

		const { cards } = await getComposable();
		expect(cards.value).toHaveLength(1);
	});

	it('treats cards with pending credential tests as effectively complete', async () => {
		mockCredentialTestResults.set('cred-1', 'pending');
		mockSetupCards.value = [
			createCard({
				node: createNode({ name: 'Node 1', id: 'n1' }),
				credentialType: 'telegramApi',
				selectedCredentialId: 'cred-1',
				issues: [],
				isComplete: false, // pending test makes upstream mark it incomplete
			}),
		];

		const { isAllComplete } = await getComposable();
		expect(isAllComplete.value).toBe(true);
	});

	it('treats cards with failed credential tests as genuinely incomplete', async () => {
		mockCredentialTestResults.set('cred-1', 'error');
		mockSetupCards.value = [
			createCard({
				node: createNode({ name: 'Node 1', id: 'n1' }),
				credentialType: 'telegramApi',
				selectedCredentialId: 'cred-1',
				issues: [],
				isComplete: false,
			}),
		];

		const { isAllComplete } = await getComposable();
		expect(isAllComplete.value).toBe(false);
	});

	it('treats cards with no credential selected as genuinely incomplete', async () => {
		mockSetupCards.value = [
			createCard({
				node: createNode({ name: 'Node 1', id: 'n1' }),
				credentialType: 'telegramApi',
				selectedCredentialId: undefined,
				issues: ['Credential not set'],
				isComplete: false,
			}),
		];

		const { isAllComplete } = await getComposable();
		expect(isAllComplete.value).toBe(false);
	});

	it('auto-advances credential-only card when it completes', async () => {
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

		const { currentStepIndex } = await getComposable();
		expect(currentStepIndex.value).toBe(0);

		// Simulate credential card completing (credential set + test passed)
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

		expect(currentStepIndex.value).toBe(1);
	});

	it('auto-advances through multiple already-complete cards to first incomplete', async () => {
		mockSetupCards.value = [
			createCard({
				node: createNode({ name: 'Node 1', id: 'n1' }),
				credentialType: 'openAiApi',
				isComplete: false,
			}),
			createCard({
				node: createNode({ name: 'Node 2', id: 'n2' }),
				credentialType: 'slackApi',
				isComplete: true,
			}),
			createCard({
				node: createNode({ name: 'Node 3', id: 'n3' }),
				credentialType: 'telegramApi',
				isComplete: false,
			}),
		];

		const { currentStepIndex } = await getComposable();
		expect(currentStepIndex.value).toBe(0);

		// Card 1 completes — should skip past already-complete card 2 to card 3
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
			createCard({
				node: createNode({ name: 'Node 3', id: 'n3' }),
				credentialType: 'telegramApi',
				isComplete: false,
			}),
		];
		await nextTick();

		expect(currentStepIndex.value).toBe(2);
	});

	it('does not auto-advance when wizardHasExecutedWorkflow is true', async () => {
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

		const { currentStepIndex } = await getComposable();
		(mockBuilderStoreState as Record<string, unknown>).wizardHasExecutedWorkflow = true;

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
		(mockBuilderStoreState as Record<string, unknown>).wizardHasExecutedWorkflow = false;
	});

	it('onStepExecuted skips to next incomplete card', async () => {
		mockSetupCards.value = [
			createCard({
				node: createNode({ name: 'Node 1', id: 'n1' }),
				credentialType: 'openAiApi',
				additionalParameterNames: ['model'],
				isComplete: true,
			}),
			createCard({
				node: createNode({ name: 'Node 2', id: 'n2' }),
				credentialType: 'slackApi',
				isComplete: true,
			}),
			createCard({
				node: createNode({ name: 'Node 3', id: 'n3' }),
				credentialType: 'telegramApi',
				isComplete: false,
			}),
		];

		const { currentStepIndex, onStepExecuted } = await getComposable();
		// skipToFirstIncomplete on mount already moves to card 3, reset to 0
		currentStepIndex.value = 0;
		await nextTick();

		onStepExecuted();
		await nextTick();

		// Should skip past complete card 2 to incomplete card 3
		expect(currentStepIndex.value).toBe(2);
	});

	it('does not auto-advance for cards with parameters to avoid disrupting typing', async () => {
		mockSetupCards.value = [
			createCard({
				node: createNode({ name: 'Node 1', id: 'n1' }),
				isComplete: false,
				additionalParameterNames: ['assignments'],
			}),
			createCard({ node: createNode({ name: 'Node 2', id: 'n2' }), isComplete: false }),
		];

		const { currentStepIndex } = await getComposable();
		expect(currentStepIndex.value).toBe(0);

		// Simulate card completing (e.g., user filled in the last required param)
		mockSetupCards.value = [
			createCard({
				node: createNode({ name: 'Node 1', id: 'n1' }),
				isComplete: true,
				additionalParameterNames: ['assignments'],
			}),
			createCard({ node: createNode({ name: 'Node 2', id: 'n2' }), isComplete: false }),
		];
		await nextTick();

		// Should NOT auto-advance — user may still be editing parameters
		expect(currentStepIndex.value).toBe(0);
	});
});
