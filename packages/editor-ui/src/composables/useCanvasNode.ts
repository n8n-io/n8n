/**
 * Canvas V2 Only
 * @TODO Remove this notice when Canvas V2 is the only one in use
 */

import { CanvasNodeKey } from '@/constants';
import { computed, inject } from 'vue';
import type { CanvasNodeData } from '@/types';
import { CanvasNodeRenderType, CanvasConnectionMode } from '@/types';

export function useCanvasNode() {
	const node = inject(CanvasNodeKey);
	const data = computed<CanvasNodeData>(
		() =>
			node?.data.value ?? {
				id: '',
				name: '',
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
				runData: { count: 0, visible: false },
				render: {
					type: CanvasNodeRenderType.Default,
					options: {},
				},
			},
	);

	const id = computed(() => node?.id.value ?? '');
	const label = computed(() => node?.label.value ?? '');

	const name = computed(() => data.value.name);
	const inputs = computed(() => data.value.inputs);
	const outputs = computed(() => data.value.outputs);
	const connections = computed(() => data.value.connections);

	const isDisabled = computed(() => data.value.disabled);

	const isSelected = computed(() => node?.selected.value);

	const pinnedDataCount = computed(() => data.value.pinnedData.count);
	const hasPinnedData = computed(() => data.value.pinnedData.count > 0);

	const issues = computed(() => data.value.issues.items ?? []);
	const hasIssues = computed(() => data.value.issues.visible);

	const executionStatus = computed(() => data.value.execution.status);
	const executionWaiting = computed(() => data.value.execution.waiting);
	const executionRunning = computed(() => data.value.execution.running);

	const runDataCount = computed(() => data.value.runData.count);
	const hasRunData = computed(() => data.value.runData.visible);

	const render = computed(() => data.value.render);

	return {
		node,
		id,
		name,
		label,
		inputs,
		outputs,
		connections,
		isDisabled,
		isSelected,
		pinnedDataCount,
		hasPinnedData,
		runDataCount,
		hasRunData,
		issues,
		hasIssues,
		executionStatus,
		executionWaiting,
		executionRunning,
		render,
	};
}
