import type {
	CanvasConnectionPort,
	CanvasNodeData,
} from '@/features/workflows/canvas/canvas.types';
import {
	CANVAS_NODE_GROUP_HANDLE_LEFT,
	CANVAS_NODE_GROUP_HANDLE_RIGHT,
	CanvasConnectionMode,
} from '@/features/workflows/canvas/canvas.types';
import type { MaybeRef } from 'vue';
import { computed, unref } from 'vue';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { Connection } from '@vue-flow/core';
import { parseCanvasConnectionHandleString } from '@/features/workflows/canvas/canvas.utils';

export function useNodeConnections({
	inputs,
	outputs,
	connections,
}: {
	inputs: MaybeRef<CanvasConnectionPort[]>;
	outputs: MaybeRef<CanvasConnectionPort[]>;
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
		// Collapsed group edges use the group's visual left/right handles. They
		// represent the canonical main input/output ports for validation.
		const sourceGroupHandle = connection.sourceHandle === CANVAS_NODE_GROUP_HANDLE_RIGHT;
		const targetGroupHandle = connection.targetHandle === CANVAS_NODE_GROUP_HANDLE_LEFT;
		const { type: parsedSourceType, mode: parsedSourceMode } = parseCanvasConnectionHandleString(
			connection.sourceHandle,
		);
		const { type: parsedTargetType, mode: parsedTargetMode } = parseCanvasConnectionHandleString(
			connection.targetHandle,
		);
		const sourceType = sourceGroupHandle ? NodeConnectionTypes.Main : parsedSourceType;
		const sourceMode = sourceGroupHandle ? CanvasConnectionMode.Output : parsedSourceMode;
		const targetType = targetGroupHandle ? NodeConnectionTypes.Main : parsedTargetType;
		const targetMode = targetGroupHandle ? CanvasConnectionMode.Input : parsedTargetMode;

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
