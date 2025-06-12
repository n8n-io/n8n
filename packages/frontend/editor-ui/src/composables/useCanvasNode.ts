import { CanvasNodeKey } from '@/constants';
import { computed, inject } from 'vue';
import type { CanvasNodeData } from '@/types';
import { CanvasNodeRenderType, CanvasConnectionMode } from '@/types';

export function useCanvasNode() {
	const node = inject(CanvasNodeKey);
	const data = computed(
		() =>
			node?.data.value ??
			({
				id: '',
				name: '',
				subtitle: '',
				type: '',
				typeVersion: 1,
				disabled: false,
				inputs: [],
				outputs: [],
				connections: { [CanvasConnectionMode.Input]: {}, [CanvasConnectionMode.Output]: {} },
				issues: { items: [], visible: false },
				pinnedData: { count: 0, visible: false },
				execution: {
					running: false,
				},
				runData: { iterations: 0, outputMap: {}, visible: false },
				render: {
					type: CanvasNodeRenderType.Default,
					options: {},
				},
			} satisfies CanvasNodeData),
	);

	const id = computed(() => node?.id.value ?? '');
	const label = computed(() => node?.label.value ?? '');

	const subtitle = computed(() => data.value.subtitle);
	const name = computed(() => data.value.name);
	const inputs = computed(() => data.value.inputs);
	const outputs = computed(() => data.value.outputs);
	const connections = computed(() => data.value.connections);

	const isDisabled = computed(() => data.value.disabled);
	const isReadOnly = computed(() => node?.readOnly.value);
	const isSelected = computed(() => node?.selected.value);

	const pinnedDataCount = computed(() => data.value.pinnedData.count);
	const hasPinnedData = computed(() => data.value.pinnedData.count > 0);

	const issues = computed(() => data.value.issues.items ?? []);
	const hasIssues = computed(() => data.value.issues.visible);

	const executionStatus = computed(() => data.value.execution.status);
	const executionWaiting = computed(() => data.value.execution.waiting);
	const executionWaitingForNext = computed(() => data.value.execution.waitingForNext);
	const executionRunning = computed(() => data.value.execution.running);

	const runDataOutputMap = computed(() => data.value.runData.outputMap);
	const runDataIterations = computed(() => data.value.runData.iterations);
	const hasRunData = computed(() => data.value.runData.visible);

	const render = computed(() => data.value.render);

	const eventBus = computed(() => node?.eventBus.value);

	return {
		node,
		id,
		name,
		label,
		subtitle,
		inputs,
		outputs,
		connections,
		isDisabled,
		isReadOnly,
		isSelected,
		pinnedDataCount,
		hasPinnedData,
		runDataIterations,
		runDataOutputMap,
		hasRunData,
		issues,
		hasIssues,
		executionStatus,
		executionWaiting,
		executionWaitingForNext,
		executionRunning,
		render,
		eventBus,
	};
}
