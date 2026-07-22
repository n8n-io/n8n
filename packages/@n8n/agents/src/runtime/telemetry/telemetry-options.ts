import type { TelemetrySettings } from 'ai';

import type { BuiltTelemetry } from '../../types/telemetry';

/**
 * Map a resolved BuiltTelemetry to the AI SDK's `experimental_telemetry`
 * option. Single source of truth for all runtime LLM calls (loop, memory
 * tasks). `functionSuffix` namespaces auxiliary calls (e.g. 'memory-observer')
 * under the parent functionId.
 */
export function buildExperimentalTelemetry(
	telemetry: BuiltTelemetry | undefined,
	options: { fallbackFunctionId?: string; functionSuffix?: string } = {},
): { experimental_telemetry?: TelemetrySettings } {
	if (!telemetry?.enabled) return {};

	const baseFunctionId = telemetry.functionId ?? options.fallbackFunctionId ?? 'agent';
	const functionId = options.functionSuffix
		? `${baseFunctionId}.${options.functionSuffix}`
		: baseFunctionId;

	return {
		experimental_telemetry: {
			isEnabled: true,
			functionId,
			metadata: telemetry.metadata,
			recordInputs: telemetry.recordInputs,
			recordOutputs: telemetry.recordOutputs,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
			tracer: telemetry.tracer as any,
			integrations: telemetry.integrations.length > 0 ? telemetry.integrations : undefined,
		},
	};
}
