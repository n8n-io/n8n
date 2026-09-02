import type { TelemetryOptions } from 'ai';

import type { BuiltTelemetry } from '../../types/telemetry';

/**
 * Map a resolved BuiltTelemetry to the AI SDK's `telemetry`
 * option. Single source of truth for all runtime LLM calls (loop, memory
 * tasks). `functionSuffix` namespaces auxiliary calls (e.g. 'memory-observer')
 * under the parent functionId.
 */
export function buildAiSdkTelemetry(
	telemetry: BuiltTelemetry | undefined,
	options: { fallbackFunctionId?: string; functionSuffix?: string } = {},
): { telemetry?: TelemetryOptions } {
	if (!telemetry?.enabled) return {};

	const baseFunctionId = telemetry.functionId ?? options.fallbackFunctionId ?? 'agent';
	const functionId = options.functionSuffix
		? `${baseFunctionId}.${options.functionSuffix}`
		: baseFunctionId;
	const integrations =
		telemetry.resolveIntegrations?.(telemetry.metadata) ?? telemetry.integrations;

	return {
		telemetry: {
			isEnabled: true,
			functionId,
			recordInputs: telemetry.recordInputs,
			recordOutputs: telemetry.recordOutputs,
			integrations: integrations.length > 0 ? integrations : undefined,
		},
	};
}
