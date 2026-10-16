import type { ExecutionOptions } from '@n8n/agents';
import type { AiConfig } from '@n8n/config';

/**
 * Operator overrides for the agent runtime's model-stream stall deadlines
 * (see `AiConfig`), passed on every streaming run so deployments behind
 * buffering proxies or gateways can widen the stall watchdog — or disable it
 * with an idle timeout of 0. Unset or invalid values are omitted so the
 * runtime's own defaults apply; the runtime also caps values at its setTimeout
 * maximum.
 *
 * `0` disables the watchdog for the idle timeout only. For the first-output
 * timeout it is ignored (the runtime clamps that deadline up to the idle
 * timeout, so 0 could only silently shorten it — never disable it).
 */
export function modelStreamStallOptions(
	aiConfig: AiConfig,
): Pick<ExecutionOptions, 'modelStreamIdleTimeoutMs' | 'modelStreamFirstOutputTimeoutMs'> {
	const idleMs = normalizeTimeout(aiConfig.modelStreamIdleTimeoutMs, { zeroDisables: true });
	const firstOutputMs = normalizeTimeout(aiConfig.modelStreamFirstOutputTimeoutMs, {
		zeroDisables: false,
	});
	return {
		...(idleMs !== undefined && { modelStreamIdleTimeoutMs: idleMs }),
		...(firstOutputMs !== undefined && { modelStreamFirstOutputTimeoutMs: firstOutputMs }),
	};
}

function normalizeTimeout(
	value: number | undefined,
	{ zeroDisables }: { zeroDisables: boolean },
): number | undefined {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined;
	if (value === 0 && !zeroDisables) return undefined;
	return value;
}
