export function track(set: Set<Promise<void>>, promise: Promise<void>): void {
	const tracked = promise.finally(() => set.delete(tracked));
	set.add(tracked);
}

export async function settled(promise: Promise<unknown>): Promise<void> {
	await promise.then(
		() => {},
		() => {},
	);
}
