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
import type {
	TerminalState,
	WorkflowSetupSection,
	WorkflowSetupStep,
} from '../workflowSetup.types';
import { getStepSections } from '../workflowSetup.helpers';
import { useWorkflowSetupActions } from './useWorkflowSetupActions';
import { useWorkflowSetupApply } from './useWorkflowSetupApply';
import { useWorkflowSetupBootstrap } from './useWorkflowSetupBootstrap';
import { useWorkflowSetupSections } from './useWorkflowSetupSections';
import { useWorkflowSetupSteps } from './useWorkflowSetupSteps';
import { useWorkflowSetupInputs, type CredentialSelectionsMap } from './useWorkflowSetupInputs';

export interface WorkflowSetupContext {
	sections: ComputedRef<WorkflowSetupSection[]>;
	steps: ComputedRef<WorkflowSetupStep[]>;
	currentStepIndex: Ref<number>;
	activeStep: ComputedRef<WorkflowSetupStep | undefined>;
	hasOtherUnhandledSteps: ComputedRef<boolean>;
	canAdvanceToNextIncomplete: ComputedRef<boolean>;
	credentialSelections: Ref<CredentialSelectionsMap>;
	terminalState: Ref<TerminalState | null>;
	isReady: Ref<boolean>;
	projectId: ComputedRef<string | undefined>;
	credentialFlow: ComputedRef<InstanceAiCredentialFlow | undefined>;
	isActionPending: Ref<boolean>;
	setCredential: (section: WorkflowSetupSection, credId: string | null) => void;
	setParameterValue: (section: WorkflowSetupSection, parameterName: string, value: unknown) => void;
	getDisplayNode: (section: WorkflowSetupSection) => INodeUi;
	isSectionComplete: (section: WorkflowSetupSection) => boolean;
	isCredentialTestFailed: (section: WorkflowSetupSection) => boolean;
	isSectionSkipped: (section: WorkflowSetupSection) => boolean;
	isStepComplete: (step: WorkflowSetupStep) => boolean;
	isStepSkipped: (step: WorkflowSetupStep) => boolean;
	isStepHandled: (step: WorkflowSetupStep) => boolean;
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
	const { steps } = useWorkflowSetupSteps({ sections, setupRequests: opts.setupRequests });
	const bootstrap = useWorkflowSetupBootstrap(opts.workflowId);
	const applyMachine = useWorkflowSetupApply({
		requestId: opts.requestId,
		thread,
	});

	const currentStepIndex = ref(0);
	const activeStep = computed(() => steps.value[currentStepIndex.value]);

	const inputsState = useWorkflowSetupInputs({ sections });

	const projectId = computed(() => opts.projectId.value);
	const credentialFlow = computed(() => opts.credentialFlow.value);

	function goToStep(index: number) {
		if (index >= 0 && index < steps.value.length) {
			currentStepIndex.value = index;
		}
	}

	function goToNext() {
		if (currentStepIndex.value < steps.value.length - 1) {
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
		sections,
		steps,
		activeStep,
		currentStepIndex,
		isReady: bootstrap.isReady,
		goToStep,
		inputs: {
			credentialSelections: inputsState.credentialSelections,
			isSectionComplete: inputsState.isSectionComplete,
			isSectionSkipped: inputsState.isSectionSkipped,
			markSectionSkipped: inputsState.markSectionSkipped,
			buildCompletedSetupPayload: inputsState.buildCompletedSetupPayload,
		},
		applyMachine: {
			apply: applyMachine.apply,
			defer: applyMachine.defer,
		},
		thread,
	});

	function isStepComplete(step: WorkflowSetupStep): boolean {
		const stepSections = getStepSections(step);
		if (stepSections.length === 0) return false;
		return stepSections.every(inputsState.isSectionComplete);
	}

	function isStepSkipped(step: WorkflowSetupStep): boolean {
		const stepSections = getStepSections(step);
		if (stepSections.length === 0) return false;
		return stepSections.every(inputsState.isSectionSkipped);
	}

	// Clamp currentStepIndex when the step list shrinks beneath it.
	watch(
		() => steps.value.length,
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
		steps,
		currentStepIndex,
		activeStep,
		hasOtherUnhandledSteps: actions.hasOtherUnhandledSteps,
		canAdvanceToNextIncomplete: actions.canAdvanceToNextIncomplete,
		credentialSelections: inputsState.credentialSelections,
		terminalState: applyMachine.terminalState,
		isReady: bootstrap.isReady,
		projectId,
		credentialFlow,
		isActionPending: actions.isActionPending,
		setCredential: inputsState.setCredential,
		setParameterValue: inputsState.setParameterValue,
		getDisplayNode: inputsState.getDisplayNode,
		isSectionComplete: inputsState.isSectionComplete,
		isCredentialTestFailed: inputsState.isCredentialTestFailed,
		isSectionSkipped: inputsState.isSectionSkipped,
		isStepComplete,
		isStepSkipped,
		isStepHandled: actions.isStepHandled,
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
