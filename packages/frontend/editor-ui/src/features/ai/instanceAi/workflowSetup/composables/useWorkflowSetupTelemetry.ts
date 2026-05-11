import { watch, type ComputedRef, type Ref } from 'vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { ThreadRuntime } from '../../instanceAi.store';
import type { WorkflowSetupSection, WorkflowSetupStep } from '../workflowSetup.types';
import { getStepSections } from '../workflowSetup.helpers';

type ProvidedSetupInput = { label: string; options: string[]; option_chosen: string };
type SkippedSetupInput = { label: string; options: string[] };
type SetupStepOutcome = 'completed' | 'skipped' | 'mixed';

type WorkflowSetupStepTelemetryInput = {
	input_type: 'credential' | 'parameter';
	node_type: string;
	credential_type?: string;
	parameter_name?: string;
};

type WorkflowSetupStepTelemetryPayload = {
	thread_id: string;
	input_thread_id: string;
	instance_id: string;
	type: 'setup';
	request_id: string;
	step_index: number;
	step_count: number;
	step_kind: WorkflowSetupStep['kind'];
	setup_inputs: WorkflowSetupStepTelemetryInput[];
	outcome?: SetupStepOutcome;
};

type SetupTelemetryContext = Pick<
	WorkflowSetupStepTelemetryPayload,
	'thread_id' | 'input_thread_id' | 'instance_id' | 'type'
>;

interface WorkflowSetupTelemetryInputAccessors {
	isSectionComplete: (section: WorkflowSetupSection) => boolean;
	isSectionSkipped: (section: WorkflowSetupSection) => boolean;
}

export function useWorkflowSetupTelemetry(deps: {
	requestId: Ref<string>;
	sections: ComputedRef<WorkflowSetupSection[]>;
	steps: ComputedRef<WorkflowSetupStep[]>;
	activeStep: ComputedRef<WorkflowSetupStep | undefined>;
	currentStepIndex: Ref<number>;
	isReady: Ref<boolean>;
	inputs: WorkflowSetupTelemetryInputAccessors;
	thread: ThreadRuntime;
}) {
	const telemetry = useTelemetry();
	const rootStore = useRootStore();

	const shownStepKeys = new Set<string>();
	const handledStepKeys = new Set<string>();

	function getSetupTelemetryContext(): SetupTelemetryContext {
		const tc = deps.thread.findToolCallByRequestId(deps.requestId.value);
		return {
			thread_id: deps.thread.currentThreadId,
			input_thread_id: tc?.confirmation?.inputThreadId ?? '',
			instance_id: rootStore.instanceId,
			type: 'setup',
		};
	}

	function getStepKey(step: WorkflowSetupStep): string {
		const inputKeys = getStepTelemetryInputs(step).map(
			(input) =>
				`${input.input_type}:${input.node_type}:${input.credential_type ?? input.parameter_name}`,
		);
		return `${step.kind}:${deps.steps.value.indexOf(step)}:${inputKeys.join('|')}`;
	}

	function getTrackingStepKey(step: WorkflowSetupStep): string {
		return `${deps.requestId.value}:${getStepKey(step)}`;
	}

	function getStepOutcome(step: WorkflowSetupStep): SetupStepOutcome | undefined {
		const sections = getStepSections(step);
		if (sections.length === 0) return undefined;

		let completedCount = 0;
		let skippedCount = 0;
		for (const section of sections) {
			if (deps.inputs.isSectionComplete(section)) {
				completedCount++;
			} else if (deps.inputs.isSectionSkipped(section)) {
				skippedCount++;
			}
		}

		if (completedCount + skippedCount !== sections.length) return undefined;
		if (completedCount === sections.length) return 'completed';
		if (skippedCount === sections.length) return 'skipped';
		return 'mixed';
	}

	function getStepTelemetryInputs(step: WorkflowSetupStep): WorkflowSetupStepTelemetryInput[] {
		const inputs: WorkflowSetupStepTelemetryInput[] = [];
		for (const section of getStepSections(step)) {
			if (section.credentialType) {
				inputs.push({
					input_type: 'credential',
					node_type: section.node.type,
					credential_type: section.credentialType,
				});
			}

			for (const parameterName of section.parameterNames) {
				inputs.push({
					input_type: 'parameter',
					node_type: section.node.type,
					parameter_name: parameterName,
				});
			}
		}
		return inputs;
	}

	function getStepTelemetryPayload(
		step: WorkflowSetupStep,
		outcome?: SetupStepOutcome,
	): WorkflowSetupStepTelemetryPayload {
		return {
			...getSetupTelemetryContext(),
			request_id: deps.requestId.value,
			step_index: deps.steps.value.indexOf(step) + 1,
			step_count: deps.steps.value.length,
			step_kind: step.kind,
			setup_inputs: getStepTelemetryInputs(step),
			...(outcome ? { outcome } : {}),
		};
	}

	function trackStepShown(step: WorkflowSetupStep): void {
		const stepKey = getTrackingStepKey(step);
		if (shownStepKeys.has(stepKey)) return;
		shownStepKeys.add(stepKey);
		telemetry.track('Instance AI workflow setup step shown', getStepTelemetryPayload(step));
	}

	function trackStepHandled(step: WorkflowSetupStep): void {
		const stepKey = getTrackingStepKey(step);
		if (!shownStepKeys.has(stepKey) || handledStepKeys.has(stepKey)) return;

		const outcome = getStepOutcome(step);
		if (!outcome) return;

		handledStepKeys.add(stepKey);
		telemetry.track(
			'Instance AI workflow setup step handled',
			getStepTelemetryPayload(step, outcome),
		);
	}

	watch(
		() => {
			const step = deps.isReady.value ? deps.activeStep.value : undefined;
			if (!step) return undefined;

			return {
				step,
				key: getTrackingStepKey(step),
				index: deps.currentStepIndex.value,
				count: deps.steps.value.length,
				states: getStepSections(step).map((section) => ({
					isComplete: deps.inputs.isSectionComplete(section),
					isSkipped: deps.inputs.isSectionSkipped(section),
				})),
			};
		},
		(snapshot) => {
			if (!snapshot) return;
			trackStepShown(snapshot.step);
			trackStepHandled(snapshot.step);
		},
		{ immediate: true },
	);

	function trackSetupInput(): void {
		const provided: ProvidedSetupInput[] = [];
		const skipped: SkippedSetupInput[] = [];
		const explicitlySkipped: SkippedSetupInput[] = [];
		for (const section of deps.sections.value) {
			const sectionInputs = getSectionTelemetryInputs(section);
			if (deps.inputs.isSectionComplete(section)) {
				provided.push(...sectionInputs);
			} else {
				const skippedInputs = sectionInputs.map(toSkippedInput);
				skipped.push(...skippedInputs);
				if (deps.inputs.isSectionSkipped(section)) {
					explicitlySkipped.push(...skippedInputs);
				}
			}
		}
		telemetry.track('User finished providing input', {
			...getSetupTelemetryContext(),
			provided_inputs: provided,
			skipped_inputs: skipped,
			explicitly_skipped_inputs: explicitlySkipped,
			num_tasks: deps.sections.value.length,
		});
	}

	function getSectionTelemetryInputs(section: WorkflowSetupSection): ProvidedSetupInput[] {
		const inputs: ProvidedSetupInput[] = [];
		if (section.credentialType) {
			inputs.push({
				label: getSetupInputLabel(section.node.type, section.credentialType),
				options: [],
				option_chosen: 'true',
			});
		}
		for (const parameterName of section.parameterNames) {
			inputs.push({
				label: getSetupInputLabel(section.node.type, parameterName),
				options: [],
				option_chosen: 'true',
			});
		}
		return inputs;
	}

	function getSetupInputLabel(nodeType: string, inputName: string): string {
		return `${nodeType} - ${inputName}`;
	}

	function toSkippedInput(input: ProvidedSetupInput): SkippedSetupInput {
		return { label: input.label, options: input.options };
	}

	return {
		trackSetupInput,
		trackStepHandled,
	};
}
