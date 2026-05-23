type LifecycleMethod = 'init' | 'start' | 'stop' | 'destroy';

interface LifecycleTarget {
	_init?(): Promise<void>;
	_start?(): Promise<void>;
	_stop?(): Promise<void>;
	_destroy?(): Promise<void>;
	init?(): Promise<void>;
	start?(): Promise<void>;
	stop?(): Promise<void>;
	destroy?(): Promise<void>;
}

export async function callLifecycle(
	provider: LifecycleTarget,
	method: LifecycleMethod,
): Promise<void> {
	const internalKey = `_${method}` as keyof LifecycleTarget;
	const plainKey = method as keyof LifecycleTarget;
	const fn = (provider[internalKey] ?? provider[plainKey]) as (() => Promise<void>) | undefined;
	if (fn) await fn.call(provider);
}

export type { LifecycleMethod };
