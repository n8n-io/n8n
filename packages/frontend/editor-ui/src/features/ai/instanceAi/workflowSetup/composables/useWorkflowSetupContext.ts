import {
	computed,
	inject,
	onMounted,
	provide,
	ref,
	watch,
	type ComputedRef,
	type InjectionKey,
	type Ref,
} from 'vue';
import type { InstanceAiCredentialFlow, InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import { useInstanceAiStore } from '../../instanceAi.store';
import type { TerminalState, WorkflowSetupCard } from '../workflowSetup.types';
import { useWorkflowSetupActions } from './useWorkflowSetupActions';
import { useWorkflowSetupApply } from './useWorkflowSetupApply';
import { useWorkflowSetupBootstrap } from './useWorkflowSetupBootstrap';
import { useWorkflowSetupCards } from './useWorkflowSetupCards';
import { useWorkflowSetupSelections } from './useWorkflowSetupSelections';

type SelectionsMap = Record<string, Record<string, string>>;

export interface WorkflowSetupContext {
	cards: ComputedRef<WorkflowSetupCard[]>;
	currentStepIndex: Ref<number>;
	activeCard: ComputedRef<WorkflowSetupCard | undefined>;
	canAdvanceToNextIncomplete: ComputedRef<boolean>;
	selections: Ref<SelectionsMap>;
	terminalState: Ref<TerminalState | null>;
	isReady: Ref<boolean>;
	projectId: ComputedRef<string | undefined>;
	credentialFlow: ComputedRef<InstanceAiCredentialFlow | undefined>;
	isActionPending: Ref<boolean>;
	setSelection: (nodeName: string, credType: string, credId: string | null) => void;
	isCardComplete: (card: WorkflowSetupCard) => boolean;
	isCredentialTestFailed: (card: WorkflowSetupCard) => boolean;
	isCardSkipped: (card: WorkflowSetupCard) => boolean;
	goToStep: (index: number) => void;
	goToNext: () => void;
	goToPrev: () => void;
	goToNextIncomplete: () => void;
	apply: () => Promise<void>;
	skipCurrentCard: () => Promise<void>;
	showContinueButton: ComputedRef<boolean>;
}

const WorkflowSetupContextKey: InjectionKey<WorkflowSetupContext> = Symbol('WorkflowSetupContext');

interface ProvideOptions {
	requestId: Ref<string>;
	setupRequests: Ref<InstanceAiWorkflowSetupNode[]>;
	projectId: Ref<string | undefined>;
	workflowId: Ref<string | undefined>;
	credentialFlow: Ref<InstanceAiCredentialFlow | undefined>;
}

export function provideWorkflowSetupContext(opts: ProvideOptions): WorkflowSetupContext {
	const store = useInstanceAiStore();

	const { cards } = useWorkflowSetupCards(opts.setupRequests);
	const bootstrap = useWorkflowSetupBootstrap(opts.workflowId);
	const applyMachine = useWorkflowSetupApply({
		requestId: opts.requestId,
		store,
	});

	const currentStepIndex = ref(0);
	const activeCard = computed(() => cards.value[currentStepIndex.value]);

	const selectionsState = useWorkflowSetupSelections({ cards, activeCard });

	const projectId = computed(() => opts.projectId.value);
	const credentialFlow = computed(() => opts.credentialFlow.value);

	// Track manual navigation so the auto-advance watcher below doesn't
	// override an explicit step change the user just made.
	const userNavigated = ref(false);

	function goToStep(index: number) {
		if (index >= 0 && index < cards.value.length) {
			currentStepIndex.value = index;
		}
	}

	function goToNext() {
		if (currentStepIndex.value < cards.value.length - 1) {
			userNavigated.value = true;
			currentStepIndex.value++;
		}
	}

	function goToPrev() {
		if (currentStepIndex.value > 0) {
			userNavigated.value = true;
			currentStepIndex.value--;
		}
	}

	const actions = useWorkflowSetupActions({
		requestId: opts.requestId,
		cards,
		activeCard,
		currentStepIndex,
		goToStep,
		selections: {
			selections: selectionsState.selections,
			skippedCardIds: selectionsState.skippedCardIds,
			isCardComplete: selectionsState.isCardComplete,
			isCardSkipped: selectionsState.isCardSkipped,
			markCardSkipped: selectionsState.markCardSkipped,
			buildCompletedNodeCredentials: selectionsState.buildCompletedNodeCredentials,
		},
		applyMachine: {
			apply: applyMachine.apply,
			defer: applyMachine.defer,
		},
		store,
	});

	// Auto-advance watcher: when the active card becomes complete (and the user
	// didn't just navigate manually), jump to the next unhandled card. The
	// "unhandled" predicate skips both complete AND already-skipped cards so we
	// don't bounce the user back onto something they explicitly skipped.
	watch(
		() => (activeCard.value ? selectionsState.isCardComplete(activeCard.value) : false),
		(complete, prevComplete) => {
			if (!complete || prevComplete || userNavigated.value) {
				userNavigated.value = false;
				return;
			}
			const next = actions.nextUnhandledIndex.value;
			if (next >= 0) {
				currentStepIndex.value = next;
			}
		},
		{ immediate: true },
	);

	// Clamp currentStepIndex when the card list shrinks beneath it.
	watch(
		() => cards.value.length,
		(len) => {
			if (currentStepIndex.value >= len) {
				currentStepIndex.value = Math.max(0, len - 1);
			}
		},
	);

	onMounted(async () => {
		await bootstrap.bootstrap();
		if (opts.setupRequests.value.length > 0 && selectionsState.allCardsComplete()) {
			// Auto-apply on mount preserves the existing analytics behavior — it
			// intentionally bypasses trackSetupInput because the user did not
			// interact with the wizard.
			await applyMachine.apply(selectionsState.buildCompletedNodeCredentials());
		}
	});

	const context: WorkflowSetupContext = {
		cards,
		currentStepIndex,
		activeCard,
		canAdvanceToNextIncomplete: actions.canAdvanceToNextIncomplete,
		selections: selectionsState.selections,
		terminalState: applyMachine.terminalState,
		isReady: bootstrap.isReady,
		projectId,
		credentialFlow,
		isActionPending: actions.isActionPending,
		setSelection: selectionsState.setSelection,
		isCardComplete: selectionsState.isCardComplete,
		isCredentialTestFailed: selectionsState.isCredentialTestFailed,
		isCardSkipped: selectionsState.isCardSkipped,
		goToStep,
		goToNext,
		goToPrev,
		goToNextIncomplete: actions.goToNextIncomplete,
		apply: actions.apply,
		skipCurrentCard: actions.skipCurrentCard,
		showContinueButton: actions.showContinueButton,
	};

	provide(WorkflowSetupContextKey, context);

	return context;
}

export function useWorkflowSetupContext(): WorkflowSetupContext {
	const ctx = inject(WorkflowSetupContextKey);
	if (!ctx) {
		throw new Error(
			'useWorkflowSetupContext: called outside of a provideWorkflowSetupContext scope',
		);
	}
	return ctx;
}
