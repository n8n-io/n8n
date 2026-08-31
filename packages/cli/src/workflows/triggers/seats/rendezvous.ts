/**
 * Rendezvous (highest-random-weight) assignment of trigger seats to runners.
 *
 * Deterministic and coordinator-free: every runner computes the same ranking
 * from the same inputs. Membership changes move only the seats whose top-N
 * actually changed — nothing shuffles between unaffected runners — which is
 * the property that keeps Kafka consumer-group churn minimal.
 */

/** FNV-1a over the joint key; stable, dependency-free, good enough spread for ranking. */
function score(runnerId: string, workflowId: string, nodeId: string): number {
	const key = `${runnerId}|${workflowId}|${nodeId}`;
	let hash = 0x811c9dc5;
	for (let i = 0; i < key.length; i++) {
		hash ^= key.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	// Unsigned so the sort comparator sees a total order without sign surprises.
	return hash >>> 0;
}

/**
 * The runners that should hold a trigger's seats: the top `n` by rendezvous
 * score. Ties broken by runner id so the ranking is total and identical on
 * every instance. When `n >= runners.length`, everyone is a desired holder.
 */
export function desiredHolders(
	workflowId: string,
	nodeId: string,
	runners: string[],
	n: number,
): string[] {
	return [...runners]
		.sort((a, b) => {
			const diff = score(b, workflowId, nodeId) - score(a, workflowId, nodeId);
			return diff !== 0 ? diff : a.localeCompare(b);
		})
		.slice(0, n);
}

/** The most seats one runner should hold before it counts as overloaded. */
export function fairShare(totalActiveSeats: number, runnerCount: number): number {
	if (runnerCount <= 0) return totalActiveSeats;
	return Math.ceil(totalActiveSeats / runnerCount);
}
