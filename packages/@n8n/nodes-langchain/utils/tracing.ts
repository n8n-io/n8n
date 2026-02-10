import type { BaseCallbackConfig } from '@langchain/core/callbacks/manager';
import type { IExecuteFunctions, ISupplyDataFunctions } from 'n8n-workflow';

interface TracingConfig {
	additionalMetadata?: Record<string, unknown>;
}

export function buildTracingMetadata(
	entries: Array<{ key: string; value: string }> | undefined,
): Record<string, string> {
	const additionalMetadata: Record<string, string> = {};

	for (const entry of entries ?? []) {
		const key = entry.key?.trim();
		if (!key) {
			continue;
		}
		if (entry.value === undefined || entry.value === '') {
			continue;
		}
		additionalMetadata[key] = entry.value;
	}

	return additionalMetadata;
}

export function getTracingConfig(
	context: IExecuteFunctions | ISupplyDataFunctions,
	config: TracingConfig = {},
): BaseCallbackConfig {
	const parentRunManager =
		'getParentCallbackManager' in context && context.getParentCallbackManager
			? context.getParentCallbackManager()
			: undefined;

	return {
		runName: `[${context.getWorkflow().name}] ${context.getNode().name}`,
		metadata: {
			execution_id: context.getExecutionId(),
			workflow: context.getWorkflow(),
			node: context.getNode().name,
			...(config.additionalMetadata ?? {}),
		},
		callbacks: parentRunManager,
	};
}
