import { computed, ref, type ComputedRef, type Ref } from 'vue';
import type { ThreadRuntime } from '../../instanceAi.store';
import type { WorkflowSetupApplyPayload, WorkflowSetupSection } from '../workflowSetup.types';
import type { CredentialSelectionsMap } from './useWorkflowSetupInputs';
import { useWorkflowSetupTelemetry } from './useWorkflowSetupTelemetry';

interface WorkflowSetupInputAccessors {
	credentialSelections: Ref<CredentialSelectionsMap>;
	isSectionComplete: (section: WorkflowSetupSection) => boolean;
	isSectionSkipped: (section: WorkflowSetupSection) => boolean;
	isSectionHandled: (section: WorkflowSetupSection) => boolean;
	markSectionSkipped: (section: WorkflowSetupSection) => void;
	buildCompletedSetupPayload: () => WorkflowSetupApplyPayload;
}

interface ApplyMachine {
	apply: (payload: WorkflowSetupApplyPayload) => Promise<Record<string, unknown> | undefined>;
	defer: () => Promise<void>;
}

export interface WorkflowSetupActions {
	nextUnhandledIndex: ComputedRef<number>;
	hasOtherUnhandledSteps: ComputedRef<boolean>;
	canAdvanceToNextIncomplete: ComputedRef<boolean>;
	isActionPending: Ref<boolean>;
	apply: () => Promise<void>;
	skipCurrentStep: () => Promise<void>;
	goToNextIncomplete: () => void;
}

export function useWorkflowSetupActions(deps: {
	requestId: Ref<string>;
	workflowId?: Ref<string | undefined>;
	sections: ComputedRef<WorkflowSetupSection[]>;
	activeSection: ComputedRef<WorkflowSetupSection | undefined>;
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
		workflowId: deps.workflowId,
		sections: deps.sections,
		activeSection: deps.activeSection,
		isReady: deps.isReady,
		inputs: {
			isSectionComplete: deps.inputs.isSectionComplete,
			isSectionSkipped: deps.inputs.isSectionSkipped,
		},
		thread: deps.thread,
	});

	/**
	 * Globally find the first unhandled step. Prefer indices after the current
	 * step; fall back to indices before. Returns -1 if every step is handled.
	 */
	const nextUnhandledIndex = computed(() => {
		const sections = deps.sections.value;
		const { isSectionHandled } = deps.inputs;
		const current = deps.currentStepIndex.value;
		for (let i = current + 1; i < sections.length; i++) {
			if (!isSectionHandled(sections[i])) return i;
		}
		for (let i = 0; i < Math.min(current, sections.length); i++) {
			if (!isSectionHandled(sections[i])) return i;
		}
		return -1;
	});

	const hasOtherUnhandledSteps = computed(() => nextUnhandledIndex.value >= 0);

	const canAdvanceToNextIncomplete = computed(() => {
		const section = deps.activeSection.value;
		return (
			section !== undefined &&
			deps.inputs.isSectionHandled(section) &&
			nextUnhandledIndex.value >= 0
		);
	});

	function goToNextIncomplete(): void {
		if (canAdvanceToNextIncomplete.value) {
			const section = deps.activeSection.value;
			if (section) workflowSetupTelemetry.trackStepHandled(section);
			deps.goToStep(nextUnhandledIndex.value);
		}
	}

	async function apply(): Promise<void> {
		const section = deps.activeSection.value;
		if (section) workflowSetupTelemetry.trackStepHandled(section);
		workflowSetupTelemetry.trackSetupInput();
		const result = await deps.applyMachine.apply(deps.inputs.buildCompletedSetupPayload());
		if (result) workflowSetupTelemetry.trackSetupSaved(result);
	}

	async function skipCurrentStep(): Promise<void> {
		if (isActionPending.value) return;
		const section = deps.activeSection.value;
		if (!section) return;

		isActionPending.value = true;
		try {
			// Skipping only marks an incomplete section — an already-complete one
			// still contributes to the apply payload.
			if (!deps.inputs.isSectionComplete(section)) {
				deps.inputs.markSectionSkipped(section);
			}
			workflowSetupTelemetry.trackStepHandled(section);

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
				const result = await deps.applyMachine.apply(completedPayload);
				if (result) workflowSetupTelemetry.trackSetupSaved(result);
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
		isActionPending,
		apply,
		skipCurrentStep,
		goToNextIncomplete,
	};
}
