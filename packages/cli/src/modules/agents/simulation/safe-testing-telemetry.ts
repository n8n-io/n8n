import type { ToolCallEvidence, ToolCallReason, ToolCallRoute } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { TelemetryTracker } from '@n8n/backend-services';
import type { InferTelemetryProps, TelemetryEventDef } from '@n8n/telemetry';

import type { SimulationBackendId } from './tool-simulation.contracts';

type BlockedReason = Extract<
	ToolCallReason,
	'unsupported_by_simulator' | 'simulator_unavailable' | 'not_simulatable'
>;

/** Counts each value of a closed list. Every key is present, also with a count of 0. */
export function countBy<K extends string>(
	zero: Record<K, number>,
	values: Iterable<K>,
): Record<K, number> {
	const counts = { ...zero };
	for (const value of values) counts[value] += 1;
	return counts;
}

export const noBlockedReasons = (): Record<BlockedReason, number> => ({
	unsupported_by_simulator: 0,
	simulator_unavailable: 0,
	not_simulatable: 0,
});

export const noRoutes = (): Record<ToolCallRoute, number> => ({
	simulated: 0,
	simulated_made_up: 0,
	blocked: 0,
});

export const noReasons = (): Record<ToolCallReason, number> => ({
	served_from_world: 0,
	invented_by_llm: 0,
	...noBlockedReasons(),
});

export const noEvidence = (): Record<ToolCallEvidence, number> => ({
	real_read: 0,
	world_read: 0,
	world_write: 0,
});

/**
 * Tracks an event on a best-effort basis. Telemetry runs after real writes and inside
 * `finally` blocks, so an error from it must not change the result or hide another error.
 */
export function safeTrack<T extends TelemetryEventDef>(
	telemetry: TelemetryTracker,
	logger: Logger,
	event: T,
	properties: InferTelemetryProps<T>,
): void {
	try {
		telemetry.track(event, properties);
	} catch (error) {
		logger.warn('[SafeTesting] Could not track a telemetry event', {
			event: event.name,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

/** `none` when no simulated world opened. */
export const telemetryBackend = (backend: SimulationBackendId | undefined) => backend ?? 'none';
