import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { useInstanceAiStore } from '../../instanceAi.store';
import type { WorkflowSetupApplyPayload, WorkflowSetupCard } from '../workflowSetup.types';

interface SelectionAccessors {
	selections: Ref<Record<string, Record<string, string>>>;
	skippedCardIds: Ref<Set<string>>;
	isCardComplete: (card: WorkflowSetupCard) => boolean;
	isCardSkipped: (card: WorkflowSetupCard) => boolean;
	markCardSkipped: (card: WorkflowSetupCard) => void;
	buildCompletedSetupPayload: () => WorkflowSetupApplyPayload;
}

interface ApplyMachine {
	apply: (payload: WorkflowSetupApplyPayload) => Promise<void>;
	defer: () => Promise<void>;
}

export interface WorkflowSetupActions {
	nextUnhandledIndex: ComputedRef<number>;
	hasOtherUnhandledCards: ComputedRef<boolean>;
	canAdvanceToNextIncomplete: ComputedRef<boolean>;
	isActionPending: Ref<boolean>;
	apply: () => Promise<void>;
	skipCurrentCard: () => Promise<void>;
	goToNextIncomplete: () => void;
}

export function useWorkflowSetupActions(deps: {
	requestId: Ref<string>;
	cards: ComputedRef<WorkflowSetupCard[]>;
	activeCard: ComputedRef<WorkflowSetupCard | undefined>;
	currentStepIndex: Ref<number>;
	goToStep: (index: number) => void;
	selections: SelectionAccessors;
	applyMachine: ApplyMachine;
	store: ReturnType<typeof useInstanceAiStore>;
}): WorkflowSetupActions {
	const telemetry = useTelemetry();
	const rootStore = useRootStore();

	const isActionPending = ref(false);

	function isCardHandled(card: WorkflowSetupCard): boolean {
		return deps.selections.isCardComplete(card) || deps.selections.isCardSkipped(card);
	}

	/**
	 * Globally find the first unhandled card. Prefer indices after the current
	 * step; fall back to indices before. Returns -1 if all cards are handled.
	 */
	const nextUnhandledIndex = computed(() => {
		const cards = deps.cards.value;
		const current = deps.currentStepIndex.value;
		for (let i = current + 1; i < cards.length; i++) {
			if (!isCardHandled(cards[i])) return i;
		}
		for (let i = 0; i < Math.min(current, cards.length); i++) {
			if (!isCardHandled(cards[i])) return i;
		}
		return -1;
	});

	const hasOtherUnhandledCards = computed(() => {
		const cards = deps.cards.value;
		const current = deps.currentStepIndex.value;
		for (let i = 0; i < cards.length; i++) {
			if (i === current) continue;
			if (!isCardHandled(cards[i])) return true;
		}
		return false;
	});

	const canAdvanceToNextIncomplete = computed(() => {
		const card = deps.activeCard.value;
		return (
			card !== undefined &&
			(deps.selections.isCardComplete(card) || deps.selections.isCardSkipped(card)) &&
			nextUnhandledIndex.value >= 0
		);
	});

	function goToNextIncomplete(): void {
		if (canAdvanceToNextIncomplete.value) {
			deps.goToStep(nextUnhandledIndex.value);
		}
	}

	function trackSetupInput(): void {
		const tc = deps.store.findToolCallByRequestId(deps.requestId.value);
		const inputThreadId = tc?.confirmation?.inputThreadId ?? '';
		const provided: Array<{ label: string; options: string[]; option_chosen: string }> = [];
		const skipped: Array<{ label: string; options: string[] }> = [];
		const explicitlySkipped: Array<{ label: string; options: string[] }> = [];
		for (const card of deps.cards.value) {
			const label = card.credentialType ?? card.targetNodeName;
			if (deps.selections.isCardComplete(card)) {
				provided.push({
					label,
					options: [],
					option_chosen:
						card.credentialType !== undefined
							? (deps.selections.selections.value[card.targetNodeName]?.[card.credentialType] ?? '')
							: card.parameterNames.join(','),
				});
			} else {
				skipped.push({ label, options: [] });
				if (deps.selections.isCardSkipped(card)) {
					explicitlySkipped.push({ label, options: [] });
				}
			}
		}
		telemetry.track('User finished providing input', {
			thread_id: deps.store.currentThreadId,
			input_thread_id: inputThreadId,
			instance_id: rootStore.instanceId,
			type: 'setup',
			provided_inputs: provided,
			skipped_inputs: skipped,
			explicitly_skipped_inputs: explicitlySkipped,
			num_tasks: deps.cards.value.length,
		});
	}

	async function apply(): Promise<void> {
		trackSetupInput();
		await deps.applyMachine.apply(deps.selections.buildCompletedSetupPayload());
	}

	async function skipCurrentCard(): Promise<void> {
		if (isActionPending.value) return;
		const card = deps.activeCard.value;
		if (!card) return;

		isActionPending.value = true;
		try {
			deps.selections.markCardSkipped(card);

			// Non-terminal: more cards still need handling — advance & wait for the user.
			if (hasOtherUnhandledCards.value) {
				const next = nextUnhandledIndex.value;
				if (next >= 0) deps.goToStep(next);
				return;
			}

			// Terminal: every card is now complete or skipped.
			trackSetupInput();
			const completedPayload = deps.selections.buildCompletedSetupPayload();
			const hasAnyCompleted =
				Object.keys(completedPayload.nodeCredentials ?? {}).length > 0 ||
				Object.keys(completedPayload.nodeParameters ?? {}).length > 0;
			if (hasAnyCompleted) {
				await deps.applyMachine.apply(completedPayload);
			} else {
				await deps.applyMachine.defer();
			}
		} finally {
			isActionPending.value = false;
		}
	}

	return {
		nextUnhandledIndex,
		hasOtherUnhandledCards,
		canAdvanceToNextIncomplete,
		isActionPending,
		apply,
		skipCurrentCard,
		goToNextIncomplete,
	};
}
