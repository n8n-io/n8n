import type { CanvasNodeData } from '@/types';
import { CanvasConnectionMode } from '@/types';
import type { MaybeRef } from 'vue';
import { computed, unref } from 'vue';
import { NodeConnectionType } from 'n8n-workflow';
import type { Connection } from '@vue-flow/core';
import { parseCanvasConnectionHandleString } from '@/utils/canvasUtilsV2';

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
		unref(inputs).filter((input) => input.type === NodeConnectionType.Main),
	);

	const nonMainInputs = computed(() =>
		unref(inputs).filter((input) => input.type !== NodeConnectionType.Main),
	);

	const requiredNonMainInputs = computed(() =>
		nonMainInputs.value.filter((input) => input.required),
	);

	const mainInputConnections = computed(
		() => unref(connections)[CanvasConnectionMode.Input][NodeConnectionType.Main] ?? [],
	);

	/**
	 * Outputs
	 */

	const mainOutputs = computed(() =>
		unref(outputs).filter((output) => output.type === NodeConnectionType.Main),
	);

	const nonMainOutputs = computed(() =>
		unref(outputs).filter((output) => output.type !== NodeConnectionType.Main),
	);

	const mainOutputConnections = computed(
		() => unref(connections)[CanvasConnectionMode.Output][NodeConnectionType.Main] ?? [],
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

		const isSameNode = connection.source === connection.target;
		const isSameMode = sourceMode === targetMode;
		const isSameType = sourceType === targetType;

		return !isSameNode && !isSameMode && isSameType;
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
