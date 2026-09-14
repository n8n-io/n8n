import { computed, ref, type ComputedRef, type Ref } from 'vue';
import type { ThreadRuntime } from '../../instanceAi.store';
import type {
	WorkflowSetupApplyPayload,
	WorkflowSetupSection,
	WorkflowSetupStep,
} from '../workflowSetup.types';
import { getStepSections } from '../workflowSetup.helpers';
import type { CredentialSelectionsMap } from './useWorkflowSetupInputs';
import { useWorkflowSetupTelemetry } from './useWorkflowSetupTelemetry';

interface WorkflowSetupInputAccessors {
	credentialSelections: Ref<CredentialSelectionsMap>;
	isSectionComplete: (section: WorkflowSetupSection) => boolean;
	isSectionSkipped: (section: WorkflowSetupSection) => boolean;
	markSectionSkipped: (section: WorkflowSetupSection) => void;
	buildCompletedSetupPayload: () => WorkflowSetupApplyPayload;
}

interface ApplyMachine {
	apply: (payload: WorkflowSetupApplyPayload) => Promise<void>;
	defer: () => Promise<void>;
}

export interface WorkflowSetupActions {
	nextUnhandledIndex: ComputedRef<number>;
	hasOtherUnhandledSteps: ComputedRef<boolean>;
	canAdvanceToNextIncomplete: ComputedRef<boolean>;
	isStepHandled: (step: WorkflowSetupStep) => boolean;
	isActionPending: Ref<boolean>;
	apply: () => Promise<void>;
	skipCurrentStep: () => Promise<void>;
	goToNextIncomplete: () => void;
}

export function useWorkflowSetupActions(deps: {
	requestId: Ref<string>;
	sections: ComputedRef<WorkflowSetupSection[]>;
	steps: ComputedRef<WorkflowSetupStep[]>;
	activeStep: ComputedRef<WorkflowSetupStep | undefined>;
	currentStepIndex: Ref<number>;
	isReady: Ref<boolean>;
	goToStep: (index: number) => void;
	inputs: WorkflowSetupInputAccessors;
	applyMachine: ApplyMachine;
	thread: ThreadRuntime;
}): WorkflowSetupActions {
	const isActionPending = ref(false);
	const workflowSetupTelemetry = useWorkflowSetupTelemetry({
		requestId: deps.requestId,
		sections: deps.sections,
		steps: deps.steps,
		activeStep: deps.activeStep,
		currentStepIndex: deps.currentStepIndex,
		isReady: deps.isReady,
		inputs: {
			isSectionComplete: deps.inputs.isSectionComplete,
			isSectionSkipped: deps.inputs.isSectionSkipped,
		},
		thread: deps.thread,
	});

	function isStepHandled(step: WorkflowSetupStep): boolean {
		const sections = getStepSections(step);
		if (sections.length === 0) return true;
		return sections.every(
			(section) => deps.inputs.isSectionComplete(section) || deps.inputs.isSectionSkipped(section),
		);
	}

	/**
	 * Globally find the first unhandled step. Prefer indices after the current
	 * step; fall back to indices before. Returns -1 if every step is handled.
	 */
	const nextUnhandledIndex = computed(() => {
		const steps = deps.steps.value;
		const current = deps.currentStepIndex.value;
		for (let i = current + 1; i < steps.length; i++) {
			if (!isStepHandled(steps[i])) return i;
		}
		for (let i = 0; i < Math.min(current, steps.length); i++) {
			if (!isStepHandled(steps[i])) return i;
		}
		return -1;
	});

	const hasOtherUnhandledSteps = computed(() => nextUnhandledIndex.value >= 0);

	const canAdvanceToNextIncomplete = computed(() => {
		const step = deps.activeStep.value;
		return step !== undefined && isStepHandled(step) && nextUnhandledIndex.value >= 0;
	});

	function goToNextIncomplete(): void {
		if (canAdvanceToNextIncomplete.value) {
			const step = deps.activeStep.value;
			if (step) workflowSetupTelemetry.trackStepHandled(step);
			deps.goToStep(nextUnhandledIndex.value);
		}
	}

	async function apply(): Promise<void> {
		const step = deps.activeStep.value;
		if (step) workflowSetupTelemetry.trackStepHandled(step);
		workflowSetupTelemetry.trackSetupInput();
		await deps.applyMachine.apply(deps.inputs.buildCompletedSetupPayload());
	}

	async function skipCurrentStep(): Promise<void> {
		if (isActionPending.value) return;
		const step = deps.activeStep.value;
		if (!step) return;

		isActionPending.value = true;
		try {
			// Skipping the active step only marks its incomplete sections — already-
			// complete sections still contribute to the apply payload.
			const stepSections = getStepSections(step);
			for (const section of stepSections) {
				if (!deps.inputs.isSectionComplete(section)) {
					deps.inputs.markSectionSkipped(section);
				}
			}
			workflowSetupTelemetry.trackStepHandled(step);

			const next = nextUnhandledIndex.value;
			if (next >= 0) {
				deps.goToStep(next);
				return;
			}

			workflowSetupTelemetry.trackSetupInput();
			const completedPayload = deps.inputs.buildCompletedSetupPayload();
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
		hasOtherUnhandledSteps,
		canAdvanceToNextIncomplete,
		isStepHandled,
		isActionPending,
		apply,
		skipCurrentStep,
		goToNextIncomplete,
	};
}
