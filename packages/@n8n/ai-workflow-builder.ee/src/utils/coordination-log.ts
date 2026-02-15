/**
 * Coordination log utilities for deterministic routing between subgraphs.
 *
 * These utilities parse the coordination log to determine:
 * 1. Which subgraphs have completed
 * 2. What the next routing decision should be
 * 3. What output data is available from each phase
 */

import type {
	CoordinationLogEntry,
	SubgraphPhase,
	DiscoveryMetadata,
	BuilderMetadata,
	StateManagementMetadata,
	ResponderMetadata,
} from '../types/coordination';

export type RoutingDecision = 'discovery' | 'builder' | 'responder';

/**
 * Get the last completed phase from the coordination log
 */
export function getLastCompletedPhase(log: CoordinationLogEntry[]): SubgraphPhase | null {
	if (log.length === 0) return null;

	// Find the most recent completed entry
	for (let i = log.length - 1; i >= 0; i--) {
		if (log[i].status === 'completed') {
			return log[i].phase;
		}
	}
	return null;
}

/**
 * Get entry for a specific phase
 */
export function getPhaseEntry(
	log: CoordinationLogEntry[],
	phase: SubgraphPhase,
): CoordinationLogEntry | null {
	return log.find((entry) => entry.phase === phase && entry.status === 'completed') ?? null;
}

/**
 * Check if a phase has completed
 */
export function hasPhaseCompleted(log: CoordinationLogEntry[], phase: SubgraphPhase): boolean {
	return log.some((entry) => entry.phase === phase && entry.status === 'completed');
}

/**
 * Get builder output (workflow summary) from the log
 */
export function getBuilderOutput(log: CoordinationLogEntry[]): string | null {
	const entry = getPhaseEntry(log, 'builder');
	return entry?.output ?? null;
}

/**
 * Get typed metadata for a specific phase
 */
export function getPhaseMetadata(
	log: CoordinationLogEntry[],
	phase: 'discovery',
): DiscoveryMetadata | null;
export function getPhaseMetadata(
	log: CoordinationLogEntry[],
	phase: 'builder',
): BuilderMetadata | null;
export function getPhaseMetadata(
	log: CoordinationLogEntry[],
	phase: 'state_management',
): StateManagementMetadata | null;
export function getPhaseMetadata(
	log: CoordinationLogEntry[],
	phase: SubgraphPhase,
): DiscoveryMetadata | BuilderMetadata | StateManagementMetadata | ResponderMetadata | null {
	const entry = getPhaseEntry(log, phase);
	if (!entry) return null;

	// Error entries have phase: 'error' in metadata, completed entries have the subgraph phase
	if (entry.metadata.phase === 'error') return null;

	return entry.metadata;
}

/**
 * Check if any phase has an error status
 */
export function hasErrorInLog(log: CoordinationLogEntry[]): boolean {
	return log.some((entry) => entry.status === 'error');
}

/**
 * Get error entry from coordination log (if any)
 */
export function getErrorEntry(log: CoordinationLogEntry[]): CoordinationLogEntry | null {
	return log.find((entry) => entry.status === 'error') ?? null;
}

/**
 * Check if recursion errors have been cleared (AI-1812)
 * Returns true if there's a state_management entry that cleared recursion errors
 */
export function hasRecursionErrorsCleared(log: CoordinationLogEntry[]): boolean {
	return log.some(
		(entry) =>
			entry.phase === 'state_management' &&
			entry.summary.includes('Cleared') &&
			entry.summary.includes('recursion'),
	);
}

/**
 * Deterministic routing based on coordination log.
 * Called AFTER a subgraph completes to determine next phase.
 */
export function getNextPhaseFromLog(log: CoordinationLogEntry[]): RoutingDecision {
	// If any phase errored, route to responder to report the error
	// UNLESS recursion errors have been acknowledged/cleared (AI-1812)
	const hasErrors = hasErrorInLog(log);

	if (hasErrors) {
		// Check if recursion errors were cleared
		if (!hasRecursionErrorsCleared(log)) {
			// No clear marker - route to responder
			return 'responder';
		}

		// Find the last clear marker to check for errors after it
		const lastClearIndex = log.findLastIndex(
			(entry) =>
				entry.phase === 'state_management' &&
				entry.summary.includes('Cleared') &&
				entry.summary.includes('recursion'),
		);

		// Check if any errors exist after the clear marker
		const hasErrorsAfterClear = log
			.slice(lastClearIndex + 1)
			.some((entry) => entry.status === 'error');

		if (hasErrorsAfterClear) {
			return 'responder';
		}
	}

	const lastPhase = getLastCompletedPhase(log);
	// After discovery → builder (handles adding, connecting, and configuring nodes)
	if (lastPhase === 'discovery') {
		return 'builder';
	}

	// After builder → responder (terminal)
	if (lastPhase === 'builder') {
		return 'responder';
	}

	// No phases completed yet → let supervisor decide
	return 'responder';
}

/**
 * Build a summary of completed phases for debugging/logging
 */
export function summarizeCoordinationLog(log: CoordinationLogEntry[]): string {
	if (log.length === 0) return 'No phases completed';

	return log
		.filter((e) => e.status === 'completed')
		.map((e) => `${e.phase}: ${e.summary}`)
		.join(' → ');
}
