import type { CanvasElementData } from '@/types';
import type { MaybeRef } from 'vue';
import { computed, unref } from 'vue';
import { NodeConnectionType } from 'n8n-workflow';

export function useNodeConnections({
	inputs,
	outputs,
}: {
	inputs: MaybeRef<CanvasElementData['inputs']>;
	outputs: MaybeRef<CanvasElementData['outputs']>;
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

	/**
	 * Outputs
	 */

	const mainOutputs = computed(() =>
		unref(outputs).filter((output) => output.type === NodeConnectionType.Main),
	);
	const nonMainOutputs = computed(() =>
		unref(outputs).filter((output) => output.type !== NodeConnectionType.Main),
	);

	return {
		mainInputs,
		nonMainInputs,
		requiredNonMainInputs,
		mainOutputs,
		nonMainOutputs,
	};
}
