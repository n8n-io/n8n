import type {
	BuiltObservationStore,
	ObservationLockHandle,
	ScopeKind,
} from '../types/sdk/observation';

export type WithObservationLockResult<T> = { status: 'ran'; value: T } | { status: 'skipped' };

/**
 * Run `fn` while holding the per-scope observation lock. Returns
 * `{ status: 'skipped' }` when the lock is already held by a different
 * live holder; the caller should treat that as a no-op (another writer is
 * already on the case). The lock is released in a `finally` block; release
 * errors are swallowed because by that point the work is done — it doesn't
 * matter whether a TTL reaper or an external displace already cleared the
 * row.
 */
export async function withObservationLock<T>(
	store: BuiltObservationStore,
	scopeKind: ScopeKind,
	scopeId: string,
	opts: { ttlMs: number; holderId?: string },
	fn: (handle: ObservationLockHandle) => Promise<T>,
): Promise<WithObservationLockResult<T>> {
	const holderId = opts.holderId ?? crypto.randomUUID();
	const handle = await store.acquireObservationLock(scopeKind, scopeId, {
		ttlMs: opts.ttlMs,
		holderId,
	});
	if (!handle) return { status: 'skipped' };
	try {
		const value = await fn(handle);
		return { status: 'ran', value };
	} finally {
		try {
			await store.releaseObservationLock(handle);
		} catch {
			// Tolerate the lock having been displaced or already released.
		}
	}
}
