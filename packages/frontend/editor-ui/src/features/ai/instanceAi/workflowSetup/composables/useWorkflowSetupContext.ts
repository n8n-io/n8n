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
import { useCredentialTestInBackground } from '@/features/credentials/composables/useCredentialTestInBackground';
import type { INodeUi } from '@/Interface';
import { useInstanceAiStore } from '../../instanceAi.store';
import type { TerminalState, WorkflowSetupCard } from '../workflowSetup.types';
import { useWorkflowSetupActions } from './useWorkflowSetupActions';
import { useWorkflowSetupApply } from './useWorkflowSetupApply';
import { useWorkflowSetupBootstrap } from './useWorkflowSetupBootstrap';
import { useWorkflowSetupCards } from './useWorkflowSetupCards';
import { useWorkflowSetupInputs } from './useWorkflowSetupInputs';

type SelectionsMap = Record<string, Record<string, string>>;

export interface WorkflowSetupContext {
	cards: ComputedRef<WorkflowSetupCard[]>;
	currentStepIndex: Ref<number>;
	activeCard: ComputedRef<WorkflowSetupCard | undefined>;
	hasOtherUnhandledCards: ComputedRef<boolean>;
	canAdvanceToNextIncomplete: ComputedRef<boolean>;
	selections: Ref<SelectionsMap>;
	terminalState: Ref<TerminalState | null>;
	isReady: Ref<boolean>;
	projectId: ComputedRef<string | undefined>;
	credentialFlow: ComputedRef<InstanceAiCredentialFlow | undefined>;
	isActionPending: Ref<boolean>;
	setSelection: (nodeName: string, credType: string, credId: string | null) => void;
	setParameterValue: (card: WorkflowSetupCard, parameterName: string, value: unknown) => void;
	getDisplayNode: (card: WorkflowSetupCard) => INodeUi;
	isCardComplete: (card: WorkflowSetupCard) => boolean;
	isCredentialTestFailed: (card: WorkflowSetupCard) => boolean;
	isCardSkipped: (card: WorkflowSetupCard) => boolean;
	goToStep: (index: number) => void;
	goToNext: () => void;
	goToPrev: () => void;
	goToNextIncomplete: () => void;
	apply: () => Promise<void>;
	skipCurrentCard: () => Promise<void>;
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
	const { hydrateCredentialTestResults } = useCredentialTestInBackground();

	hydrateCredentialTestResults(
		opts.setupRequests.value.flatMap((req) => {
			const credType = req.credentialType;
			const credId = credType ? req.node.credentials?.[credType]?.id : undefined;
			const result = req.credentialTestResult;
			return credId && result ? [{ id: credId, success: result.success }] : [];
		}),
	);

	const { cards } = useWorkflowSetupCards(opts.setupRequests);
	const bootstrap = useWorkflowSetupBootstrap(opts.workflowId);
	const applyMachine = useWorkflowSetupApply({
		requestId: opts.requestId,
		store,
	});

	const currentStepIndex = ref(0);
	const activeCard = computed(() => cards.value[currentStepIndex.value]);

	const inputsState = useWorkflowSetupInputs({ cards, activeCard });

	const projectId = computed(() => opts.projectId.value);
	const credentialFlow = computed(() => opts.credentialFlow.value);

	function goToStep(index: number) {
		if (index >= 0 && index < cards.value.length) {
			currentStepIndex.value = index;
		}
	}

	function goToNext() {
		if (currentStepIndex.value < cards.value.length - 1) {
			currentStepIndex.value++;
		}
	}

	function goToPrev() {
		if (currentStepIndex.value > 0) {
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
			selections: inputsState.selections,
			skippedCardIds: inputsState.skippedCardIds,
			isCardComplete: inputsState.isCardComplete,
			isCardSkipped: inputsState.isCardSkipped,
			markCardSkipped: inputsState.markCardSkipped,
			buildCompletedSetupPayload: inputsState.buildCompletedSetupPayload,
		},
		applyMachine: {
			apply: applyMachine.apply,
			defer: applyMachine.defer,
		},
		store,
	});

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
		if (opts.setupRequests.value.length > 0 && inputsState.allCardsComplete()) {
			// Auto-apply on mount preserves the existing analytics behavior — it
			// intentionally bypasses trackSetupInput because the user did not
			// interact with the wizard.
			await applyMachine.apply(inputsState.buildCompletedSetupPayload());
		}
	});

	const context: WorkflowSetupContext = {
		cards,
		currentStepIndex,
		activeCard,
		hasOtherUnhandledCards: actions.hasOtherUnhandledCards,
		canAdvanceToNextIncomplete: actions.canAdvanceToNextIncomplete,
		selections: inputsState.selections,
		terminalState: applyMachine.terminalState,
		isReady: bootstrap.isReady,
		projectId,
		credentialFlow,
		isActionPending: actions.isActionPending,
		setSelection: inputsState.setSelection,
		setParameterValue: inputsState.setParameterValue,
		getDisplayNode: inputsState.getDisplayNode,
		isCardComplete: inputsState.isCardComplete,
		isCredentialTestFailed: inputsState.isCredentialTestFailed,
		isCardSkipped: inputsState.isCardSkipped,
		goToStep,
		goToNext,
		goToPrev,
		goToNextIncomplete: actions.goToNextIncomplete,
		apply: actions.apply,
		skipCurrentCard: actions.skipCurrentCard,
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
