/**
 * Canvas V2 Only
 * @TODO Remove this notice when Canvas V2 is the only one in use
 */

import { CanvasNodeKey } from '@/constants';
import { computed, inject } from 'vue';
import type { CanvasElementData } from '@/types';

export function useCanvasNode() {
	const node = inject(CanvasNodeKey);
	const data = computed<CanvasElementData>(
		() =>
			node?.data.value ?? {
				id: '',
				type: '',
				typeVersion: 1,
				disabled: false,
				inputs: [],
				outputs: [],
				connections: { input: {}, output: {} },
				issues: { items: [], visible: false },
				pinnedData: { count: 0, visible: false },
				execution: {
					running: false,
				},
				runData: { count: 0, visible: false },
				render: {
					type: 'default',
					options: {},
				},
			},
	);

	const label = computed(() => node?.label.value ?? '');

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

	const renderOptions = computed(() => data.value.render.options);

	return {
		node,
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
		renderOptions,
	};
}
