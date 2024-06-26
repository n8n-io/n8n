import type { CanvasElementData } from '@/types';
import type { MaybeRef } from 'vue';
import { computed, unref } from 'vue';
import { NodeConnectionType } from 'n8n-workflow';

export function useNodeConnections({
	inputs,
	outputs,
	connections,
}: {
	inputs: MaybeRef<CanvasElementData['inputs']>;
	outputs: MaybeRef<CanvasElementData['outputs']>;
	connections: MaybeRef<CanvasElementData['connections']>;
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
		() => unref(connections).input[NodeConnectionType.Main] ?? [],
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
		() => unref(connections).output[NodeConnectionType.Main] ?? [],
	);

	return {
		mainInputs,
		nonMainInputs,
		requiredNonMainInputs,
		mainInputConnections,
		mainOutputs,
		nonMainOutputs,
		mainOutputConnections,
	};
}
