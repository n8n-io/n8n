import type { CanvasNodeData } from '@/types';
import { CanvasConnectionMode } from '@/types';
import type { MaybeRef } from 'vue';
import { computed, unref } from 'vue';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { Connection } from '@vue-flow/core';
import { parseCanvasConnectionHandleString } from '@/utils/canvasUtils';

export function useNodeConnections({
	inputs,
	outputs,
	connections,
}: {
	inputs: MaybeRef<CanvasNodeData['inputs']>;
	outputs: MaybeRef<CanvasNodeData['outputs']>;
	connections: MaybeRef<CanvasNodeData['connections']>;
}) {
	/**
	 * Inputs
	 */

	const mainInputs = computed(() =>
		unref(inputs).filter((input) => input.type === NodeConnectionTypes.Main),
	);

	const nonMainInputs = computed(() =>
		unref(inputs).filter((input) => input.type !== NodeConnectionTypes.Main),
	);

	const requiredNonMainInputs = computed(() =>
		nonMainInputs.value.filter((input) => input.required),
	);

	const mainInputConnections = computed(
		() => unref(connections)[CanvasConnectionMode.Input][NodeConnectionTypes.Main] ?? [],
	);

	/**
	 * Outputs
	 */

	const mainOutputs = computed(() =>
		unref(outputs).filter((output) => output.type === NodeConnectionTypes.Main),
	);

	const nonMainOutputs = computed(() =>
		unref(outputs).filter((output) => output.type !== NodeConnectionTypes.Main),
	);

	const mainOutputConnections = computed(
		() => unref(connections)[CanvasConnectionMode.Output][NodeConnectionTypes.Main] ?? [],
	);

	/**
	 * Connection validation
	 */

	function isValidConnection(connection: Connection) {
		const { type: sourceType, mode: sourceMode } = parseCanvasConnectionHandleString(
			connection.sourceHandle,
		);
		const { type: targetType, mode: targetMode } = parseCanvasConnectionHandleString(
			connection.targetHandle,
		);

		const isSameMode = sourceMode === targetMode;
		const isSameType = sourceType === targetType;

		return !isSameMode && isSameType;
	}

	return {
		mainInputs,
		nonMainInputs,
		requiredNonMainInputs,
		mainInputConnections,
		mainOutputs,
		nonMainOutputs,
		mainOutputConnections,
		isValidConnection,
	};
}
