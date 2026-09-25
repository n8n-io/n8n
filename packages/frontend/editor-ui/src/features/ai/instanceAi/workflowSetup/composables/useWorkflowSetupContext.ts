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
import { useThread } from '../../instanceAi.store';
import type { TerminalState, WorkflowSetupSection } from '../workflowSetup.types';
import { useWorkflowSetupActions } from './useWorkflowSetupActions';
import { useWorkflowSetupApply } from './useWorkflowSetupApply';
import { useWorkflowSetupBootstrap } from './useWorkflowSetupBootstrap';
import { useWorkflowSetupSections } from './useWorkflowSetupSections';
import { useWorkflowSetupInputs, type CredentialSelectionsMap } from './useWorkflowSetupInputs';

export interface WorkflowSetupContext {
	/** The wizard shows one section per step, in this order. */
	sections: ComputedRef<WorkflowSetupSection[]>;
	currentStepIndex: Ref<number>;
	activeSection: ComputedRef<WorkflowSetupSection | undefined>;
	hasOtherUnhandledSteps: ComputedRef<boolean>;
	canAdvanceToNextIncomplete: ComputedRef<boolean>;
	credentialSelections: Ref<CredentialSelectionsMap>;
	terminalState: Ref<TerminalState | null>;
	isReady: Ref<boolean>;
	workflowId: ComputedRef<string | undefined>;
	projectId: ComputedRef<string | undefined>;
	credentialFlow: ComputedRef<InstanceAiCredentialFlow | undefined>;
	isActionPending: Ref<boolean>;
	setCredential: (section: WorkflowSetupSection, credId: string | null) => void;
	setParameterValue: (section: WorkflowSetupSection, parameterName: string, value: unknown) => void;
	getDisplayNode: (section: WorkflowSetupSection) => INodeUi;
	isSectionComplete: (section: WorkflowSetupSection) => boolean;
	isCredentialTestFailed: (section: WorkflowSetupSection) => boolean;
	isSectionSkipped: (section: WorkflowSetupSection) => boolean;
	isSectionHandled: (section: WorkflowSetupSection) => boolean;
	goToStep: (index: number) => void;
	goToNext: () => void;
	goToPrev: () => void;
	goToNextIncomplete: () => void;
	apply: () => Promise<void>;
	skipCurrentStep: () => Promise<void>;
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
	const thread = useThread();
	const { hydrateCredentialTestResults } = useCredentialTestInBackground();

	hydrateCredentialTestResults(
		opts.setupRequests.value.flatMap((req) => {
			const credType = req.credentialType;
			const credId = credType ? req.node.credentials?.[credType]?.id : undefined;
			const result = req.credentialTestResult;
			return credId && result ? [{ id: credId, success: result.success }] : [];
		}),
	);

	const { sections } = useWorkflowSetupSections(opts.setupRequests);
	const bootstrap = useWorkflowSetupBootstrap(opts.workflowId);
	const applyMachine = useWorkflowSetupApply({
		requestId: opts.requestId,
		thread,
	});

	const currentStepIndex = ref(0);
	const activeSection = computed(() => sections.value[currentStepIndex.value]);

	const inputsState = useWorkflowSetupInputs({ sections });

	const workflowId = computed(() => opts.workflowId.value);
	const projectId = computed(() => opts.projectId.value);
	const credentialFlow = computed(() => opts.credentialFlow.value);

	function goToStep(index: number) {
		if (index >= 0 && index < sections.value.length) {
			currentStepIndex.value = index;
		}
	}

	function goToNext() {
		if (currentStepIndex.value < sections.value.length - 1) {
			currentStepIndex.value++;
		}
	}

	function goToPrev() {
		if (currentStepIndex.value > 0) {
			currentStepIndex.value--;
		}
	}

	const actions = useWorkflowSetupActions({
		workflowId,
		requestId: opts.requestId,
		sections,
		activeSection,
		currentStepIndex,
		isReady: bootstrap.isReady,
		goToStep,
		inputs: {
			credentialSelections: inputsState.credentialSelections,
			isSectionComplete: inputsState.isSectionComplete,
			isSectionSkipped: inputsState.isSectionSkipped,
			isSectionHandled: inputsState.isSectionHandled,
			markSectionSkipped: inputsState.markSectionSkipped,
			buildCompletedSetupPayload: inputsState.buildCompletedSetupPayload,
		},
		applyMachine: {
			apply: applyMachine.apply,
			defer: applyMachine.defer,
		},
		thread,
	});

	// Clamp currentStepIndex when the section list shrinks beneath it.
	watch(
		() => sections.value.length,
		(len) => {
			if (currentStepIndex.value >= len) {
				currentStepIndex.value = Math.max(0, len - 1);
			}
		},
	);

	onMounted(async () => {
		await bootstrap.bootstrap();
	});

	const context: WorkflowSetupContext = {
		sections,
		currentStepIndex,
		activeSection,
		hasOtherUnhandledSteps: actions.hasOtherUnhandledSteps,
		canAdvanceToNextIncomplete: actions.canAdvanceToNextIncomplete,
		credentialSelections: inputsState.credentialSelections,
		terminalState: applyMachine.terminalState,
		isReady: bootstrap.isReady,
		workflowId,
		projectId,
		credentialFlow,
		isActionPending: actions.isActionPending,
		setCredential: inputsState.setCredential,
		setParameterValue: inputsState.setParameterValue,
		getDisplayNode: inputsState.getDisplayNode,
		isSectionComplete: inputsState.isSectionComplete,
		isCredentialTestFailed: inputsState.isCredentialTestFailed,
		isSectionSkipped: inputsState.isSectionSkipped,
		isSectionHandled: inputsState.isSectionHandled,
		goToStep,
		goToNext,
		goToPrev,
		goToNextIncomplete: actions.goToNextIncomplete,
		apply: actions.apply,
		skipCurrentStep: actions.skipCurrentStep,
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
