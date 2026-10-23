import { watch, type ComputedRef, type Ref } from 'vue';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT, type InferTelemetryProps } from '@n8n/telemetry';
import { isRecord } from '@n8n/utils/is-record';
import { useInstanceAiSetupPanelExperiment } from '@/experiments/instanceAiSetupPanel/useInstanceAiSetupPanelExperiment';
import type { ThreadRuntime } from '../../instanceAi.store';
import type { WorkflowSetupSection } from '../workflowSetup.types';

type ProvidedSetupInput = { label: string; options: string[]; option_chosen: string };
type SkippedSetupInput = { label: string; options: string[] };
type SetupStepOutcome = 'completed' | 'skipped';

type WorkflowSetupStepTelemetryInput = {
	node_ids: string[];
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
				node_ids: section.credentialTargetNodes.map((node) => node.id),
				input_type: 'credential',
				node_type: section.node.type,
				credential_type: section.credentialType,
			});
		}

		for (const parameterName of section.parameterNames) {
			inputs.push({
				node_ids: [section.node.id],
				input_type: 'parameter',
				node_type: section.node.type,
				parameter_name: parameterName,
			});
		}
		return inputs;
	}

	function trackSetupSaved(result: Record<string, unknown>): void {
		const workflowId = deps.workflowId?.value;
		if (!workflowId || result.success !== true) return;
		const report = (value: unknown) => (Array.isArray(value) ? value.filter(isRecord) : []);
		const completedNodes = report(result.completedNodes);
		if (!completedNodes.length) return;
		const failedNodes = new Set(report(result.failedNodes).map((node) => node.nodeName));
		const pendingNodes = report(result.nodesStillNeedingSetup);
		const savedNodes = report(result.updatedNodes);
		const items: InferTelemetryProps<typeof TELEMETRY_EVENT.WORKFLOW.SETUP_SAVED>['items'] = [];
		const parameters = new Set<string>();
		for (const section of deps.sections.value) {
			if (section.credentialType) {
				for (const node of section.credentialTargetNodes) {
					const savedNode = savedNodes.find((saved) => saved.id === node.id);
					const credential = isRecord(savedNode?.credentials)
						? savedNode.credentials[section.credentialType]
						: undefined;
					items.push({
						node_id: node.id,
						node_type: node.type,
						kind: 'credential',
						credential_type: section.credentialType,
						completed:
							!failedNodes.has(node.name) &&
							(completedNodes.some(
								(completed) =>
									completed.nodeName === node.name &&
									completed.credentialType === section.credentialType,
							) ||
								(isRecord(credential) &&
									((typeof credential.id === 'string' && credential.id.length > 0) ||
										credential.__aiGatewayManaged === true))),
					});
				}
			}
			for (const parameterName of section.parameterNames) {
				const key = JSON.stringify([section.node.id, parameterName]);
				if (parameters.has(key)) continue;
				parameters.add(key);
				items.push({
					node_id: section.node.id,
					node_type: section.node.type,
					kind: 'parameter',
					parameter_name: parameterName,
					completed:
						!failedNodes.has(section.node.name) &&
						!pendingNodes.some(
							(pending) =>
								pending.nodeName === section.node.name &&
								isRecord(pending.parameterIssues) &&
								Object.hasOwn(pending.parameterIssues, parameterName),
						) &&
						completedNodes.some(
							(completed) =>
								completed.nodeName === section.node.name &&
								Array.isArray(completed.parametersSet) &&
								completed.parametersSet.includes(parameterName),
						),
				});
			}
		}
		if (!items.some((item) => item.completed)) return;
		telemetry.track(TELEMETRY_EVENT.WORKFLOW.SETUP_SAVED, {
			...getTelemetryPayload(),
			instance_id: rootStore.instanceId,
			workflow_id: workflowId,
			thread_id: deps.thread.id,
			session_id: rootStore.pushRef,
			source: 'instance_ai_setup_wizard',
			request_id: deps.requestId.value,
			items,
			setup_complete:
				(result.partial === undefined || result.partial === false) &&
				[result.failedNodes, result.nodesStillNeedingSetup, result.skippedByUser].every(
					(value) => value === undefined || (Array.isArray(value) && value.length === 0),
				) &&
				items.every((item) => item.completed),
		});
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
		trackSetupSaved,
	};
}
