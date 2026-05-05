import { computed, nextTick, ref, type ComputedRef, type Ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowSetupCard } from '../workflowSetup.types';
import { makeWorkflowSetupCard } from '../__tests__/factories';
import { useWorkflowSetupActions } from './useWorkflowSetupActions';

const telemetryTrack = vi.fn();
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

const rootStoreState = { instanceId: 'instance-1' };
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => rootStoreState,
}));

interface Harness {
	cardA: WorkflowSetupCard;
	cardB: WorkflowSetupCard;
	cards: ComputedRef<WorkflowSetupCard[]>;
	currentStepIndex: Ref<number>;
	activeCard: ComputedRef<WorkflowSetupCard | undefined>;
	completedSet: Set<string>;
	skippedSet: Set<string>;
	selections: Ref<Record<string, Record<string, string>>>;
	skippedCardIds: Ref<Set<string>>;
	goToStep: ReturnType<typeof vi.fn>;
	apply: ReturnType<typeof vi.fn>;
	defer: ReturnType<typeof vi.fn>;
	markCardSkipped: ReturnType<typeof vi.fn>;
	buildCompletedSetupPayload: ReturnType<typeof vi.fn>;
	store: { currentThreadId: string; findToolCallByRequestId: ReturnType<typeof vi.fn> };
	actions: ReturnType<typeof useWorkflowSetupActions>;
}

function setupHarness(): Harness {
	const cardA = makeWorkflowSetupCard({
		id: 'A:typeA',
		targetNodeName: 'A',
		credentialType: 'typeA',
	});
	const cardB = makeWorkflowSetupCard({
		id: 'B:typeB',
		targetNodeName: 'B',
		credentialType: 'typeB',
	});
	const cards = computed(() => [cardA, cardB]);
	const currentStepIndex = ref(0);
	const activeCard = computed<WorkflowSetupCard | undefined>(
		() => cards.value[currentStepIndex.value],
	);

	const completedSet = new Set<string>();
	const skippedSet = new Set<string>();
	const selections = ref<Record<string, Record<string, string>>>({});
	const skippedCardIds = ref<Set<string>>(skippedSet);

	const goToStep = vi.fn((idx: number) => {
		currentStepIndex.value = idx;
	});
	const apply = vi.fn().mockResolvedValue(undefined);
	const defer = vi.fn().mockResolvedValue(undefined);
	const markCardSkipped = vi.fn((card: WorkflowSetupCard) => {
		skippedSet.add(card.id);
		skippedCardIds.value = new Set(skippedSet);
	});
	const buildCompletedSetupPayload = vi.fn(() => {
		const out: Record<string, Record<string, string>> = {};
		for (const card of cards.value) {
			if (completedSet.has(card.id) && card.credentialType) {
				out[card.targetNodeName] = {
					...(out[card.targetNodeName] ?? {}),
					[card.credentialType]: 'cred-id',
				};
			}
		}
		return { nodeCredentials: out };
	});

	const store = {
		currentThreadId: 'thread-1',
		findToolCallByRequestId: vi.fn(() => ({
			confirmation: { inputThreadId: 'input-thread-1' },
		})),
	};

	const actions = useWorkflowSetupActions({
		requestId: ref('req-1'),
		cards,
		activeCard,
		currentStepIndex,
		goToStep,
		selections: {
			selections,
			skippedCardIds,
			isCardComplete: (card) => completedSet.has(card.id),
			isCardSkipped: (card) => skippedSet.has(card.id),
			markCardSkipped,
			buildCompletedSetupPayload,
		},
		applyMachine: { apply, defer },
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		store: store as any,
	});

	return {
		cardA,
		cardB,
		cards,
		currentStepIndex,
		activeCard,
		completedSet,
		skippedSet,
		selections,
		skippedCardIds,
		goToStep,
		apply,
		defer,
		markCardSkipped,
		buildCompletedSetupPayload,
		store,
		actions,
	};
}

describe('useWorkflowSetupActions', () => {
	beforeEach(() => {
		telemetryTrack.mockReset();
	});

	it('marks the active card skipped and advances to the next unhandled card without calling the API', async () => {
		const h = setupHarness();

		await h.actions.skipCurrentCard();

		expect(h.markCardSkipped).toHaveBeenCalledWith(h.cardA);
		expect(h.goToStep).toHaveBeenCalledWith(1);
		expect(h.apply).not.toHaveBeenCalled();
		expect(h.defer).not.toHaveBeenCalled();
		expect(telemetryTrack).not.toHaveBeenCalled();
	});

	it('routes through partial apply when terminal skip happens with at least one completion', async () => {
		const h = setupHarness();
		// card A is completed (with a real selection so telemetry can read it),
		// card B is the active one and the only unhandled card.
		h.completedSet.add(h.cardA.id);
		h.selections.value = { A: { typeA: 'cred-id' } };
		h.currentStepIndex.value = 1;
		await nextTick();

		await h.actions.skipCurrentCard();

		expect(h.markCardSkipped).toHaveBeenCalledWith(h.cardB);
		expect(h.apply).toHaveBeenCalledWith({ nodeCredentials: { A: { typeA: 'cred-id' } } });
		expect(h.defer).not.toHaveBeenCalled();
		expect(telemetryTrack).toHaveBeenCalledTimes(1);
		expect(telemetryTrack).toHaveBeenCalledWith(
			'User finished providing input',
			expect.objectContaining({
				type: 'setup',
				explicitly_skipped_inputs: [{ label: 'typeB', options: [] }],
				provided_inputs: [expect.objectContaining({ label: 'typeA', option_chosen: 'cred-id' })],
			}),
		);
	});

	it('routes through defer when terminal skip happens with zero completions', async () => {
		const h = setupHarness();
		// pre-skip card A so card B is the only unhandled card on a fresh skip.
		h.skippedSet.add(h.cardA.id);
		h.skippedCardIds.value = new Set(h.skippedSet);
		h.currentStepIndex.value = 1;
		await nextTick();

		await h.actions.skipCurrentCard();

		expect(h.markCardSkipped).toHaveBeenCalledWith(h.cardB);
		expect(h.defer).toHaveBeenCalledTimes(1);
		expect(h.apply).not.toHaveBeenCalled();
	});

	it('does not skip a card with selected-but-not-complete credential into a partial apply', async () => {
		const h = setupHarness();
		// pre-skip card A so card B is the active and only unhandled card,
		// card B has a selection that hasn't completed (e.g. cred test pending).
		h.skippedSet.add(h.cardA.id);
		h.skippedCardIds.value = new Set(h.skippedSet);
		h.selections.value = { B: { typeB: 'cred-id-pending' } };
		h.currentStepIndex.value = 1;
		await nextTick();

		await h.actions.skipCurrentCard();

		// B is not complete, A is skipped → no completed cards → defer path.
		expect(h.defer).toHaveBeenCalledTimes(1);
		expect(h.apply).not.toHaveBeenCalled();
	});

	it('routes back to an earlier unhandled card when current is later', async () => {
		const h = setupHarness();
		// User manually navigated to card B without handling card A.
		h.currentStepIndex.value = 1;
		await nextTick();

		await h.actions.skipCurrentCard();

		expect(h.markCardSkipped).toHaveBeenCalledWith(h.cardB);
		// Card A is still unhandled → wizard should route back to it.
		expect(h.goToStep).toHaveBeenCalledWith(0);
		expect(h.apply).not.toHaveBeenCalled();
		expect(h.defer).not.toHaveBeenCalled();
	});

	it('guards against rapid double-clicks via isActionPending', async () => {
		const h = setupHarness();
		// Make apply take a tick.
		let resolveApply: () => void = () => {};
		h.apply.mockReturnValueOnce(
			new Promise<void>((r) => {
				resolveApply = r;
			}),
		);
		h.completedSet.add(h.cardA.id);
		h.currentStepIndex.value = 1;
		await nextTick();

		// First call → terminal skip, schedules apply (pending).
		const first = h.actions.skipCurrentCard();
		// Concurrent call should be ignored.
		const second = h.actions.skipCurrentCard();

		await second; // returns immediately — guard short-circuits
		expect(h.apply).toHaveBeenCalledTimes(1);

		resolveApply();
		await first;
		expect(h.apply).toHaveBeenCalledTimes(1);
	});

	it('nextUnhandledIndex skips both complete and skipped cards', async () => {
		const h = setupHarness();
		h.completedSet.add(h.cardA.id);
		h.skippedSet.add(h.cardB.id);
		h.skippedCardIds.value = new Set(h.skippedSet);
		await nextTick();

		expect(h.actions.nextUnhandledIndex.value).toBe(-1);
		expect(h.actions.hasOtherUnhandledCards.value).toBe(false);
	});

	it('apply() reports completed cards via partial credential map and tracks telemetry', async () => {
		const h = setupHarness();
		h.completedSet.add(h.cardA.id);

		await h.actions.apply();

		expect(h.apply).toHaveBeenCalledWith({ nodeCredentials: { A: { typeA: 'cred-id' } } });
		expect(telemetryTrack).toHaveBeenCalledTimes(1);
	});
});
