import type { ObservationCursor } from '../../types/sdk/observation';
import type { ObservationLogBatch } from '../../types/sdk/observation-log';

export function prepareObservationLogBatchCursor(
	batch: ObservationLogBatch,
): ObservationCursor | null {
	const { observationScopeId, expectedCursor, nextCursor, entries } = batch;
	if (
		nextCursor.observationScopeId !== observationScopeId ||
		(expectedCursor !== null && expectedCursor.observationScopeId !== observationScopeId)
	) {
		throw new Error('Observation batch cursors must use the batch scope');
	}
	for (const [index, entry] of entries.entries()) {
		const { parentIndex } = entry;
		if (
			parentIndex !== null &&
			(!Number.isInteger(parentIndex) || parentIndex < 0 || parentIndex >= index)
		) {
			throw new Error('Observation batch parents must refer to earlier entries');
		}
	}
	if (expectedCursor) {
		const timeDifference =
			nextCursor.lastObservedAt.getTime() - expectedCursor.lastObservedAt.getTime();
		if (
			timeDifference < 0 ||
			(timeDifference === 0 &&
				nextCursor.lastObservedMessageId < expectedCursor.lastObservedMessageId)
		) {
			return null;
		}
	}
	let updatedAt = nextCursor.updatedAt.getTime();
	if (expectedCursor) updatedAt = Math.max(updatedAt, expectedCursor.updatedAt.getTime() + 1);
	return {
		...nextCursor,
		lastObservedAt: new Date(nextCursor.lastObservedAt),
		updatedAt: new Date(updatedAt),
	};
}

export function observationCursorsMatch(
	stored: ObservationCursor | null,
	expected: ObservationCursor | null,
): boolean {
	if (stored === null || expected === null) return stored === expected;
	return (
		stored.observationScopeId === expected.observationScopeId &&
		stored.lastObservedMessageId === expected.lastObservedMessageId &&
		stored.lastObservedAt.getTime() === expected.lastObservedAt.getTime() &&
		stored.updatedAt.getTime() === expected.updatedAt.getTime()
	);
}
