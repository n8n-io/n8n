import type { ToolCallEvidence, ToolCallReason, ToolCallRoute } from '@n8n/api-types';

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

/** `none` when no simulated world opened. */
export const telemetryBackend = (backend: SimulationBackendId | undefined) => backend ?? 'none';
