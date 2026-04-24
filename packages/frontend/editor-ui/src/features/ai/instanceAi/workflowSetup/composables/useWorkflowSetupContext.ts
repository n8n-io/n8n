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
import { useRootStore } from '@n8n/stores/useRootStore';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useInstanceAiStore } from '../../instanceAi.store';
import type { TerminalState, WorkflowSetupCard } from '../workflowSetup.types';
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
	setSelection: (nodeName: string, credType: string, credId: string | null) => void;
	isCardComplete: (card: WorkflowSetupCard) => boolean;
	goToStep: (index: number) => void;
	goToNext: () => void;
	goToPrev: () => void;
	apply: () => Promise<void>;
	runPrimaryAction: () => Promise<void>;
	defer: () => Promise<void>;
}

const WorkflowSetupContextKey: InjectionKey<WorkflowSetupContext> = Symbol('WorkflowSetupContext');

interface ProvideOptions {
	requestId: Ref<string>;
	setupRequests: Ref<InstanceAiWorkflowSetupNode[]>;
	workflowId: Ref<string>;
	projectId: Ref<string | undefined>;
	credentialFlow: Ref<InstanceAiCredentialFlow | undefined>;
}

export function provideWorkflowSetupContext(opts: ProvideOptions): WorkflowSetupContext {
	const telemetry = useTelemetry();
	const rootStore = useRootStore();
	const store = useInstanceAiStore();

	const { cards } = useWorkflowSetupCards(opts.setupRequests);
	const bootstrap = useWorkflowSetupBootstrap();
	const applyMachine = useWorkflowSetupApply({
		requestId: opts.requestId,
		workflowId: opts.workflowId,
		store,
	});

	const currentStepIndex = ref(0);
	const activeCard = computed(() => cards.value[currentStepIndex.value]);

	const selectionsState = useWorkflowSetupSelections({ cards, activeCard });
	const nextIncompleteIndex = computed(() =>
		cards.value.findIndex(
			(card, index) => index > currentStepIndex.value && !selectionsState.isCardComplete(card),
		),
	);

	const projectId = computed(() => opts.projectId.value);
	const credentialFlow = computed(() => opts.credentialFlow.value);
	const canAdvanceToNextIncomplete = computed(() => {
		const card = activeCard.value;
		return (
			card !== undefined && selectionsState.isCardComplete(card) && nextIncompleteIndex.value >= 0
		);
	});

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

	watch(
		() => (activeCard.value ? selectionsState.isCardComplete(activeCard.value) : false),
		(complete, prevComplete) => {
			if (!complete || prevComplete || userNavigated.value) {
				userNavigated.value = false;
				return;
			}
			const nextIncomplete = cards.value.findIndex(
				(c, idx) => idx > currentStepIndex.value && !selectionsState.isCardComplete(c),
			);
			if (nextIncomplete >= 0) {
				currentStepIndex.value = nextIncomplete;
			}
		},
		{ immediate: true },
	);

	function trackSetupInput() {
		const tc = store.findToolCallByRequestId(opts.requestId.value);
		const inputThreadId = tc?.confirmation?.inputThreadId ?? '';
		const provided: Array<{ label: string; options: string[]; option_chosen: string }> = [];
		const skipped: Array<{ label: string; options: string[] }> = [];
		for (const card of cards.value) {
			if (selectionsState.isCardComplete(card)) {
				provided.push({
					label: card.credentialType,
					options: [],
					option_chosen:
						selectionsState.selections.value[card.targetNodeName]?.[card.credentialType] ?? '',
				});
			} else {
				skipped.push({ label: card.credentialType, options: [] });
			}
		}
		telemetry.track('User finished providing input', {
			thread_id: store.currentThreadId,
			input_thread_id: inputThreadId,
			instance_id: rootStore.instanceId,
			type: 'setup',
			provided_inputs: provided,
			skipped_inputs: skipped,
			num_tasks: cards.value.length,
		});
	}

	async function apply() {
		trackSetupInput();
		await applyMachine.apply(selectionsState.buildNodeCredentials());
	}

	async function runPrimaryAction() {
		if (canAdvanceToNextIncomplete.value) {
			goToStep(nextIncompleteIndex.value);
			return;
		}

		await apply();
	}

	async function defer() {
		trackSetupInput();
		await applyMachine.defer();
	}

	onMounted(async () => {
		await bootstrap.bootstrap();
		if (opts.setupRequests.value.length > 0 && cards.value.length === 0) {
			await applyMachine.apply({});
		}
	});

	const context: WorkflowSetupContext = {
		cards,
		currentStepIndex,
		activeCard,
		canAdvanceToNextIncomplete,
		selections: selectionsState.selections,
		terminalState: applyMachine.terminalState,
		isReady: bootstrap.isReady,
		projectId,
		credentialFlow,
		setSelection: selectionsState.setSelection,
		isCardComplete: selectionsState.isCardComplete,
		goToStep,
		goToNext,
		goToPrev,
		apply,
		runPrimaryAction,
		defer,
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
