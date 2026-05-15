import type {
	BuiltObservationStore,
	ObservationLockHandle,
	ScopeKind,
} from '../types/sdk/observation';

export type WithObservationLockResult<T> = { status: 'ran'; value: T } | { status: 'skipped' };

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
		await store.releaseObservationLock(handle).catch(() => {});
	}
}
