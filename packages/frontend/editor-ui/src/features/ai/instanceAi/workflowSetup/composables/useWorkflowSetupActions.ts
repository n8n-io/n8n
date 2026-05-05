import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { useInstanceAiStore } from '../../instanceAi.store';
import type {
	WorkflowSetupApplyPayload,
	WorkflowSetupSection,
	WorkflowSetupStep,
} from '../workflowSetup.types';
import { getStepSections } from '../workflowSetup.helpers';
import type { CredentialSelectionsMap } from './useWorkflowSetupInputs';

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
	goToStep: (index: number) => void;
	inputs: WorkflowSetupInputAccessors;
	applyMachine: ApplyMachine;
	store: ReturnType<typeof useInstanceAiStore>;
}): WorkflowSetupActions {
	const telemetry = useTelemetry();
	const rootStore = useRootStore();

	const isActionPending = ref(false);

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
			deps.goToStep(nextUnhandledIndex.value);
		}
	}

	function trackSetupInput(): void {
		const tc = deps.store.findToolCallByRequestId(deps.requestId.value);
		const inputThreadId = tc?.confirmation?.inputThreadId ?? '';
		const provided: Array<{ label: string; options: string[]; option_chosen: string }> = [];
		const skipped: Array<{ label: string; options: string[] }> = [];
		const explicitlySkipped: Array<{ label: string; options: string[] }> = [];
		for (const section of deps.sections.value) {
			const label = section.credentialType ?? section.targetNodeName;
			if (deps.inputs.isSectionComplete(section)) {
				const optionChosen = section.credentialType
					? (deps.inputs.credentialSelections.value[section.targetNodeName]?.[
							section.credentialType
						] ?? '')
					: section.parameterNames.join(',');
				provided.push({
					label,
					options: [],
					option_chosen: optionChosen,
				});
			} else {
				skipped.push({ label, options: [] });
				if (deps.inputs.isSectionSkipped(section)) {
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
			num_tasks: deps.sections.value.length,
		});
	}

	async function apply(): Promise<void> {
		trackSetupInput();
		await deps.applyMachine.apply(deps.inputs.buildCompletedSetupPayload());
	}

	async function skipCurrentStep(): Promise<void> {
		if (isActionPending.value) return;
		const step = deps.activeStep.value;
		if (!step) return;

		isActionPending.value = true;
		try {
			// Skip only the incomplete sections in the active step. Already-complete
			// sections keep their input and continue to contribute to the apply
			// payload.
			const stepSections = getStepSections(step);
			for (const section of stepSections) {
				if (!deps.inputs.isSectionComplete(section)) {
					deps.inputs.markSectionSkipped(section);
				}
			}

			// Non-terminal: more steps still need handling — advance & wait.
			const next = nextUnhandledIndex.value;
			if (next >= 0) {
				deps.goToStep(next);
				return;
			}

			// Terminal: every step is now complete or skipped.
			trackSetupInput();
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
