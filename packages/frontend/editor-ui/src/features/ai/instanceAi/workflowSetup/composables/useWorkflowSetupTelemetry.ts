import { watch, type ComputedRef, type Ref } from 'vue';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useInstanceAiSetupPanelExperiment } from '@/experiments/instanceAiSetupPanel/useInstanceAiSetupPanelExperiment';
import type { ThreadRuntime } from '../../instanceAi.store';
import type { WorkflowSetupSection } from '../workflowSetup.types';

type ProvidedSetupInput = { label: string; options: string[]; option_chosen: string };
type SkippedSetupInput = { label: string; options: string[] };
type SetupStepOutcome = 'completed' | 'skipped';

type WorkflowSetupStepTelemetryInput = {
	input_type: 'credential' | 'parameter';
	node_type: string;
	credential_type?: string;
	parameter_name?: string;
};

type WorkflowSetupStepTelemetryPayload = {
	session_id: string;
	workflow_id?: string;
	thread_id: string;
	input_thread_id: string;
	instance_id: string;
	type: 'setup';
	request_id: string;
	step_index: number;
	step_count: number;
	setup_inputs: WorkflowSetupStepTelemetryInput[];
	outcome?: SetupStepOutcome;
};

type SetupTelemetryContext = Pick<
	WorkflowSetupStepTelemetryPayload,
	'session_id' | 'workflow_id' | 'thread_id' | 'input_thread_id' | 'instance_id' | 'type'
>;

interface WorkflowSetupTelemetryInputAccessors {
	isSectionComplete: (section: WorkflowSetupSection) => boolean;
	isSectionSkipped: (section: WorkflowSetupSection) => boolean;
}

export function useWorkflowSetupTelemetry(deps: {
	requestId: Ref<string>;
	workflowId?: Ref<string | undefined>;
	sections: ComputedRef<WorkflowSetupSection[]>;
	activeSection: ComputedRef<WorkflowSetupSection | undefined>;
	isReady: Ref<boolean>;
	inputs: WorkflowSetupTelemetryInputAccessors;
	thread: ThreadRuntime;
}) {
	const telemetry = useTelemetry();
	const rootStore = useRootStore();
	const { getTelemetryPayload } = useInstanceAiSetupPanelExperiment();

	const shownStepKeys = new Set<string>();
	const handledStepKeys = new Set<string>();

	function getSetupTelemetryContext(): SetupTelemetryContext {
		const tc = deps.thread.findToolCallByRequestId(deps.requestId.value);
		return {
			...getTelemetryPayload(),
			session_id: rootStore.pushRef,
			workflow_id: deps.workflowId?.value,
			thread_id: deps.thread.id,
			input_thread_id: tc?.confirmation?.inputThreadId ?? '',
			instance_id: rootStore.instanceId,
			type: 'setup',
		};
	}

	function getTrackingStepKey(section: WorkflowSetupSection): string {
		return `${deps.requestId.value}:${section.id}`;
	}

	function getStepOutcome(section: WorkflowSetupSection): SetupStepOutcome | undefined {
		if (deps.inputs.isSectionComplete(section)) return 'completed';
		if (deps.inputs.isSectionSkipped(section)) return 'skipped';
		return undefined;
	}

	function getStepTelemetryInputs(
		section: WorkflowSetupSection,
	): WorkflowSetupStepTelemetryInput[] {
		const inputs: WorkflowSetupStepTelemetryInput[] = [];
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
		return inputs;
	}

	function getStepTelemetryPayload(
		section: WorkflowSetupSection,
		outcome?: SetupStepOutcome,
	): WorkflowSetupStepTelemetryPayload {
		return {
			...getSetupTelemetryContext(),
			request_id: deps.requestId.value,
			step_index: deps.sections.value.indexOf(section) + 1,
			step_count: deps.sections.value.length,
			setup_inputs: getStepTelemetryInputs(section),
			...(outcome ? { outcome } : {}),
		};
	}

	function trackStepShown(section: WorkflowSetupSection): void {
		const stepKey = getTrackingStepKey(section);
		if (shownStepKeys.has(stepKey)) return;
		shownStepKeys.add(stepKey);
		telemetry.track('Instance AI workflow setup step shown', getStepTelemetryPayload(section));
	}

	function trackStepHandled(section: WorkflowSetupSection): void {
		const stepKey = getTrackingStepKey(section);
		if (!shownStepKeys.has(stepKey) || handledStepKeys.has(stepKey)) return;

		const outcome = getStepOutcome(section);
		if (!outcome) return;

		handledStepKeys.add(stepKey);
		telemetry.track(
			'Instance AI workflow setup step handled',
			getStepTelemetryPayload(section, outcome),
		);
	}

	// A primitive source so the callback only runs when the active section or
	// its outcome changes, not on every unrelated reactive tick. The source is
	// undefined until bootstrap finishes: the wizard is not on screen yet and
	// parameter completeness is unknown before node types load.
	watch(
		() => {
			const section = deps.isReady.value ? deps.activeSection.value : undefined;
			if (!section) return undefined;
			return `${getTrackingStepKey(section)}:${getStepOutcome(section) ?? 'pending'}`;
		},
		(trackedKey) => {
			const section = deps.activeSection.value;
			if (trackedKey === undefined || !section) return;
			trackStepShown(section);
			trackStepHandled(section);
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
