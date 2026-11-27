export function track(set: Set<Promise<void>>, promise: Promise<void>): void {
	const tracked = promise.finally(() => set.delete(tracked));
	set.add(tracked);
}
